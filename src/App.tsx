import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Trash2,
  FileText,
  Sparkles,
  BookOpen,
  Loader2,
  X,
  BookmarkCheck,
  ChevronDown,
  Layers,
  Settings,
  Plus,
  ClipboardList,
} from 'lucide-react';
import { DocumentAnalysis, SavedWord, DocumentPage } from './types';
import { analyzeDocument, defineWord } from './services/api';
import { speakText, stopSpeaking } from './services/speech';
import { SAMPLE_DOCUMENTS } from './data/sampleDocuments';

// Store documents with their own embedded savedWords
interface SavedDocument {
  id: string;
  documentTitle: string;
  overviewSummary: string;
  pages: DocumentPage[];
  savedWords: SavedWord[];
  fullTextWithFormatting?: string;
  createdAt: string;
}

const STORAGE_KEY_DOCS = 'lingodoc_documents_library_v3';

// Auto-crop solid black bars from mobile screenshots to maximize text legibility
function calculateCropArea(img: HTMLImageElement): { x: number; y: number; w: number; h: number } {
  const fullArea = { x: 0, y: 0, w: img.width, h: img.height };
  
  // Rule 1: Only crop if the image is a tall portrait image (typical phone screenshots have aspect ratio >= 1.5)
  if (img.height / img.width < 1.5) {
    return fullArea;
  }

  const canvas = document.createElement('canvas');
  // Use a fast, small canvas for pixel scanning
  canvas.width = Math.min(img.width, 300);
  canvas.height = Math.round((img.height * canvas.width) / img.width);
  const ctx = canvas.getContext('2d');
  if (!ctx) return fullArea;
  
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  let imgData;
  try {
    imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch (e) {
    return fullArea;
  }

  const data = imgData.data;
  const w = canvas.width;
  const h = canvas.height;

  let top = 0;
  let bottom = h - 1;

  // Rule 2: Very strict threshold for absolute black (R,G,B < 15) to avoid cropping camera shadows
  const isPureBlack = (r: number, g: number, b: number) => r < 15 && g < 15 && b < 15;

  // Scan top-down to find first row that is NOT solid black
  for (let y = 0; y < h; y++) {
    let isRowBlack = true;
    for (let x = 0; x < w; x += 2) {
      const idx = (y * w + x) * 4;
      if (!isPureBlack(data[idx], data[idx + 1], data[idx + 2])) {
        isRowBlack = false;
        break;
      }
    }
    if (!isRowBlack) {
      top = y;
      break;
    }
  }

  // Scan bottom-up to find last row that is NOT solid black
  for (let y = h - 1; y >= 0; y--) {
    let isRowBlack = true;
    for (let x = 0; x < w; x += 2) {
      const idx = (y * w + x) * 4;
      if (!isPureBlack(data[idx], data[idx + 1], data[idx + 2])) {
        isRowBlack = false;
        break;
      }
    }
    if (!isRowBlack) {
      bottom = y;
      break;
    }
  }

  const scaleY = img.height / h;
  let originalTop = Math.floor(top * scaleY);
  let originalBottom = Math.floor(bottom * scaleY);

  // Rule 3: Only crop if the detected black bars are significant (at least 5% on top or bottom)
  const topBarPercentage = originalTop / img.height;
  const bottomBarPercentage = (img.height - originalBottom) / img.height;

  if (topBarPercentage < 0.05 && bottomBarPercentage < 0.05) {
    return fullArea;
  }

  // Rule 4: Ensure we don't crop too aggressively (cropped height must be at least 40% of original height)
  const croppedHeight = originalBottom - originalTop;
  if (croppedHeight < img.height * 0.4) {
    return fullArea;
  }

  // Add margin padding to prevent clipping top or bottom text
  originalTop = Math.max(0, originalTop - 15);
  originalBottom = Math.min(img.height - 1, originalBottom + 15);

  return {
    x: 0,
    y: originalTop,
    w: img.width,
    h: originalBottom - originalTop
  };
}

// Client-side image compression with bulletproof fallback and screenshot black-bar cropping
function compressImage(file: File, maxWidth = 1400, maxHeight = 1400, quality = 0.75): Promise<{ base64: string; type: string }> {
  return new Promise((resolve) => {
    // Resilient fallback: read the file directly if image processing fails
    const fallbackDirectRead = () => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = (reader.result as string) || '';
        const base64 = res.includes(',') ? res.split(',')[1] : res;
        resolve({ base64, type: file.type || 'image/jpeg' });
      };
      reader.onerror = () => {
        resolve({ base64: '', type: file.type || 'image/jpeg' });
      };
      reader.readAsDataURL(file);
    };

    if (!file.type.startsWith('image/')) {
      fallbackDirectRead();
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const crop = calculateCropArea(img);
          let width = crop.w;
          let height = crop.h;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            fallbackDirectRead();
            return;
          }

          // Important iOS Safari Fix: Fill background with solid white before drawing the image.
          // Drawing transparent pixels and exporting as image/jpeg can result in a pitch-black image on mobile browsers!
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);

          // Draw only the cropped high-resolution document content
          ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, width, height);
          
          const outputType = 'image/jpeg';
          const dataUrl = canvas.toDataURL(outputType, quality);
          const base64 = dataUrl.split(',')[1];
          
          resolve({ base64, type: outputType });
        } catch {
          fallbackDirectRead();
        }
      };
      img.onerror = () => {
        fallbackDirectRead();
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      fallbackDirectRead();
    };
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [activeDocId, setActiveDocId] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  
  // Audio state
  const [playingSentenceIndex, setPlayingSentenceIndex] = useState<number | null>(null);
  const [playingWordId, setPlayingWordId] = useState<string | null>(null);
  
  // Speech speed: default to calm beginner pace (0.75x)
  const [speechSpeed, setSpeechSpeed] = useState<number>(0.75);

  // UI state
  const [isVocabModalOpen, setIsVocabModalOpen] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [addedToast, setAddedToast] = useState<string | null>(null);
  const [wordAdding, setWordAdding] = useState<string | null>(null);
  const [showDocDropdown, setShowDocDropdown] = useState(false);
  const [isTextExpanded, setIsTextExpanded] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  
  // Custom Confirmation Overlays
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearVocabConfirm, setShowClearVocabConfirm] = useState(false);

  // New: Add New Page modal states
  const [isAddPageModalOpen, setIsAddPageModalOpen] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [pastedTitle, setPastedTitle] = useState('');

  // API Key Settings Overlay
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [customApiKey, setCustomApiKey] = useState(localStorage.getItem('lingodoc_custom_api_key') || '');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize library with preloaded sample documents if empty
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DOCS);
      if (stored !== null) {
        const parsed = JSON.parse(stored) as SavedDocument[];
        setDocuments(parsed);
        if (parsed && parsed.length > 0) {
          setActiveDocId(parsed[0].id);
        }
        return;
      }
    } catch (e) {
      console.error('Failed to load documents library', e);
    }

    // Seed with our default samples
    const seeded: SavedDocument[] = SAMPLE_DOCUMENTS.map((sample, idx) => ({
      id: `sample-${sample.id}`,
      documentTitle: sample.data.documentTitle,
      overviewSummary: sample.data.overviewSummary,
      pages: sample.data.pages,
      savedWords: sample.data.pages[0].sentences[0].vocabulary?.map((v) => ({
        id: `seed-word-${v.word}-${idx}`,
        word: v.word,
        arabicMeaning: v.arabicMeaning,
        partOfSpeech: v.partOfSpeech,
        sentenceContext: sample.data.pages[0].sentences[0].english,
        pageNumber: 1,
        savedAt: new Date().toISOString(),
      })) || [],
      createdAt: new Date().toISOString(),
    }));

    setDocuments(seeded);
    setActiveDocId(seeded[0].id);
  }, []);

  // Save documents library to localStorage on update
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(documents));
    } catch (e) {
      console.error('Failed to save library', e);
    }
  }, [documents]);

  // Active document data helper
  const activeDoc = documents.find((doc) => doc.id === activeDocId) || null;
  const savedWords = activeDoc ? activeDoc.savedWords : [];
  const savedWordSet = new Set(savedWords.map((w) => w.word.toLowerCase()));

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setIsAddPageModalOpen(false); // Close the add page modal
    setLoadingText('جاري تحسين جودة الصورة وقراءتها بالذكاء الاصطناعي...');
    stopSpeaking();
    setPlayingSentenceIndex(null);
    setPlayingWordId(null);

    try {
      // Compress the image before upload if it is an image to fit into Vercel limit
      const { base64, type } = await compressImage(file);
      
      setLoadingText('جاري قراءة الصفحة وترجمتها بالذكاء الاصطناعي...');
      const res = await analyzeDocument({
        fileData: base64,
        mimeType: type,
        titleHint: file.name,
      });

      const totalSentencesFound = res.pages?.reduce((acc, p) => acc + (p.sentences?.length || 0), 0) || 0;
      if (totalSentencesFound === 0) {
        alert('لم يتمكن الذكاء الاصطناعي من قراءة نصوص إنجليزية في هذه الصورة. يرجى التأكد من أن صورة الكتاب واضحة ومضاءة جيداً ثم أعيدي التجربة.');
        return;
      }

      // Add as a new document to the library
      const newDoc: SavedDocument = {
        id: `doc-${Date.now()}`,
        documentTitle: res.documentTitle || file.name,
        overviewSummary: res.overviewSummary || 'مستند مترجم حديثاً',
        pages: res.pages,
        savedWords: [],
        fullTextWithFormatting: res.fullTextWithFormatting,
        createdAt: new Date().toISOString(),
      };

      setDocuments((prev) => [newDoc, ...prev]);
      setActiveDocId(newDoc.id);
    } catch (err: any) {
      const errMsg = err.message || '';
      if (errMsg.includes('GEMINI_API_KEY_MISSING') || errMsg.includes('GEMINI_API_KEY') || errMsg.includes('not configured')) {
        setIsSettingsOpen(true);
        alert('مفتاح Gemini API غير مهيأ: يرجى إدخال مفتاح الـ API المجاني الخاص بكِ في نافذة الإعدادات التي فُتحت الآن لتفعيل الخدمة على موقع Vercel!');
      } else {
        alert(errMsg || 'تعذر قراءة المستند وتحليله.');
      }
    } finally {
      setIsLoading(false);
      setLoadingText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Submit raw pasted text for translation and analysis
  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) return;

    setIsLoading(true);
    setIsAddPageModalOpen(false);
    setLoadingText('جاري تحليل وترجمة النص المكتوب بالذكاء الاصطناعي...');
    stopSpeaking();
    setPlayingSentenceIndex(null);
    setPlayingWordId(null);

    try {
      const res = await analyzeDocument({
        text: pastedText,
        titleHint: pastedTitle.trim() || 'نص مضاف يدوياً',
      });

      const totalSentencesFound = res.pages?.reduce((acc, p) => acc + (p.sentences?.length || 0), 0) || 0;
      if (totalSentencesFound === 0) {
        alert('لم يتمكن الذكاء الاصطناعي من قراءة أو تقسيم جمل إنجليزية من هذا النص. يرجى كتابة نص إنجليزي واضح.');
        return;
      }

      const newDoc: SavedDocument = {
        id: `doc-${Date.now()}`,
        documentTitle: pastedTitle.trim() || res.documentTitle || 'نص مترجم',
        overviewSummary: res.overviewSummary || 'مستند نصي مترجم',
        pages: res.pages,
        savedWords: [],
        fullTextWithFormatting: pastedText,
        createdAt: new Date().toISOString(),
      };

      setDocuments((prev) => [newDoc, ...prev]);
      setActiveDocId(newDoc.id);
      setPastedText('');
      setPastedTitle('');
    } catch (err: any) {
      const errMsg = err.message || '';
      if (errMsg.includes('GEMINI_API_KEY_MISSING') || errMsg.includes('GEMINI_API_KEY') || errMsg.includes('not configured')) {
        setIsSettingsOpen(true);
        alert('مفتاح Gemini API غير مهيأ: يرجى إدخال مفتاح الـ API الخاص بكِ في الإعدادات لتفعيل الخدمة!');
      } else {
        alert(errMsg || 'تعذر تحليل وترجمة النص.');
      }
    } finally {
      setIsLoading(false);
      setLoadingText('');
    }
  };

  // Play audio for an English sentence
  const handlePlaySentence = (text: string, index: number) => {
    if (playingSentenceIndex === index) {
      stopSpeaking();
      setPlayingSentenceIndex(null);
      return;
    }

    setPlayingWordId(null);
    setPlayingSentenceIndex(index);
    speakText(text, {
      rate: speechSpeed,
      onEnd: () => setPlayingSentenceIndex(null),
      onError: () => setPlayingSentenceIndex(null),
    });
  };

  // Play audio for a single word
  const handlePlayWord = (word: string, wordId?: string) => {
    stopSpeaking();
    setPlayingSentenceIndex(null);
    if (wordId) setPlayingWordId(wordId);

    const wordRate = Math.min(speechSpeed, 0.72);

    speakText(word, {
      rate: wordRate,
      onEnd: () => setPlayingWordId(null),
      onError: () => setPlayingWordId(null),
    });
  };

  // Click word to add to active document's savedWords array
  const handleWordClick = async (rawWord: string, sentenceText: string) => {
    if (!activeDocId) return;
    const cleanWord = rawWord.trim().replace(/^[^\w]+|[^\w]+$/g, '');
    if (!cleanWord || cleanWord.length < 2) return;

    const lower = cleanWord.toLowerCase();

    // Toggle logic: If already saved, remove it from the active document's savedWords list
    if (savedWordSet.has(lower)) {
      setDocuments((prev) =>
        prev.map((doc) => {
          if (doc.id === activeDocId) {
            return {
              ...doc,
              savedWords: doc.savedWords.filter((w) => w.word.toLowerCase() !== lower),
            };
          }
          return doc;
        })
      );
      return;
    }

    // Try finding it first in pre-extracted vocabulary for instant meaning
    let foundMeaning = '';
    let foundPos = '';

    if (activeDoc) {
      for (const page of activeDoc.pages) {
        for (const s of page.sentences) {
          if (s.vocabulary) {
            const v = s.vocabulary.find(
              (item) => item.word.toLowerCase() === lower
            );
            if (v) {
              foundMeaning = v.arabicMeaning;
              foundPos = v.partOfSpeech || '';
              break;
            }
          }
        }
        if (foundMeaning) break;
      }
    }

    setWordAdding(cleanWord);
    if (!foundMeaning) {
      try {
        const def = await defineWord(cleanWord, sentenceText);
        foundMeaning = def.arabicMeaning;
        foundPos = def.partOfSpeech;
      } catch {
        foundMeaning = 'معنى الكلمة في الجملة';
      }
    }
    setWordAdding(null);

    const newWord: SavedWord = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      word: cleanWord,
      arabicMeaning: foundMeaning || 'ترجمة في السياق',
      partOfSpeech: foundPos,
      sentenceContext: sentenceText,
      pageNumber: 1,
      savedAt: new Date().toISOString(),
    };

    // Append word directly to the active document's saved list
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === activeDocId) {
          return {
            ...doc,
            savedWords: [newWord, ...doc.savedWords],
          };
        }
        return doc;
      })
    );

    // Toast feedback
    setAddedToast(cleanWord);
    setTimeout(() => setAddedToast(null), 2500);
  };

  // Delete a word from active document
  const handleDeleteWord = (wordId: string) => {
    if (!activeDocId) return;
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === activeDocId) {
          return {
            ...doc,
            savedWords: doc.savedWords.filter((w) => w.id !== wordId),
          };
        }
        return doc;
      })
    );
  };

  // Delete active document and all its saved words completely
  const handleDeleteCurrentDocument = () => {
    if (!activeDocId) return;
    setShowDeleteConfirm(true);
  };

  // Clear vocabulary list for the active document only
  const handleClearVocabOnly = () => {
    if (!activeDocId) return;
    setShowClearVocabConfirm(true);
  };

  // Copy active list (Word - Meaning)
  const handleCopyList = () => {
    if (savedWords.length === 0) return;
    const text = savedWords
      .map((item) => `${item.word} - ${item.arabicMeaning}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  const allSentences = activeDoc?.pages?.flatMap((p) => p.sentences) || [];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-arabic flex flex-col">
      {/* Top Bar - Beautifully Responsive and optimized for Mobile */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-0 sm:h-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          
          {/* Row 1: App branding & Upload Action */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h1 className="text-xs sm:text-base font-bold text-slate-900 leading-tight">مترجم الورقة والمفردات</h1>
                <p className="text-[10px] text-slate-500 hidden md:block">حفظ تلقائي لكل صفحة بمفرداتها الخاصة</p>
              </div>
            </div>

            {/* Upload Button */}
            <div className="flex items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => setIsAddPageModalOpen(true)}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[11px] sm:text-sm font-bold rounded-lg sm:rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة صفحة</span>
              </button>
            </div>
          </div>

          {/* Row 2: Audio Speed Controls & Saved Words Button */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-3 pt-2.5 border-t border-slate-100 sm:border-0 sm:pt-0">
            {/* Speed selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px]">
              {[
                { label: '🐢 بطيء', rate: 0.75 },
                { label: '🐌 هادئ جداً', rate: 0.6 },
                { label: 'عادي', rate: 1.0 },
              ].map((item) => (
                <button
                  key={item.rate}
                  onClick={() => setSpeechSpeed(item.rate)}
                  className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    speechSpeed === item.rate
                      ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Vocabulary Drawer Trigger */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsVocabModalOpen(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-200 text-[11px] sm:text-sm font-bold rounded-lg sm:rounded-xl shadow-2xs transition-all cursor-pointer"
              >
                <BookmarkCheck className="w-3.5 h-3.5 text-amber-700" />
                <span>المفردات</span>
                <span className="w-4 h-4 sm:w-5 sm:h-5 bg-amber-600 text-white rounded-full flex items-center justify-center text-[10px] sm:text-[11px] font-bold">
                  {savedWords.length}
                </span>
              </button>

              {/* API Key Settings Gear Icon */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-1.5 sm:p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-lg sm:rounded-xl shadow-2xs transition-all cursor-pointer flex items-center justify-center"
                title="إعدادات مفتاح Gemini API"
              >
                <Settings className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Floating Toast Feedback */}
      {addedToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>تم الحفظ في مفردات هذه الصفحة!</span>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-xs flex items-center justify-center">
          <div className="text-center p-6 bg-white rounded-2xl shadow-xl border border-slate-200">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-800">{loadingText}</p>
            <p className="text-xs text-slate-500 mt-1">يتم استخراج كل جملة وترجمتها...</p>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Document Selector & Clear Button Bar */}
        {documents.length > 0 && (
          <div className="mb-6 bg-white rounded-xl border border-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative">
              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">اسم الصفحة الحالية والمستندات المحفوظة:</label>
              
              {isRenaming ? (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-800 w-52 sm:w-64 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    placeholder="اكتب الاسم الجديد..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (!renameValue.trim()) return;
                        setDocuments((prev) =>
                          prev.map((doc) => {
                            if (doc.id === activeDocId) {
                              return { ...doc, documentTitle: renameValue.trim() };
                            }
                            return doc;
                          })
                        );
                        setIsRenaming(false);
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (!renameValue.trim()) return;
                      setDocuments((prev) =>
                        prev.map((doc) => {
                          if (doc.id === activeDocId) {
                            return { ...doc, documentTitle: renameValue.trim() };
                          }
                          return doc;
                        })
                      );
                      setIsRenaming(false);
                    }}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>حفظ</span>
                  </button>
                  <button
                    onClick={() => setIsRenaming(false)}
                    className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowDocDropdown(!showDocDropdown)}
                    className="inline-flex items-center justify-between gap-3 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold text-slate-800 transition-colors w-48 sm:w-64 text-right cursor-pointer"
                  >
                    <span className="truncate">{activeDoc?.documentTitle || 'اختر صفحة...'}</span>
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  </button>

                  {/* Inline Rename Action */}
                  <button
                    onClick={() => {
                      setRenameValue(activeDoc?.documentTitle || '');
                      setIsRenaming(true);
                    }}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                    title="تعديل اسم هذه الصفحة"
                  >
                    <span>✏️</span>
                    <span>تعديل الاسم</span>
                  </button>

                  {/* Dropdown Menu */}
                  {showDocDropdown && (
                    <div className="absolute top-full right-0 mt-1.5 w-64 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-40 max-h-60 overflow-y-auto">
                      {documents.map((doc) => (
                        <button
                          key={doc.id}
                          onClick={() => {
                            stopSpeaking();
                            setActiveDocId(doc.id);
                            setShowDocDropdown(false);
                          }}
                          className={`w-full text-right px-4 py-2.5 text-xs sm:text-sm transition-colors block ${
                            doc.id === activeDocId
                              ? 'bg-indigo-50 text-indigo-700 font-extrabold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="font-english truncate">{doc.documentTitle}</div>
                          <div className="text-[10px] text-slate-400 font-arabic mt-0.5">
                            {doc.savedWords.length} كلمة محفوظة • {new Date(doc.createdAt).toLocaleDateString('ar-EG')}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Clear This Page and its Vocabs Completely */}
            {activeDocId && (
              <button
                onClick={handleDeleteCurrentDocument}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all cursor-pointer self-start sm:self-auto"
                title="مسح هذه الصفحة وترجمتها ومفرداتها بالكامل"
              >
                <Trash2 className="w-4 h-4" />
                <span>مسح هذه الصفحة ومفرداتها</span>
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Translated Page (7 Cols on Desktop) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
            {activeDoc ? (
              <>
                {/* Page Header */}
                <div className="pb-4 mb-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-indigo-600">الصفحة النشطة</span>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 font-english mt-0.5">
                      {activeDoc.documentTitle}
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    {allSentences.length} جملة
                  </span>
                </div>

                {/* Simple User Hint */}
                <div className="mb-4 p-3 bg-indigo-50/70 rounded-xl text-xs text-indigo-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    اضغط على <strong>أي كلمة إنجليزية</strong> لإضافتها لمفردات هذه الصفحة. واضغط على <strong>زر السماعة 🔊</strong> لسماع النطق الهادئ.
                  </span>
                </div>

                {/* Reconstructed Full English Text with "See More" collapse/expand */}
                {allSentences.length > 0 && (
                  <div className="mb-6 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider font-english">
                      Full English Page Text (النص الكامل بالتنسيق الأصلي):
                    </span>
                    
                    <p className={`text-sm sm:text-base font-english text-slate-700 leading-relaxed whitespace-pre-wrap ${
                      isTextExpanded ? 'block' : 'line-clamp-2'
                    }`}>
                      {activeDoc.fullTextWithFormatting || allSentences.map((s) => s.english).join('\n')}
                    </p>
                    
                    <button
                      onClick={() => setIsTextExpanded(!isTextExpanded)}
                      className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors inline-flex items-center gap-1 cursor-pointer font-arabic"
                    >
                      {isTextExpanded ? (
                        <>
                          <span>عرض أقل ▴</span>
                          <span className="font-english text-[10px]">(See Less)</span>
                        </>
                      ) : (
                        <>
                          <span>عرض النص كاملاً ▾</span>
                          <span className="font-english text-[10px]">(See More)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Sentences Sequence */}
                {allSentences.length === 0 ? (
                  <div className="p-8 text-center bg-amber-50/60 rounded-2xl border border-amber-200">
                    <p className="text-sm font-bold text-amber-900 mb-1">لم يتم العثور على جمل إنجليزية في هذه الصفحة</p>
                    <p className="text-xs text-amber-700">تأكدي من وضوح تصوير صفحة الكتاب وإضاءتها ثم أعيدي رفعها.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {allSentences.map((sentence, idx) => {
                    const isPlaying = playingSentenceIndex === sentence.sentenceIndex;
                    const tokens = sentence.english.split(/(\s+|[.,!?;:"()]+)/);

                    return (
                      <div
                        key={sentence.sentenceIndex || idx}
                        className={`p-4 rounded-xl border transition-all ${
                          isPlaying
                            ? 'border-indigo-400 bg-indigo-50/20 shadow-xs'
                            : 'border-slate-150 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        {/* Sentence English + Speaker */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-base sm:text-lg font-english text-slate-900 leading-relaxed">
                            {tokens.map((token, tIdx) => {
                              const isWord = /[a-zA-Z]/.test(token);
                              if (!isWord) return <span key={tIdx}>{token}</span>;

                              const clean = token.replace(/[^a-zA-Z'-]/g, '').toLowerCase();
                              const isSaved = savedWordSet.has(clean);
                              const isCurrentlyAdding = wordAdding === clean;

                              return (
                                <button
                                  key={tIdx}
                                  onClick={() => handleWordClick(token, sentence.english)}
                                  className={`inline-block px-1 py-0.5 -mx-0.5 rounded cursor-pointer transition-all ${
                                    isSaved
                                      ? 'bg-amber-200 text-amber-900 font-semibold'
                                      : 'hover:bg-indigo-100 hover:text-indigo-900'
                                  }`}
                                  title={isSaved ? 'محفوظة في قائمتك (انقر لإزالتها)' : 'انقر لإضافتها لقائمة المفردات'}
                                >
                                  {token}
                                  {isCurrentlyAdding && (
                                    <Loader2 className="w-2.5 h-2.5 inline animate-spin mr-0.5 text-indigo-600" />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Speaker Button for Sentence */}
                          <button
                            onClick={() => handlePlaySentence(sentence.english, sentence.sentenceIndex)}
                            className={`p-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                              isPlaying
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-50'
                            }`}
                            title={isPlaying ? 'إيقاف الصوت' : 'استمع للجملة بنطق هادئ'}
                          >
                            {isPlaying ? (
                              <>
                                <VolumeX className="w-4 h-4" />
                                <span className="text-[11px] font-bold">إيقاف</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-4 h-4" />
                                <span className="text-[11px] font-bold">استمع</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Arabic Translation Directly Underneath */}
                        <div className="mt-3 pt-2.5 border-t border-slate-200/60">
                          <p className="text-sm sm:text-base font-bold text-slate-800 leading-relaxed font-arabic">
                            {sentence.contextualTranslation}
                          </p>

                          {sentence.literalTranslation && (
                            <p className="mt-1 text-xs text-slate-500 font-arabic leading-normal">
                              {sentence.literalTranslation}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                )}
              </>
            ) : (
              <div className="py-20 text-center text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300 stroke-1" />
                <h3 className="text-sm font-bold text-slate-700">لا توجد صفحات حالياً</h3>
                <p className="text-xs text-slate-400 mt-1">اضغطي على زر "رفع صفحة" في الأعلى لترجمة وحفظ ورقتك الأولى.</p>
              </div>
            )}
          </div>

          {/* Vocabulary List Column (5 Cols on Desktop - Always Visible and Prominent) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 sticky top-20">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <BookmarkCheck className="w-5 h-5 text-amber-600" />
                  <span>مفردات هذه الصفحة</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  مفردات مخصصة ومحفوظة لهذه الصفحة فقط
                </p>
              </div>
              <span className="px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-900 rounded-lg">
                {savedWords.length} كلمة
              </span>
            </div>

            {/* Action Bar: Copy Button */}
            <button
              onClick={handleCopyList}
              disabled={savedWords.length === 0}
              className="w-full py-2.5 px-4 mb-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-40 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              {copiedToast ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>تم نسخ القائمة بنجاح!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>نسخ القائمة (كابي بيست)</span>
                </>
              )}
            </button>

            {/* Word Items List */}
            {savedWords.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                <p className="text-xs font-semibold text-slate-500">القائمة فارغة حالياً</p>
                <p className="text-xs text-slate-400 mt-1 max-w-[220px] mx-auto">
                  اضغط على أي كلمة إنجليزية في الصفحة لتنزل هنا فوراً مع زر الصوت لسماع نطقها الهادئ.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[62vh] overflow-y-auto pr-1">
                {savedWords.map((item) => {
                  const isWordPlaying = playingWordId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isWordPlaying
                          ? 'border-indigo-400 bg-indigo-50/40 shadow-xs'
                          : 'bg-slate-50 border-slate-200 hover:border-indigo-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-english font-bold text-base text-slate-900 tracking-tight">
                          {item.word}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handlePlayWord(item.word, item.id)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isWordPlaying
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-indigo-700 hover:bg-indigo-50'
                            }`}
                            title="استمع لنطق هذه الكلمة بهدوء للمبتدئين"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>{isWordPlaying ? 'نطق...' : 'استمع'}</span>
                          </button>

                          <button
                            onClick={() => handleDeleteWord(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors cursor-pointer"
                            title="حذف من القائمة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-sm font-bold text-slate-800 font-arabic">
                        {item.arabicMeaning}
                      </p>
                    </div>
                  );
                })}

                {/* Clear Active Vocabs */}
                <div className="pt-2 text-center">
                  <button
                    onClick={handleClearVocabOnly}
                    className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    مسح مفردات هذه الصفحة فقط
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Full Modal for Vocabulary List */}
      {isVocabModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <BookmarkCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    قائمة المفردات المحفوظة
                  </h3>
                  <p className="text-xs text-slate-500">
                    {savedWords.length} كلمة • خاصة بـ: "{activeDoc?.documentTitle}"
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsVocabModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Speed & Copy Toolbar inside Modal */}
            <div className="p-4 bg-indigo-50/40 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-slate-600">سرعة الصوت:</span>
                {[
                  { label: '🐢 بطيء', rate: 0.75 },
                  { label: '🐌 هادئ جداً', rate: 0.6 },
                  { label: 'عادي', rate: 1.0 },
                ].map((item) => (
                  <button
                    key={item.rate}
                    onClick={() => setSpeechSpeed(item.rate)}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                      speechSpeed === item.rate
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleCopyList}
                disabled={savedWords.length === 0}
                className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-40 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                {copiedToast ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>تم النسخ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ كل الكلمات</span>
                  </>
                )}
              </button>
            </div>

            {/* Words list inside modal */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {savedWords.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                  <p className="text-sm font-semibold text-slate-600">لا توجد كلمات حتى الآن</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    اضغط على أي كلمة داخل الصفحة وستظهر هنا فوراً مع زر الصوت لسماع نطقها الواضح.
                  </p>
                </div>
              ) : (
                savedWords.map((item) => {
                  const isWordPlaying = playingWordId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isWordPlaying
                          ? 'border-indigo-400 bg-indigo-50/40 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-indigo-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <span className="font-english font-bold text-lg text-slate-900">
                          {item.word}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePlayWord(item.word, item.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isWordPlaying
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                            }`}
                            title="استمع لنطق هذه الكلمة"
                          >
                            <Volume2 className="w-4 h-4" />
                            <span>{isWordPlaying ? 'جاري النطق...' : 'استمع للكلمة'}</span>
                          </button>

                          <button
                            onClick={() => handleDeleteWord(item.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                            title="حذف الكلمة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <p className="text-base font-bold text-slate-800 font-arabic">
                        {item.arabicMeaning}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                إجمالي {savedWords.length} كلمة محفوظة
              </span>
              <button
                onClick={() => setIsVocabModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal: Deleting Document */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">حذف الصفحة ومفرداتها؟</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              هل أنتِ متأكدة من رغبتكِ في مسح صفحة <span className="font-english font-semibold text-slate-800">"{activeDoc?.documentTitle}"</span> وكل الكلمات التي قمتِ بحفظها لها؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  stopSpeaking();
                  setPlayingSentenceIndex(null);
                  setPlayingWordId(null);
                  setIsRenaming(false);

                  const updatedDocs = documents.filter((doc) => doc.id !== activeDocId);
                  setDocuments(updatedDocs);

                  if (updatedDocs.length > 0) {
                    setActiveDocId(updatedDocs[0].id);
                  } else {
                    setActiveDocId('');
                  }

                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                نعم، مسح الصفحة
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal: Clearing Vocabs Only */}
      {showClearVocabConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookmarkCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">إفراغ قائمة المفردات؟</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              هل أنتِ متأكدة من رغبتكِ في مسح جميع الكلمات المحفوظة لهذه الصفحة فقط؟
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setDocuments((prev) =>
                    prev.map((doc) => {
                      if (doc.id === activeDocId) {
                        return { ...doc, savedWords: [] };
                      }
                      return doc;
                    })
                  );
                  setShowClearVocabConfirm(false);
                }}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                نعم، إفراغ الكلمات
              </button>
              <button
                onClick={() => setShowClearVocabConfirm(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom API Key Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">إعدادات مفتاح Gemini API</h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              إذا واجهتِ مشكلة في الترجمة خارج بيئة التطوير (مثل Vercel)، يمكنكِ إضافة مفتاح API الخاص بكِ مجاناً وسيقوم السيرفر باستخدامه فوراً لتحليل وقراءة كتبكِ بأعلى دقة وجودة.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">مفتاح الـ API الخاص بكِ:</label>
              <input
                type="password"
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <p className="text-[10px] text-slate-400 bg-slate-50 p-2.5 rounded-xl border border-slate-150 mb-5 leading-relaxed">
              💡 <strong>كيف تحصلين على مفتاح مجاني؟</strong><br />
              اذهبي لموقع <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-bold font-english">Google AI Studio</a>، واضغطي على <strong>Get API Key</strong> لتوليد مفتاح مجاني تماماً خلال ثوانٍ معدودة.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  if (customApiKey.trim()) {
                    localStorage.setItem('lingodoc_custom_api_key', customApiKey.trim());
                  } else {
                    localStorage.removeItem('lingodoc_custom_api_key');
                  }
                  setIsSettingsOpen(false);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                حفظ الإعدادات
              </button>
              <button
                onClick={() => {
                  setCustomApiKey('');
                  localStorage.removeItem('lingodoc_custom_api_key');
                  setIsSettingsOpen(false);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                مسح المفتاح
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Modal: Add New Study Page (Upload or Paste Text) */}
      {isAddPageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600 animate-pulse" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900">إضافة صفحة جديدة للدراسة</h3>
              </div>
              <button
                onClick={() => setIsAddPageModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              
              {/* Option 1: File / Camera Upload */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center">
                <span className="text-2xl mb-2">📸 / 📄</span>
                <h4 className="text-xs sm:text-sm font-bold text-slate-800 mb-1">الخيار الأول: تصوير صفحة كتاب أو لقطة شاشة</h4>
                <p className="text-[10px] sm:text-xs text-slate-500 mb-4 max-w-sm leading-relaxed">
                  التقطي صورة واضحة لصفحة كتابك الإنجليزي أو لقطة شاشة، وسيقوم الذكاء الاصطناعي باستخراج الكلمات والجمل فوراً.
                </p>
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>رفع صورة أو لقطة شاشة</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-4 text-[10px] font-bold text-slate-400 uppercase">أو (أدخلِ نص مباشرة)</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Option 2: Paste Direct Text */}
              <form onSubmit={handleTextSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    الخيار الثاني: لصق أو كتابة نص إنجليزي مباشرة ✍️
                  </label>
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="انسخي الفقرة الإنجليزية من أي مكان والصقيها هنا... (مثال: Once upon a time, there was a student...)"
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 p-3 text-xs sm:text-sm font-english leading-relaxed focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-left"
                    dir="ltr"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    عنوان الصفحة (اختياري)
                  </label>
                  <input
                    type="text"
                    value={pastedTitle}
                    onChange={(e) => setPastedTitle(e.target.value)}
                    placeholder="مثال: مقدمة كتاب إدارة المشاريع"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!pastedText.trim()}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>تحليل وترجمة النص المكتوب</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
