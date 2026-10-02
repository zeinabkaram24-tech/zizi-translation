export interface VocabularyItem {
  word: string;
  arabicMeaning: string;
  partOfSpeech?: string;
  phonetic?: string;
}

export interface Sentence {
  sentenceIndex: number;
  english: string;
  contextualTranslation: string;
  literalTranslation: string;
  linguisticNote?: string;
  vocabulary?: VocabularyItem[];
}

export interface DocumentPage {
  pageNumber: number;
  pageTitle?: string;
  sentences: Sentence[];
}

export interface DocumentAnalysis {
  documentTitle: string;
  overviewSummary: string;
  totalSentences: number;
  fullTextWithFormatting?: string;
  pages: DocumentPage[];
}

export interface SavedWord {
  id: string;
  word: string;
  arabicMeaning: string;
  partOfSpeech?: string;
  phonetic?: string;
  sentenceContext: string;
  pageNumber: number;
  savedAt: string;
  notes?: string;
  mastered?: boolean;
}

export interface WordDefinitionResponse {
  word: string;
  lemma?: string;
  arabicMeaning: string;
  partOfSpeech: string;
  phonetic?: string;
  explanation?: string;
  exampleEnglish?: string;
  exampleArabic?: string;
}
