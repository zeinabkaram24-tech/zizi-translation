import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

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
  const apiKey = customKey || process.env.GEMINI_API_KEY;
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

// Resilient helper to call Gemini with retry and fallback model
async function generateWithRetry(params: {
  contents: any;
  config?: any;
  preferredModel?: string;
  maxAttempts?: number;
  customKey?: string;
}) {
  const ai = getGenAI(params.customKey);
  const models = [
    params.preferredModel || 'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
  ];

  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code;
      console.warn(`Model ${model} failed (${status}):`, err?.message || err);
      // Wait 800ms before attempting fallback
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  throw lastError;
}

// 1. Analyze Document / Image / PDF / Text Endpoint
app.post('/api/analyze-document', async (req, res) => {
  try {
    const { fileData, mimeType, text, titleHint } = req.body;
    const customKey = req.headers['x-gemini-api-key'] as string || undefined;

    if (!fileData && !text) {
      return res.status(400).json({ error: 'يرجى تقديم ملف أو نص للترجمة والتحليل.' });
    }

    const systemInstruction = `أنت خبير لغوي ومعلم ومترجم محترف متخصص في تعليم اللغة الإنجليزية للمتحدثين بالعربية.
مهمتك استخراج النص بدقة متناهية من المستند المرفق (سواء صورة ورقة، ماسح ضوئي، مستند PDF، أو نص مباشر)، وتقسيمه جملة بجملة (Sentence-by-Sentence).

لكل جملة في المستند، يجب تقديم:
1. الجملة الإنجليزية الأصلية بدقة (english).
2. الترجمة السياقية / المعنى المراد والمقصود (contextualTranslation): ترجمة عربية فصيحة، واضحة وسلسة تعبر عن المعنى الدقيق في السياق دون ركاكة.
3. الترجمة الحرفية الهيكلية (literalTranslation): ترجمة كلمة بكلمة توضح التركيب الإنجليزي وكيف تم صياغة الجملة لتساعد المتعلم على فهم بنية القواعد.
4. ملاحظة لغوية مبسطة (linguisticNote): شرح لمصطلح اصطلاحي (idiom)، حرف جر خاص، صيغة زمنية، أو تركيبة مهمة إن وجدت.
5. المفردات البارزة (vocabulary): أهم الكلمات أو المصطلحات في الجملة مع معناها في السياق، ونوع الكلمة (اسم، فعل، صفة، إلخ) والنطق التقريبي باللغة العربية أو الصوتيات.

قسّم النص بحسب الصفحات أو المقاطع المنطقية (pages). تأكد من شمول كامل النص الموجود في المستند دون تفويت أي فقرة أو عنوان.

بالإضافة إلى ذلك، يجب عليك استخراج النص الإنجليزي الكامل للمستند كما ورد بالترتيب والتنسيق الأصلي تماماً (fullTextWithFormatting)، محتفظاً بالفقرات (Paragraphs)، وفواصل الأسطر الجديدة (Line breaks)، والتعداد النقطي إن وجد، لكي يتمكن الطالب من قراءته كنص متكامل بنفس الشكل والتنسيق الأصلي للورقة التي رفعها.`;

    const contents: any[] = [];

    let promptText = `قم بتحليل هذا المستند وتقسيمه جملة بجملة واستخراج الترجمة السياقية والحرفية والمفردات بالتفصيل.`;
    if (titleHint) {
      promptText += ` عنوان المستند المحتمل: ${titleHint}.`;
    }

    if (fileData && mimeType) {
      contents.push({
        parts: [
          {
            inlineData: {
              data: fileData,
              mimeType: mimeType,
            },
          },
          {
            text: promptText,
          },
        ],
      });
    } else {
      contents.push({
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
    const parsedData = JSON.parse(rawText);

    res.json(parsedData);
  } catch (err: any) {
    console.error('Error analyzing document:', err);
    res.status(500).json({
      error: 'حدث خطأ أثناء معالجة المستند بواسطة الذكاء الاصطناعي.',
      details: err?.message || String(err),
    });
  }
});

// 2. Define Single Word in Sentence Context
app.post('/api/define-word', async (req, res) => {
  try {
    const { word, sentence } = req.body;
    const customKey = req.headers['x-gemini-api-key'] as string || undefined;

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

    const parsed = JSON.parse(response.text || '{}');
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
    const { text, voiceName = 'Kore' } = req.body;
    const customKey = req.headers['x-gemini-api-key'] as string || undefined;

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
