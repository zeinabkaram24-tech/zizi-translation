import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Trash2,
  Volume2,
  Download,
  Filter,
  Search,
  BrainCircuit,
  FileSpreadsheet,
  FileText,
  BookmarkCheck,
} from 'lucide-react';
import { SavedWord } from '../types';
import { speakText } from '../services/speech';

interface VocabularyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedWords: SavedWord[];
  onRemoveWord: (word: string) => void;
  onClearAll: () => void;
  currentPage: number;
  totalPages: number;
  onOpenFlashcards: () => void;
  speechRate: number;
}

export const VocabularyDrawer: React.FC<VocabularyDrawerProps> = ({
  isOpen,
  onClose,
  savedWords,
  onRemoveWord,
  onClearAll,
  currentPage,
  totalPages,
  onOpenFlashcards,
  speechRate,
}) => {
  const [filterPage, setFilterPage] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [playingWord, setPlayingWord] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter words by page and search term
  const filteredWords = savedWords.filter((item) => {
    const matchesPage = filterPage === 'all' || item.pageNumber === filterPage;
    const matchesSearch =
      !searchQuery.trim() ||
      item.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.arabicMeaning.includes(searchQuery);
    return matchesPage && matchesSearch;
  });

  const handlePlayWord = (word: string) => {
    setPlayingWord(word);
    speakText(word, {
      rate: speechRate,
      onEnd: () => setPlayingWord(null),
      onError: () => setPlayingWord(null),
    });
  };

  // Copy formats
  const copyAsPlainText = () => {
    if (filteredWords.length === 0) return;
    const text = filteredWords
      .map((item) => `${item.word} - ${item.arabicMeaning}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    triggerCopyFeedback('تم نسخ الكلمات كـ قائمة نصية (الكلمة - معناها)');
  };

  const copyAsTable = () => {
    if (filteredWords.length === 0) return;
    // Tab-separated for Google Sheets / Excel
    const header = 'Word\tArabic Meaning\tPart of Speech\tSentence Context\tPage\n';
    const rows = filteredWords
      .map(
        (item) =>
          `${item.word}\t${item.arabicMeaning}\t${item.partOfSpeech || ''}\t"${item.sentenceContext.replace(/"/g, '""')}"\t${item.pageNumber}`
      )
      .join('\n');
    navigator.clipboard.writeText(header + rows);
    triggerCopyFeedback('تم نسخ الكلمات كـ جدول جاهز للصق في إكسل أو Sheets');
  };

  const copyAsAnki = () => {
    if (filteredWords.length === 0) return;
    // Anki card format: Front \t Back
    const text = filteredWords
      .map((item) => `${item.word}\t${item.arabicMeaning} <br><small>${item.sentenceContext}</small>`)
      .join('\n');
    navigator.clipboard.writeText(text);
    triggerCopyFeedback('تم نسخ الكلمات بصيغة بطاقات Anki');
  };

  const downloadTextFile = () => {
    if (filteredWords.length === 0) return;
    const content = filteredWords
      .map(
        (item, idx) =>
          `${idx + 1}. ${item.word} (${item.partOfSpeech || 'n/a'})\n   المعنى: ${item.arabicMeaning}\n   السياق: ${item.sentenceContext}\n`
      )
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vocab-list-page-${filterPage}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    triggerCopyFeedback('تم تحميل ملف المفردات بنجاح');
  };

  const triggerCopyFeedback = (msg: string) => {
    setCopyFeedback(msg);
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-r border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <BookmarkCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                قائمة المفردات الجديدة
              </h2>
              <p className="text-xs text-slate-500">
                {savedWords.length} كلمة محفوظة جاهزة للنسخ والحفظ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Copy Feedback Toast */}
        {copyFeedback && (
          <div className="bg-emerald-600 text-white text-xs font-bold py-2.5 px-4 text-center flex items-center justify-center gap-2 animate-in slide-in-from-top duration-150">
            <Check className="w-4 h-4" />
            <span>{copyFeedback}</span>
          </div>
        )}

        {/* Action Bar: Copy Buttons & Practice */}
        <div className="p-4 bg-indigo-50/40 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-indigo-900">
              خيارات النسخ (كابي بيست):
            </span>

            {savedWords.length > 0 && (
              <button
                onClick={onOpenFlashcards}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <BrainCircuit className="w-3.5 h-3.5" />
                <span>مراجعة البطاقات</span>
              </button>
            )}
          </div>

          {/* Export / Copy Options */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              onClick={copyAsPlainText}
              disabled={filteredWords.length === 0}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
              title="نسخ نص عادي: كلمة - معنى"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>نسخ (كلمة - معنى)</span>
            </button>

            <button
              onClick={copyAsTable}
              disabled={filteredWords.length === 0}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
              title="نسخ جدول مناسب لـ Excel و Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>نسخ كـ جدول</span>
            </button>

            <button
              onClick={downloadTextFile}
              disabled={filteredWords.length === 0}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 cursor-pointer col-span-2 sm:col-span-1"
              title="تحميل كملف نصي TXT"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>تحميل TXT</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-3 border-b border-slate-200 flex flex-wrap items-center gap-2 bg-slate-50/50">
          {/* Page Filter Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 text-[11px] font-bold px-1">الصفحة:</span>
            <button
              onClick={() => setFilterPage('all')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                filterPage === 'all'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              الكل ({savedWords.length})
            </button>

            {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map((pg) => {
              const countInPage = savedWords.filter((w) => w.pageNumber === pg).length;
              return (
                <button
                  key={pg}
                  onClick={() => setFilterPage(pg)}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    filterPage === pg
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  ص {pg} {countInPage > 0 && `(${countInPage})`}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full mt-1">
            <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في الكلمات أو المعاني..."
              className="w-full pr-8 pl-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-400"
            />
          </div>
        </div>

        {/* Word List Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredWords.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <BookmarkCheck className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
              <p className="text-sm font-medium text-slate-500">
                لا توجد كلمات محفوظة في هذا القسم حتى الآن.
              </p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                أثناء قراءتك للجمل، انقر على أي كلمة إنجليزية تود حفظها وستظهر هنا فوراً.
              </p>
            </div>
          ) : (
            filteredWords.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-200 bg-white shadow-2xs transition-all space-y-2 group"
              >
                {/* Word Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-english font-bold text-base text-slate-900">
                      {item.word}
                    </span>
                    {item.partOfSpeech && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {item.partOfSpeech}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">
                      ص {item.pageNumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePlayWord(item.word)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        playingWord === item.word
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
                      }`}
                      title="استمع لنطق الكلمة"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${item.word} - ${item.arabicMeaning}`);
                        triggerCopyFeedback(`تم نسخ: ${item.word}`);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="نسخ هذه الكلمة"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onRemoveWord(item.word)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="حذف من القائمة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Meaning in Arabic */}
                <p className="text-sm font-bold text-slate-800 font-arabic">
                  {item.arabicMeaning}
                </p>

                {/* Context snippet */}
                {item.sentenceContext && (
                  <p className="text-[11px] font-english text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2">
                    "{item.sentenceContext}"
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {savedWords.length > 0 && (
          <div className="p-3 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              إجمالي {savedWords.length} مفردة محفوظة
            </span>

            <button
              onClick={() => {
                if (window.confirm('هل أنت متأكد من رغبتك في مسح جميع المفردات المحفوظة؟')) {
                  onClearAll();
                }
              }}
              className="text-xs text-rose-600 hover:underline cursor-pointer"
            >
              إفراغ القائمة بالكامل
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
