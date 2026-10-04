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
  const hasCustomKey = !!localStorage.getItem('lingodoc_custom_api_key');

  // CRITICAL FIX: If user has a custom API Key saved, bypass the backend completely and call Gemini directly
  // from the browser! This avoids corporate proxies, header stripping, and Google AI Studio login/iframe redirects (302)!
  if (hasCustomKey) {
    console.info('Custom API Key found. Calling Gemini directly from the browser (bypassing backend redirects).');
    return await analyzeDocumentClientSide(params);
  }

  try {
    const response = await fetch('/api/analyze-document', {
      method: 'POST',
      headers: getRequestHeaders(),
      body: JSON.stringify({
        ...params,
        customApiKey: getCustomApiKeyBodyParam(),
      }),
    });

    if (response.ok) {
      return await response.json();
    }

    // Fallback to client-side direct calling if endpoint returns 404/302 or redirects
    console.warn('Backend server returned non-OK response, falling back to direct browser Gemini API.');
    return await analyzeDocumentClientSide(params);
  } catch (err: any) {
    console.warn('Backend server threw error, falling back to direct browser Gemini API:', err);
    return await analyzeDocumentClientSide(params);
  }
}

async function callGeminiWithModel(
  ai: any,
  modelName: string,
  contents: any[],
  systemInstruction: string
): Promise<DocumentAnalysis> {
  const response = await ai.models.generateContent({
    model: modelName,
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

  try {
    // Primary Client-Side Model (Gemini 2.5 Flash is ultra fast and has amazing OCR capabilities)
    return await callGeminiWithModel(ai, 'gemini-2.5-flash', contents, systemInstruction);
  } catch (err: any) {
    console.warn('Direct client call with gemini-2.5-flash failed, falling back to gemini-1.5-flash:', err);
    try {
      return await callGeminiWithModel(ai, 'gemini-1.5-flash', contents, systemInstruction);
    } catch (err2: any) {
      console.error('All client-side models failed:', err2);
      throw new Error(`تعذر على الذكاء الاصطناعي معالجة الصورة. تأكد من صحة مفتاح الـ API ووضوح الصفحة. الخطأ: ${err2.message || err2}`);
    }
  }
}

export async function defineWord(word: string, sentence: string): Promise<WordDefinitionResponse> {
  const hasCustomKey = !!localStorage.getItem('lingodoc_custom_api_key');
  if (hasCustomKey) {
    return await defineWordClientSide(word, sentence);
  }

  try {
    const response = await fetch('/api/define-word', {
      method: 'POST',
      headers: getRequestHeaders(),
      body: JSON.stringify({
        word,
        sentence,
        customApiKey: getCustomApiKeyBodyParam(),
      }),
    });

    if (response.ok) {
      return await response.json();
    }

    return await defineWordClientSide(word, sentence);
  } catch (err) {
    return await defineWordClientSide(word, sentence);
  }
}

async function callDefineWordModel(ai: any, modelName: string, prompt: string, systemInstruction: string): Promise<WordDefinitionResponse> {
  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      systemInstruction,
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

async function defineWordClientSide(word: string, sentence: string): Promise<WordDefinitionResponse> {
  const ai = getClientGenAI();
  if (!ai) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }

  const prompt = `ما معنى الكلمة الإنجليزية "${word}" في سياق هذه الجملة: "${sentence || ''}"؟`;
  const systemInstruction = `أنت قاموس إنجليزي-عربي فوري ودقيق للمتعلمين. أعط المعنى المحدد للكلمة في سياق الجملة، مع نوع الكلمة والمصدر ومثال توضيحي. أجب بصيغة JSON حصراً.`;

  try {
    return await callDefineWordModel(ai, 'gemini-2.5-flash', prompt, systemInstruction);
  } catch {
    return await callDefineWordModel(ai, 'gemini-1.5-flash', prompt, systemInstruction);
  }
}

export async function fetchGeminiTTS(text: string, voiceName: string = 'Kore'): Promise<string> {
  const hasCustomKey = !!localStorage.getItem('lingodoc_custom_api_key');
  if (hasCustomKey) {
    return await fetchGeminiTTSClientSide(text, voiceName);
  }

  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: getRequestHeaders(),
      body: JSON.stringify({
        text,
        voiceName,
        customApiKey: getCustomApiKeyBodyParam(),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return `data:${data.mimeType};base64,${data.audioBase64}`;
    }

    return await fetchGeminiTTSClientSide(text, voiceName);
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
