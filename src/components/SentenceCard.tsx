import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Copy,
  Check,
  BookmarkPlus,
  BookmarkCheck,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Sentence, SavedWord } from '../types';

interface SentenceCardProps {
  sentence: Sentence;
  pageNumber: number;
  isPlaying: boolean;
  onPlay: (text: string) => void;
  onStop: () => void;
  onWordClick: (word: string, sentence: string) => void;
  onSaveQuickWord: (word: string, arabicMeaning: string, partOfSpeech?: string) => void;
  savedWordsMap: Map<string, SavedWord>;
}

export const SentenceCard: React.FC<SentenceCardProps> = ({
  sentence,
  pageNumber,
  isPlaying,
  onPlay,
  onStop,
  onWordClick,
  onSaveQuickWord,
  savedWordsMap,
}) => {
  const [copiedEnglish, setCopiedEnglish] = useState(false);
  const [showLiteral, setShowLiteral] = useState(true);

  // Helper to split English sentence into tokens preserving words and punctuation
  const renderInteractiveEnglish = () => {
    // Regex matches words (including hyphens and apostrophes) or whitespace/punctuation
    const tokens = sentence.english.split(/(\s+|[.,!?;:"()]+)/);

    return tokens.map((token, idx) => {
      // Check if token is a word (contains letters)
      const isWord = /[a-zA-Z]/.test(token);
      if (!isWord) {
        return <span key={idx} className="text-slate-500">{token}</span>;
      }

      const cleanWord = token.replace(/[^a-zA-Z'-]/g, '').toLowerCase();
      const isSaved = savedWordsMap.has(cleanWord);

      return (
        <button
          key={idx}
          onClick={(e) => {
            e.stopPropagation();
            onWordClick(token.replace(/[^a-zA-Z'-]/g, ''), sentence.english);
          }}
          className={`inline-block px-1 py-0.5 -mx-0.5 rounded-md font-english transition-all cursor-pointer relative group text-left ${
            isSaved
              ? 'bg-amber-100/80 text-amber-900 font-semibold border-b-2 border-amber-400'
              : 'hover:bg-indigo-100 hover:text-indigo-900 border-b border-transparent hover:border-indigo-400'
          }`}
          title="انقر لترجمة الكلمة وحفظها في قائمتك"
        >
          <span>{token}</span>
          {isSaved && (
            <span
              className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full mr-0.5 align-top mt-1"
              title="محفوظة في قائمة المفردات"
            />
          )}
        </button>
      );
    });
  };

  const copyToClipboard = (text: string, isEng: boolean) => {
    navigator.clipboard.writeText(text);
    if (isEng) {
      setCopiedEnglish(true);
      setTimeout(() => setCopiedEnglish(false), 2000);
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all p-5 sm:p-6 bg-white ${
        isPlaying
          ? 'border-indigo-500 ring-2 ring-indigo-200/70 shadow-md bg-indigo-50/20'
          : 'border-slate-200 hover:border-slate-300 shadow-2xs'
      }`}
    >
      {/* Top Header of Sentence */}
      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-700">
            جملة {sentence.sentenceIndex}
          </span>
          {isPlaying && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
              <span className="flex gap-0.5 items-end h-3">
                <span className="w-1 bg-indigo-600 rounded-full animate-bounce h-2" />
                <span className="w-1 bg-indigo-600 rounded-full animate-bounce h-3 delay-75" />
                <span className="w-1 bg-indigo-600 rounded-full animate-bounce h-1.5 delay-150" />
              </span>
              <span>جاري النطق...</span>
            </div>
          )}
        </div>

        {/* Audio Speaker & Copy Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => copyToClipboard(sentence.english, true)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="نسخ الجملة بالإنجليزية"
          >
            {copiedEnglish ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Speaker Button */}
          <button
            onClick={() => {
              if (isPlaying) {
                onStop();
              } else {
                onPlay(sentence.english);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isPlaying
                ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
            }`}
            title={isPlaying ? 'إيقاف الصوت' : 'استمع لنطق الجملة بالإنجليزي'}
          >
            {isPlaying ? (
              <>
                <VolumeX className="w-4 h-4" />
                <span>إيقاف</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-indigo-600" />
                <span>استمع</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 1. English Sentence with Clickable Words */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            English Sentence (اضغط على أي كلمة لمعرفة معناها وحفظها):
          </span>
        </div>
        <div className="text-base sm:text-lg font-english text-slate-900 leading-relaxed bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
          {renderInteractiveEnglish()}
        </div>
      </div>

      {/* 2. Contextual Translation (المعنى السياقي الطبيعي) */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-1 text-xs font-bold text-indigo-900">
          <span className="w-2 h-2 rounded-full bg-indigo-600" />
          <span>المعنى السياقي (الترجمة المفهومة):</span>
        </div>
        <p className="text-sm sm:text-base font-bold text-slate-800 leading-relaxed pr-3.5 border-r-2 border-indigo-400 font-arabic">
          {sentence.contextualTranslation}
        </p>
      </div>

      {/* 3. Literal / Word-by-word Translation (الترجمة الحرفية وتفكيك البنية) */}
      <div className="mb-4 pt-2 border-t border-slate-100">
        <button
          onClick={() => setShowLiteral(!showLiteral)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors mb-2 cursor-pointer"
        >
          <span>الترجمة الحرفية وتفكيك الكلمات</span>
          {showLiteral ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showLiteral && (
          <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-100/80 text-xs sm:text-sm text-slate-700 leading-relaxed font-arabic pr-3 border-r-3 border-r-amber-400">
            {sentence.literalTranslation}
          </div>
        )}
      </div>

      {/* 4. Linguistic Note (إن وجدت) */}
      {sentence.linguisticNote && (
        <div className="mb-4 p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
          <Lightbulb className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">فائدة لغوية: </span>
            <span>{sentence.linguisticNote}</span>
          </div>
        </div>
      )}

      {/* 5. Key Vocabulary Chips for this sentence */}
      {sentence.vocabulary && sentence.vocabulary.length > 0 && (
        <div className="pt-3 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-400 mb-2">
            مفردات هامة في هذه الجملة:
          </div>
          <div className="flex flex-wrap gap-2">
            {sentence.vocabulary.map((vocab, vIdx) => {
              const clean = vocab.word.toLowerCase();
              const isSaved = savedWordsMap.has(clean);

              return (
                <div
                  key={vIdx}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors border ${
                    isSaved
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <button
                    onClick={() => onWordClick(vocab.word, sentence.english)}
                    className="font-english font-bold hover:underline cursor-pointer"
                  >
                    {vocab.word}
                  </button>
                  <span className="text-slate-400 text-[10px]">·</span>
                  <span className="text-slate-600 font-arabic">{vocab.arabicMeaning}</span>

                  <button
                    onClick={() => {
                      if (!isSaved) {
                        onSaveQuickWord(vocab.word, vocab.arabicMeaning, vocab.partOfSpeech);
                      }
                    }}
                    className="p-0.5 hover:text-indigo-600 cursor-pointer ml-0.5"
                    title={isSaved ? 'محفوظة في قائمتك' : 'إضافة إلى مفرداتي'}
                  >
                    {isSaved ? (
                      <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <BookmarkPlus className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-600" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
