import { DocumentAnalysis, WordDefinitionResponse } from '../types';

export async function analyzeDocument(params: {
  fileData?: string;
  mimeType?: string;
  text?: string;
  titleHint?: string;
}): Promise<DocumentAnalysis> {
  const response = await fetch('/api/analyze-document', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || 'فشل تحليل المستند');
  }

  return response.json();
}

export async function defineWord(word: string, sentence: string): Promise<WordDefinitionResponse> {
  const response = await fetch('/api/define-word', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ word, sentence }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'تعذر جلب تفاصيل الكلمة');
  }

  return response.json();
}

export async function fetchGeminiTTS(text: string, voiceName: string = 'Kore'): Promise<string> {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, voiceName }),
  });

  if (!response.ok) {
    throw new Error('فشل توليد الصوت عبر الذكاء الاصطناعي');
  }

  const data = await response.json();
  return `data:${data.mimeType};base64,${data.audioBase64}`;
}
