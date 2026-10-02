import React, { useEffect, useState } from 'react';
import {
  X,
  Volume2,
  BookmarkPlus,
  BookmarkCheck,
  Sparkles,
  BookOpen,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { WordDefinitionResponse, SavedWord } from '../types';
import { defineWord } from '../services/api';
import { speakText } from '../services/speech';

interface WordPopupProps {
  word: string;
  sentence: string;
  pageNumber: number;
  onClose: () => void;
  onSaveWord: (saved: Omit<SavedWord, 'id' | 'savedAt'>) => void;
  onRemoveWord: (word: string) => void;
  isSaved: boolean;
  speechRate: number;
}

export const WordPopup: React.FC<WordPopupProps> = ({
  word,
  sentence,
  pageNumber,
  onClose,
  onSaveWord,
  onRemoveWord,
  isSaved,
  speechRate,
}) => {
  const [loading, setLoading] = useState(true);
  const [definition, setDefinition] = useState<WordDefinitionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlayingWord, setIsPlayingWord] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    defineWord(word, sentence)
      .then((data) => {
        if (isMounted) {
          setDefinition(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'تعذر جلب تفاصيل الكلمة.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [word, sentence]);

  const handlePlayWord = () => {
    setIsPlayingWord(true);
    speakText(word, {
      rate: speechRate,
      onEnd: () => setIsPlayingWord(false),
      onError: () => setIsPlayingWord(false),
    });
  };

  const handleToggleSave = () => {
    if (isSaved) {
      onRemoveWord(word);
    } else if (definition) {
      onSaveWord({
        word: definition.word,
        arabicMeaning: definition.arabicMeaning,
        partOfSpeech: definition.partOfSpeech,
        phonetic: definition.phonetic,
        sentenceContext: sentence,
        pageNumber,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            <span className="text-xs font-bold text-slate-700">قاموس المفردات التفاعلي</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6">
          {loading ? (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">جاري استخراج المعنى الدقيق في السياق...</p>
            </div>
          ) : error ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-sm text-rose-600 font-medium">{error}</p>
              <button
                onClick={handlePlayWord}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>نطق الكلمة: {word}</span>
              </button>
            </div>
          ) : definition ? (
            <div className="space-y-4">
              {/* Word & Speaker */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-extrabold text-slate-900 font-english tracking-tight">
                    {definition.word}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {definition.partOfSpeech && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {definition.partOfSpeech}
                      </span>
                    )}
                    {definition.phonetic && (
                      <span className="text-xs text-slate-400 font-mono">
                        /{definition.phonetic}/
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={handlePlayWord}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isPlayingWord
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                  }`}
                  title="استمع لنطق الكلمة"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              {/* Arabic Meaning in Context */}
              <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
                <span className="text-[11px] font-bold text-indigo-700 block mb-1">
                  المعنى في سياق هذه الجملة:
                </span>
                <p className="text-lg font-bold text-slate-900 font-arabic">
                  {definition.arabicMeaning}
                </p>
                {definition.explanation && (
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-arabic">
                    {definition.explanation}
                  </p>
                )}
              </div>

              {/* Sentence Context Snippet */}
              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-700 block mb-1">سياق الجملة:</span>
                <p className="font-english italic leading-relaxed text-slate-600">
                  "{sentence}"
                </p>
              </div>

              {/* Example if present */}
              {definition.exampleEnglish && (
                <div className="text-xs text-slate-600 space-y-1 pt-1">
                  <div className="flex items-center gap-1 font-bold text-slate-700">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    <span>مثال إضافي:</span>
                  </div>
                  <p className="font-english italic text-slate-700">
                    "{definition.exampleEnglish}"
                  </p>
                  {definition.exampleArabic && (
                    <p className="font-arabic text-slate-500">
                      {definition.exampleArabic}
                    </p>
                  )}
                </div>
              )}

              {/* Save / Remove Action Button */}
              <button
                onClick={handleToggleSave}
                className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                  isSaved
                    ? 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-indigo-200'
                }`}
              >
                {isSaved ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 text-amber-600" />
                    <span>محفوظة في قائمتك (انقر لإزالتها)</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="w-4 h-4" />
                    <span>حفظ في قائمة مفرداتي الجديدة</span>
                  </>
                )}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
