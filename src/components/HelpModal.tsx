import React from 'react';
import { X, Volume2, MousePointer, BookmarkCheck, Copy, Sparkles } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-800">
              دليل استخدام التطبيق والمزايا الذكية
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs sm:text-sm text-slate-700 leading-relaxed max-h-[75vh] overflow-y-auto font-arabic">
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <span className="font-bold text-xs">1</span>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">
                رفع المستند أو الورقة أو ملف الـ PDF:
              </h4>
              <p className="text-slate-600">
                اضغط على زر الرفع واختر أي ورقة مصورة أو كتاب أو ملف PDF أو الصق نصاً، وسيقوم الذكاء الاصطناعي باستخراج النص بدقة وتقسيمه جملة بجملة.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">
                الاستماع للنطق الصوتي لكل جملة:
              </h4>
              <p className="text-slate-600">
                بجانب كل جملة إنجليزية ستجد زر سماعة، انقر عليه للاستماع لنطق الجملة بصوت إنجليزي فصيح. يمكنك أيضاً ضبط سرعة الصوت (0.75x للمبتدئين، أو 1x، أو 1.25x).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <MousePointer className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">
                ميكانيزم النقر على الكلمات وحفظ المفردات الجديدة:
              </h4>
              <p className="text-slate-600">
                أي كلمة إنجليزية في أي جملة هي كلمة تفاعلية وقابلة للنقر! بمجرد النقر عليها، ستظهر لك نافذة بالمعنى السياقي الدقيق ونطق الكلمة الفردي، مع زر لحفظها فوراً في قائمة مفرداتك.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Copy className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">
                نسخ المفردات (كابي بيست) لكل صفحة أو للكل:
              </h4>
              <p className="text-slate-600">
                من خلال زر "قائمة مفرداتي"، يمكنك فلترة الكلمات بحسب كل صفحة أو عرضها بالكامل، ونسخها بنقرة واحدة كـ (كلمة - معنى) أو جدول Excel أو ملف نصي جاهز للنقل لأي تطبيق آخر!
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            فهمت، لنبدأ!
          </button>
        </div>
      </div>
    </div>
  );
};
