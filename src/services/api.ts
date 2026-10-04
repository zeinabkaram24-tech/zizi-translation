import { GoogleGenAI, Type } from '@google/genai';
import { DocumentAnalysis, WordDefinitionResponse } from '../types';

function getRequestHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const storedKey = localStorage.getItem('lingodoc_custom_api_key');
  if (storedKey) {
    headers['x-gemini-api-key'] = storedKey.trim();
  }
  return headers;
}

// Helper to retrieve the custom API key safely from local storage
function getCustomApiKeyBodyParam(): string | undefined {
  const storedKey = localStorage.getItem('lingodoc_custom_api_key');
  return storedKey && storedKey.trim().length > 15 ? storedKey.trim() : undefined;
}

// Client-side direct fallback helper
function getClientGenAI(): GoogleGenAI | null {
  const storedKey = localStorage.getItem('lingodoc_custom_api_key');
  if (storedKey && storedKey.trim().length > 15) {
    return new GoogleGenAI({ apiKey: storedKey.trim() });
  }
  return null;
}

export async function analyzeDocument(params: {
  fileData?: string;
  mimeType?: string;
  text?: string;
  titleHint?: string;
}): Promise<DocumentAnalysis> {
  try {
    const response = await fetch('/api/analyze-document', {
      method: 'POST',
      headers: getRequestHeaders(),
      body: JSON.stringify({
        ...params,
        customApiKey: getCustomApiKeyBodyParam(), // Pass in body to prevent reverse proxy header stripping!
      }),
    });

    if (response.ok) {
      return await response.json();
    }

    // Fallback to client-side direct calling if endpoint doesn't exist (e.g. 404 in static deploy)
    if (response.status === 404) {
      console.warn('Backend server returned 404, falling back to direct browser Gemini API.');
      return await analyzeDocumentClientSide(params);
    }

    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || 'فشل تحليل المستند');
  } catch (err: any) {
    const errMsg = err.message || '';
    if (errMsg.includes('404') || errMsg.includes('Failed to fetch') || errMsg.includes('fetch')) {
      console.warn('Network issue or backend 404. Falling back to direct browser Gemini API:', err);
      return await analyzeDocumentClientSide(params);
    }
    throw err;
  }
}

async function analyzeDocumentClientSide(params: {
  fileData?: string;
  mimeType?: string;
  text?: string;
  titleHint?: string;
}): Promise<DocumentAnalysis> {
  const ai = getClientGenAI();
  if (!ai) {
    throw new Error('GEMINI_API_KEY_MISSING');
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

  if (params.titleHint) {
    promptText += ` عنوان المستند المحتمل: ${params.titleHint}.`;
  }

  if (params.fileData) {
    let cleanData = params.fileData;
    if (typeof cleanData === 'string' && cleanData.includes(',')) {
      cleanData = cleanData.split(',')[1];
    }
    let cleanType = params.mimeType || 'image/jpeg';
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
          text: `${promptText}\n\nالنص المراد تحليله وترجمته:\n${params.text}`,
        },
      ],
    });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          documentTitle: { type: Type.STRING },
          overviewSummary: { type: Type.STRING },
          totalSentences: { type: Type.INTEGER },
          fullTextWithFormatting: { type: Type.STRING },
          pages: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                pageNumber: { type: Type.INTEGER },
                pageTitle: { type: Type.STRING },
                sentences: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      sentenceIndex: { type: Type.INTEGER },
                      english: { type: Type.STRING },
                      contextualTranslation: { type: Type.STRING },
                      literalTranslation: { type: Type.STRING },
                      linguisticNote: { type: Type.STRING },
                      vocabulary: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            word: { type: Type.STRING },
                            arabicMeaning: { type: Type.STRING },
                            partOfSpeech: { type: Type.STRING },
                            phonetic: { type: Type.STRING },
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
  const firstBrace = rawText.indexOf('{');
  const lastBrace = rawText.lastIndexOf('}');
  let cleaned = rawText;
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = rawText.substring(firstBrace, lastBrace + 1);
  }
  
  return JSON.parse(cleaned);
}

export async function defineWord(word: string, sentence: string): Promise<WordDefinitionResponse> {
  try {
    const response = await fetch('/api/define-word', {
      method: 'POST',
      headers: getRequestHeaders(),
      body: JSON.stringify({
        word,
        sentence,
        customApiKey: getCustomApiKeyBodyParam(), // Pass key in JSON body to prevent header stripping
      }),
    });

    if (response.ok) {
      return await response.json();
    }

    if (response.status === 404) {
      return await defineWordClientSide(word, sentence);
    }

    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'تعذر جلب تفاصيل الكلمة');
  } catch (err) {
    return await defineWordClientSide(word, sentence);
  }
}

async function defineWordClientSide(word: string, sentence: string): Promise<WordDefinitionResponse> {
  const ai = getClientGenAI();
  if (!ai) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `ما معنى الكلمة الإنجليزية "${word}" في سياق هذه الجملة: "${sentence || ''}"؟`,
    config: {
      systemInstruction: `أنت قاموس إنجليزي-عربي فوري ودقيق للمتعلمين. أعط المعنى المحدد للكلمة في سياق الجملة، مع نوع الكلمة والمصدر ومثال توضيحي. أجب بصيغة JSON حصراً.`,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          lemma: { type: Type.STRING },
          arabicMeaning: { type: Type.STRING },
          partOfSpeech: { type: Type.STRING },
          phonetic: { type: Type.STRING },
          explanation: { type: Type.STRING },
          exampleEnglish: { type: Type.STRING },
          exampleArabic: { type: Type.STRING },
        },
        required: ['word', 'arabicMeaning', 'partOfSpeech'],
      },
    },
  });

  const rawText = response.text || '{}';
  const firstBrace = rawText.indexOf('{');
  const lastBrace = rawText.lastIndexOf('}');
  let cleaned = rawText;
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = rawText.substring(firstBrace, lastBrace + 1);
  }

  return JSON.parse(cleaned);
}

export async function fetchGeminiTTS(text: string, voiceName: string = 'Kore'): Promise<string> {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: getRequestHeaders(),
      body: JSON.stringify({
        text,
        voiceName,
        customApiKey: getCustomApiKeyBodyParam(), // Pass key in JSON body to prevent header stripping
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return `data:${data.mimeType};base64,${data.audioBase64}`;
    }

    if (response.status === 404) {
      return await fetchGeminiTTSClientSide(text, voiceName);
    }

    throw new Error('فشل توليد الصوت عبر الذكاء الاصطناعي');
  } catch (err) {
    return await fetchGeminiTTSClientSide(text, voiceName);
  }
}

async function fetchGeminiTTSClientSide(text: string, voiceName: string = 'Kore'): Promise<string> {
  const ai = getClientGenAI();
  if (!ai) {
    return '';
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [{ role: 'user', parts: [{ text }] }],
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
      throw new Error('No audio');
    }
    return `data:audio/wav;base64,${base64Audio}`;
  } catch {
    return '';
  }
}
