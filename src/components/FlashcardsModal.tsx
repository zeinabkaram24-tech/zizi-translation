import React, { useState } from 'react';
import {
  X,
  Volume2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { SavedWord } from '../types';
import { speakText } from '../services/speech';

interface FlashcardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  words: SavedWord[];
  speechRate: number;
}

export const FlashcardsModal: React.FC<FlashcardsModalProps> = ({
  isOpen,
  onClose,
  words,
  speechRate,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());

  if (!isOpen || words.length === 0) return null;

  const currentWord = words[currentIndex];
  const isMastered = masteredIds.has(currentWord.id);

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % words.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + words.length) % words.length);
  };

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    speakText(currentWord.word, { rate: speechRate });
  };

  const toggleMastered = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMasteredIds((prev) => {
      const next = new Set(prev);
      if (next.has(currentWord.id)) {
        next.delete(currentWord.id);
      } else {
        next.add(currentWord.id);
      }
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">
              بطاقات المراجعة والاستذكار (Flashcards)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 h-1.5">
          <div
            className="bg-indigo-600 h-1.5 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
          />
        </div>

        {/* Content / Flip Card */}
        <div className="p-6 sm:p-8 flex flex-col items-center">
          <div className="text-xs font-semibold text-slate-400 mb-4">
            بطاقة {currentIndex + 1} من أصل {words.length}
          </div>

          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className={`w-full min-h-[220px] rounded-2xl border-2 p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 relative select-none ${
              isFlipped
                ? 'bg-indigo-50/40 border-indigo-300 shadow-sm'
                : 'bg-slate-50/70 border-slate-200 hover:border-indigo-300 shadow-2xs'
            }`}
          >
            <span className="absolute top-3 left-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {isFlipped ? 'الوجه الخلفي: المعنى' : 'الوجه الأمامي: الكلمة'}
            </span>

            {/* Speaker button on front */}
            <button
              onClick={handleSpeak}
              className="absolute top-3 right-3 p-2 rounded-xl bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-all"
              title="استمع لنطق الكلمة"
            >
              <Volume2 className="w-4 h-4" />
            </button>

            {!isFlipped ? (
              <div className="space-y-3">
                <h4 className="text-3xl font-extrabold text-slate-900 font-english">
                  {currentWord.word}
                </h4>
                {currentWord.partOfSpeech && (
                  <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-600">
                    {currentWord.partOfSpeech}
                  </span>
                )}
                <p className="text-xs text-indigo-600 font-medium pt-2">
                  (انقر على البطاقة لإظهار المعنى بالعربية 👆)
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="text-2xl font-bold text-slate-900 font-arabic">
                  {currentWord.arabicMeaning}
                </h4>
                <p className="text-xs text-slate-500 font-english italic max-w-sm">
                  "{currentWord.sentenceContext}"
                </p>
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="w-full flex items-center justify-between gap-3 mt-6">
            <button
              onClick={handlePrev}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              title="السابق"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              onClick={toggleMastered}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                isMastered
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isMastered ? 'تمت الإجادة بنجاح ✓' : 'تحديد كـ "حفظتها"'}</span>
            </button>

            <button
              onClick={handleNext}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              title="التالي"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
