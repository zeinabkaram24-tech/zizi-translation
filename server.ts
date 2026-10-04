import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = parseInt(process.env.PORT || '3000', 10);

const app = express();

// Support large payload for PDF and image scans
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to get GoogleGenAI client
function getGenAI(customKey?: string) {
  const cleanCustom = customKey ? customKey.trim() : '';
  const apiKey = (cleanCustom.length > 15) ? cleanCustom : process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING: يرجى إدخال مفتاح Gemini API الخاص بكِ في أيقونة الإعدادات ⚙️ بأعلى الشاشة لتفعيل الترجمة والتحليل.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Robust helper to strip markdown wrappers and extract raw JSON
function cleanJsonString(str: string): string {
  let cleaned = str.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/, '');
  }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

// Resilient helper to call Gemini with retry and fallback model
async function generateWithRetry(params: {
  contents: any;
  config?: any;
  preferredModel?: string;
  maxAttempts?: number;
  customKey?: string;
}) {
  let ai = getGenAI(params.customKey);
  const models = [
    'gemini-2.5-flash',
    params.preferredModel || 'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
  ];

  let lastError: any = null;

  for (const model of models) {
    try {
      const config = { ...params.config };
      if (model.includes('3.8')) {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      } else if (model.includes('3.1')) {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
      }

      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code;
      console.warn(`Model ${model} failed (${status}):`, err?.message || err);

      // If custom key failed due to auth/permission and system key is present, fallback immediately to system key
      if (params.customKey && process.env.GEMINI_API_KEY && (err?.message?.includes('API_KEY') || err?.message?.includes('auth') || status === 400 || status === 403)) {
        try {
          console.warn('Custom key error encountered, trying system GEMINI_API_KEY fallback...');
          const fallbackAi = getGenAI();
          const fallbackResponse = await fallbackAi.models.generateContent({
            model,
            contents: params.contents,
            config: params.config,
          });
          return fallbackResponse;
        } catch (fbErr) {
          console.warn('System key fallback also failed:', fbErr);
        }
      }

      // Wait 1200ms before attempting fallback model
      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  throw lastError;
}

// 1. Analyze Document / Image / PDF / Text Endpoint
app.post('/api/analyze-document', async (req, res) => {
  try {
    const { fileData, mimeType, text, titleHint, customApiKey } = req.body;
    const customKey = customApiKey || req.headers['x-gemini-api-key'] as string || undefined;

    if (!fileData && !text) {
      return res.status(400).json({ error: 'يرجى تقديم ملف أو نص للترجمة والتحليل.' });
    }

    const systemInstruction = `أنت خبير لغوي ومعلم ومترجم محترف ومساعد دراسي مخصص لمساعدة الطلاب على فهم وتحليل المواد الأكاديمية والكتب باللغة الإنجليزية وتوفير شرح تعليمي مبسط لها (Educational Fair Use Analysis).
مهمتك هي مساعدة الطالب في فهم الصفحة أو المستند المرفق من خلال تقسيم محتواه التعليمي إلى جمل واضحة (Sentence-by-Sentence Analysis) لمساعدته على القراءة والفهم.

لكل جملة أو عبارة رئيسية مستخرجة للدراسة:
1. الجملة الإنجليزية (english).
2. الترجمة السياقية الأكاديمية الدقيقة والمبسطة لتوضيح المعنى المقصود بأسلوب عربي فصيح (contextualTranslation).
3. الترجمة الهيكلية/الحرفية لتوضيح كيفية ترتيب وبناء الكلمات للمتعلم (literalTranslation).
4. فائدة لغوية تعليمية تشرح قاعدة أو مصطلح هام (linguisticNote).
5. المفردات البارزة (vocabulary): قائمة بأهم الكلمات والمفردات مع معانيها السياقية، نوع الكلمة، وطريقة نطقها التقريبية.

ملاحظة هامة جداً: هدف هذا التحليل هو تعليمي ومذاكرة فردية خاصة فقط للطالب (Educational Purposes Only)، يرجى تحليل محتوى المستند أو الصفحة وتزويد الطالب بهيكل دراسي كامل ومترجم ومنظم للمذاكرة والتعلم الشخصي.`;

    const contents: any[] = [];

    let promptText = `هذا المستند أو الكتاب مرفوع بواسطة طالب لأغراض الدراسة والتعلم الشخصي والتعليم الفردي فقط (Fair Use). 
يرجى قراءة الصفحة وتحليل محتواها التعليمي واستخراج جميع الجمل والعبارات الإنجليزية الهامة لترجمتها وشرحها مع المفردات والفوائد اللغوية بشكل دقيق وكامل لمساعدة الطالب على مذاكرتها وفهم محتواها تماماً وبسرعة.`;
    if (titleHint) {
      promptText += ` عنوان المستند المحتمل: ${titleHint}.`;
    }

    if (fileData) {
      let cleanData = fileData;
      if (typeof cleanData === 'string' && cleanData.includes(',')) {
        cleanData = cleanData.split(',')[1];
      }

      let cleanType = mimeType || 'image/jpeg';
      if (cleanType === 'image/jpg') cleanType = 'image/jpeg';

      contents.push({
        role: 'user',
        parts: [
          {
            inlineData: {
              data: cleanData,
              mimeType: cleanType,
            },
          },
          {
            text: promptText,
          },
        ],
      });
    } else {
      contents.push({
        role: 'user',
        parts: [
          {
            text: `${promptText}\n\nالنص المراد تحليله وترجمته:\n${text}`,
          },
        ],
      });
    }

    const response = await generateWithRetry({
      preferredModel: 'gemini-3.8-flash',
      contents,
      customKey,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            documentTitle: {
              type: Type.STRING,
              description: 'عنوان المستند المستخرج بالإنجليزية والعربية',
            },
            overviewSummary: {
              type: Type.STRING,
              description: 'ملخص موجز للمستند باللغة العربية من سطرين',
            },
            totalSentences: {
              type: Type.INTEGER,
              description: 'إجمالي عدد الجمل المستخرجة',
            },
            fullTextWithFormatting: {
              type: Type.STRING,
              description: 'النص الإنجليزي الكامل للمستند بالتنسيق الأصلي مع الفقرات والأسطر الجديدة وعلامات الترقيم بالكامل كما ورد بالورقة.',
            },
            pages: {
              type: Type.ARRAY,
              description: 'قائمة الصفحات أو الأقسام المنطقية في المستند',
              items: {
                type: Type.OBJECT,
                properties: {
                  pageNumber: {
                    type: Type.INTEGER,
                    description: 'رقم الصفحة (يبدأ من 1)',
                  },
                  pageTitle: {
                    type: Type.STRING,
                    description: 'عنوان أو ملخص القسم في هذه الصفحة',
                  },
                  sentences: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        sentenceIndex: {
                          type: Type.INTEGER,
                          description: 'رقم الجملة التسلسلي',
                        },
                        english: {
                          type: Type.STRING,
                          description: 'الجملة الإنجليزية الأصلية كاملة ومضبوطة علامات الترقيم',
                        },
                        contextualTranslation: {
                          type: Type.STRING,
                          description: 'الترجمة السياقية / المعنى المقصود بأسلوب عربي طبيعي وسلس',
                        },
                        literalTranslation: {
                          type: Type.STRING,
                          description: 'الترجمة الحرفية التفكيكية لتوضيح ترتيب وبنية الكلمات',
                        },
                        linguisticNote: {
                          type: Type.STRING,
                          description: 'فائدة لغوية أو توضيح لقاعدة أو تعبير اصطلاحي خاص بهذه الجملة',
                        },
                        vocabulary: {
                          type: Type.ARRAY,
                          description: 'أهم الكلمات الجديدة أو المفردات في الجملة',
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              word: {
                                type: Type.STRING,
                                description: 'الكلمة الإنجليزية بصيغتها الأصلية أو كما وردت',
                              },
                              arabicMeaning: {
                                type: Type.STRING,
                                description: 'المعنى بالعربية في هذا السياق المحدد',
                              },
                              partOfSpeech: {
                                type: Type.STRING,
                                description: 'نوع الكلمة (اسم، فعل، صفة، ظرف، حرف جر، تعبير)',
                              },
                              phonetic: {
                                type: Type.STRING,
                                description: 'دليل النطق الصوتي أو النطق المبسط بالحروف العربية أو الإنجليزية',
                              },
                            },
                            required: ['word', 'arabicMeaning'],
                          },
                        },
                      },
                      required: ['sentenceIndex', 'english', 'contextualTranslation', 'literalTranslation'],
                    },
                  },
                },
                required: ['pageNumber', 'sentences'],
              },
            },
          },
          required: ['documentTitle', 'overviewSummary', 'pages'],
        },
      },
    });

    const rawText = response.text || '{}';
    const cleanedText = cleanJsonString(rawText);
    const parsedData = JSON.parse(cleanedText);

    res.json(parsedData);
  } catch (err: any) {
    console.error('Error analyzing document:', err);
    let userFriendlyMessage = 'حدث خطأ أثناء معالجة المستند بواسطة الذكاء الاصطناعي.';
    const rawMsg = err?.message || String(err);

    if (rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('429') || rawMsg.includes('quota')) {
      userFriendlyMessage = 'تم بلوغ الحد الأقصى المؤقت لعدد الطلبات في الدقيقة من جوجل (Rate Limit). يرجى الانتظار 30 إلى 60 ثانية فقط ثم إعادة المحاولة.';
    } else if (rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('API key not valid') || rawMsg.includes('403')) {
      userFriendlyMessage = 'مفتاح Gemini API غير صالح أو غير صحيح. يرجى التأكد من نسخه بدقة في الإعدادات ⚙️.';
    } else if (rawMsg.includes('GEMINI_API_KEY_MISSING')) {
      userFriendlyMessage = 'مفتاح Gemini API غير مهيأ. يرجى إدخاله في الإعدادات ⚙️ بأعلى الشاشة.';
    } else if (rawMsg.includes('SyntaxError') || rawMsg.includes('JSON')) {
      userFriendlyMessage = 'لم يتمكن النموذج من تنسيق الإجابة بشكل صحيح. يرجى إعادة المحاولة مع توضيح صورة المستند.';
    } else {
      userFriendlyMessage = `تعذر التحليل: ${rawMsg}`;
    }

    res.status(500).json({
      error: userFriendlyMessage,
      details: rawMsg,
    });
  }
});

// 2. Define Single Word in Sentence Context
app.post('/api/define-word', async (req, res) => {
  try {
    const { word, sentence, customApiKey } = req.body;
    const customKey = customApiKey || req.headers['x-gemini-api-key'] as string || undefined;

    if (!word) {
      return res.status(400).json({ error: 'الكلمة مطلوبة.' });
    }

    const response = await generateWithRetry({
      preferredModel: 'gemini-3.8-flash',
      contents: `ما معنى الكلمة الإنجليزية "${word}" في سياق هذه الجملة: "${sentence || ''}"؟`,
      customKey,
      config: {
        systemInstruction: `أنت قاموس إنجليزي-عربي فوري ودقيق للمتعلمين. أعط المعنى المحدد للكلمة في سياق الجملة، مع نوع الكلمة والمصدر ومثال توضيحي. أجب بصيغة JSON حصراً.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            lemma: { type: Type.STRING, description: 'أصل الكلمة أو صيغة المصدر (Infinitive/Base form)' },
            arabicMeaning: { type: Type.STRING, description: 'المعنى العربي الدقيق في هذا السياق' },
            partOfSpeech: { type: Type.STRING, description: 'نوع الكلمة (اسم، فعل، صفة، إلخ)' },
            phonetic: { type: Type.STRING, description: 'طريقة النطق الصوتي التقريبي' },
            explanation: { type: Type.STRING, description: 'شرح موجز بالعربية لكيفية استخدامها' },
            exampleEnglish: { type: Type.STRING, description: 'جملة توضيحية أخرى بالإنجليزية' },
            exampleArabic: { type: Type.STRING, description: 'ترجمة الجملة التوضيحية' },
          },
          required: ['word', 'arabicMeaning', 'partOfSpeech'],
        },
      },
    });

    const parsed = JSON.parse(cleanJsonString(response.text || '{}'));
    res.json(parsed);
  } catch (err: any) {
    console.error('Error defining word:', err);
    // Return a clean fallback dictionary item rather than failing the UI completely
    res.json({
      word: req.body.word,
      arabicMeaning: 'المعنى في سياق الجملة',
      partOfSpeech: 'كلمة',
      explanation: 'يمكنك حفظ هذه الكلمة والرجوع إليها ومراجعتها.',
    });
  }
});

// 3. High-Quality Gemini TTS endpoint (Single speaker WAV)
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voiceName = 'Kore', customApiKey } = req.body;
    const customKey = customApiKey || req.headers['x-gemini-api-key'] as string || undefined;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'النص المطلوب نطقه غير موجود.' });
    }

    const ai = getGenAI(customKey);

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text,
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error('لم يتم إنشاء بيانات الصوت بنجاح.');
    }

    res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (err: any) {
    console.error('Error generating TTS:', err);
    res.status(500).json({
      error: 'حدث خطأ أثناء توليد الصوت.',
      details: err?.message || String(err),
    });
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LingoDoc Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
