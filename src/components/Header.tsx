import React from 'react';
import { BookOpen, BookmarkCheck, Volume2, Sparkles, HelpCircle, FileText } from 'lucide-react';

interface HeaderProps {
  savedWordsCount: number;
  onOpenVocabulary: () => void;
  speechRate: number;
  onChangeSpeechRate: (rate: number) => void;
  useAiVoice: boolean;
  onToggleAiVoice: () => void;
  onOpenHelp: () => void;
  onResetDocument?: () => void;
  hasDocument: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  savedWordsCount,
  onOpenVocabulary,
  speechRate,
  onChangeSpeechRate,
  useAiVoice,
  onToggleAiVoice,
  onOpenHelp,
  onResetDocument,
  hasDocument,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">LingoDoc</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                مترجم المستندات الذكي
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              ترجمة جملة بجملة • نطق صوتي • استخراج المفردات بنقرة واحدة
            </p>
          </div>
        </div>

        {/* Controls and Saved Words Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {hasDocument && onResetDocument && (
            <button
              onClick={onResetDocument}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="تحميل مستند جديد"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden md:inline">مستند جديد</span>
            </button>
          )}

          {/* Voice Speed Selector */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium text-slate-600">
            <span className="px-1 text-[11px] text-slate-400">سرعة الصوت:</span>
            {[0.75, 1.0, 1.25].map((rate) => (
              <button
                key={rate}
                onClick={() => onChangeSpeechRate(rate)}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  speechRate === rate
                    ? 'bg-white text-indigo-600 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* AI Voice Toggle */}
          <button
            onClick={onToggleAiVoice}
            className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              useAiVoice
                ? 'bg-violet-50 text-violet-700 border-violet-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title={useAiVoice ? 'الصوت الفائق بالذكاء الاصطناعي مفعل' : 'صوت المتصفح المباشر مفعل'}
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            <span>{useAiVoice ? 'صوت AI فائق' : 'صوت قياسي'}</span>
          </button>

          {/* Vocabulary List Trigger Button */}
          <button
            onClick={onOpenVocabulary}
            className="relative inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-sm shadow-indigo-200 transition-all cursor-pointer"
          >
            <BookmarkCheck className="w-4 h-4" />
            <span>قائمة مفرداتي</span>
            {savedWordsCount > 0 ? (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold bg-white text-indigo-600 rounded-full">
                {savedWordsCount}
              </span>
            ) : null}
          </button>

          {/* Help Button */}
          <button
            onClick={onOpenHelp}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="طريقة استخدام التطبيق"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
