import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, Sparkles, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { SAMPLE_DOCUMENTS } from '../data/sampleDocuments';
import { DocumentAnalysis } from '../types';

interface UploadSectionProps {
  onAnalyzeFile: (fileData: string, mimeType: string, filename: string) => Promise<void>;
  onAnalyzeText: (text: string) => Promise<void>;
  onSelectSample: (sample: DocumentAnalysis) => void;
  isLoading: boolean;
  loadingStep: string;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  onAnalyzeFile,
  onAnalyzeText,
  onSelectSample,
  isLoading,
  loadingStep,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ file: File; base64: string; previewUrl?: string } | null>(null);
  const [textInput, setTextInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = (file: File) => {
    setErrorMessage(null);
    const validMimes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
    ];

    if (!validMimes.includes(file.type)) {
      setErrorMessage('يرجى اختيار ملف PDF أو صورة واضحة (PNG, JPG, WEBP).');
      return;
    }

    // Limit to 20MB for browser memory
    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage('حجم الملف كبير جداً. يرجى اختيار ملف أقل من 20 ميغابايت.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      const previewUrl = file.type.startsWith('image/') ? result : undefined;
      setSelectedFile({
        file,
        base64: base64Data,
        previewUrl,
      });
    };
    reader.onerror = () => {
      setErrorMessage('حدث خطأ أثناء قراءة الملف من جهازك.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleSubmitFile = () => {
    if (!selectedFile) return;
    onAnalyzeFile(selectedFile.base64, selectedFile.file.type, selectedFile.file.name);
  };

  const handleSubmitText = () => {
    if (!textInput.trim()) {
      setErrorMessage('يرجى كتابة أو لصق نص إنجليزي لترجمته وتحليله.');
      return;
    }
    setErrorMessage(null);
    onAnalyzeText(textInput.trim());
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Intro hero banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>ترجمة تفاعلية متقدمة للمستندات والورقات</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          حمّل ورقتك أو ملف الـ PDF لتحصل على ترجمة دقيقة جملة بجملة
        </h2>
        <p className="mt-2.5 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          استمع لنطق كل جملة بصوت نقي، واكتشف المعنى السياقي والحرفي معاً، وانقر على أي كلمة غير معروفة لحفظها فوراً في قائمتك مع إمكانية نسخها لأي مكان.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-center mb-6">
        <div className="inline-flex p-1 bg-slate-200/80 rounded-xl">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>رفع ورقة أو PDF أو صورة</span>
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>لصق نص إنجليزي مباشر</span>
          </button>
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Action Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        {activeTab === 'upload' ? (
          <div>
            {!selectedFile ? (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
                    : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <UploadCloud className="w-8 h-8" />
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-800">
                  انقر هنا لاختيار ورقة أو ملف PDF أو صورة
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  أو اسحب الملف وأفلته مباشرة هنا
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> مستندات PDF
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5" /> صور الأوراق والكتب (PNG, JPG)
                  </span>
                  <span>•</span>
                  <span>حتى 20 ميغابايت</span>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-4">
                    {selectedFile.previewUrl ? (
                      <img
                        src={selectedFile.previewUrl}
                        alt="Preview"
                        className="w-14 h-14 object-cover rounded-lg border border-slate-200"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <FileText className="w-7 h-7" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                          {selectedFile.file.name}
                        </p>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {(selectedFile.file.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.file.type || 'مستند'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    تغيير الملف
                  </button>
                </div>

                <button
                  onClick={handleSubmitFile}
                  disabled={isLoading}
                  className="w-full py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm shadow-indigo-200 cursor-pointer"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>بدء تحليل وترجمة المستند جملة بجملة</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                النص الإنجليزي المراد قراءته وترجمته:
              </label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Paste your English paragraph, article, or notes here..."
                rows={6}
                className="w-full p-4 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-english transition-all"
              />
            </div>

            <button
              onClick={handleSubmitText}
              disabled={isLoading || !textInput.trim()}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm shadow-indigo-200 cursor-pointer"
            >
              <Sparkles className="w-5 h-5" />
              <span>ترجمة النص وتحليله جملة بجملة</span>
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="mt-6 p-6 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-center animate-pulse">
            <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <h4 className="text-sm font-bold text-indigo-900">
              {loadingStep || 'جاري استخراج النص وتحليله بالذكاء الاصطناعي...'}
            </h4>
            <p className="text-xs text-indigo-600/80 mt-1 max-w-md mx-auto">
              نقوم باستخراج النص، وتقسيمه بدقة إلى جمل، وصياغة الترجمة السياقية والحرفية مع استخراج المفردات.
            </p>
          </div>
        )}
      </div>

      {/* Quick Test Samples */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            أو جرّب أحد النماذج الجاهزة فوراً دون الحاجة لرفع ملف:
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SAMPLE_DOCUMENTS.map((sample) => (
            <div
              key={sample.id}
              onClick={() => onSelectSample(sample.data)}
              className="group p-4 bg-white hover:bg-indigo-50/40 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer shadow-2xs hover:shadow-sm"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-indigo-600 group-hover:text-indigo-700">
                  {sample.label}
                </span>
                <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:-translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                {sample.description}
              </p>
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400">
                <span>{sample.data.totalSentences} جمل مترجمة</span>
                <span>•</span>
                <span>مفردات ونطق صوتي جاهز</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
