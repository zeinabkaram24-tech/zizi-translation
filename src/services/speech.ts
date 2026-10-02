import { fetchGeminiTTS } from './api';

let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeAudioElement: HTMLAudioElement | null = null;

export interface SpeechOptions {
  rate?: number; // 0.75, 1.0, 1.25
  pitch?: number;
  useAiVoice?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement = null;
  }
  activeUtterance = null;
}

export async function speakText(text: string, options: SpeechOptions = {}) {
  stopSpeaking();

  // Default to calm, clear, beginner-friendly pace (0.75x)
  const rate = options.rate ?? 0.75;

  // Option 1: AI Generated Voice via Gemini TTS
  if (options.useAiVoice) {
    try {
      options.onStart?.();
      const audioUrl = await fetchGeminiTTS(text);
      const audio = new Audio(audioUrl);
      activeAudioElement = audio;
      audio.playbackRate = rate;

      audio.onended = () => {
        activeAudioElement = null;
        options.onEnd?.();
      };
      audio.onerror = (e) => {
        activeAudioElement = null;
        options.onError?.(e);
      };

      await audio.play();
      return;
    } catch (err) {
      console.warn('AI TTS failed, falling back to Web Speech API:', err);
    }
  }

  // Option 2: Web Speech API (zero latency, native)
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options.onError?.(new Error('ميزة النطق الصوتي غير مدعومة في هذا المتصفح.'));
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  utterance.pitch = options.pitch ?? 0.95; // Slightly deeper, clearer pitch

  // Pick preferred high-quality English voice if available
  const voices = window.speechSynthesis.getVoices();
  const enVoice = voices.find(
    (v) =>
      v.lang.startsWith('en') &&
      (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Ava') || v.name.includes('Jenny') || v.name.includes('Guy'))
  ) || voices.find((v) => v.lang.startsWith('en'));

  if (enVoice) {
    utterance.voice = enVoice;
  }

  utterance.onstart = () => {
    options.onStart?.();
  };

  utterance.onend = () => {
    activeUtterance = null;
    options.onEnd?.();
  };

  utterance.onerror = (event) => {
    activeUtterance = null;
    options.onError?.(event);
  };

  activeUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}
