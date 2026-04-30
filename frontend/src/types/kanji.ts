export interface KanjiReadings {
  on: string[];
  kun: string[];
  nanori: string[];
}

export interface KanjiWord {
  word: string;
  reading: string;
  meanings: string[];
  pos: string[];
}

export interface ExampleSentence {
  japanese: string;
  english: string;
  source: string;
}

export interface KvgData {
  svg_path: string;
  stroke_paths?: string[];
}

export interface KanjiDocument {
  _id: string;
  literal: string;
  unicode: string;
  stroke_count: number | null;
  grade: number | null;
  jlpt: number | null;
  freq: number | null;
  readings: KanjiReadings;
  meanings: string[];
  radicals: string[];
  words: KanjiWord[];
  example_sentences: ExampleSentence[];
  kvg: KvgData | null;
}

export interface RadicalDocument {
  _id: string;
  kanji_list: string[];
  stroke_count: number;
  meaning: string | null;
}

export interface AdminUser {
  _id: string;
  username: string;
  password?: string;
  password_hash: string;
  created_at: string;
}

export interface KanjiDatabase {
  updated_at: string;
  kanji: KanjiDocument[];
  radicals: RadicalDocument[];
  users: AdminUser[];
}

export interface Point {
  x: number;
  y: number;
}

export interface RecognitionCandidate {
  kanji: KanjiDocument;
  score: number;
}

export type SearchMode = 'canvas' | 'radicals' | 'strokes' | 'school';

export interface GlobalFilters {
  strokeFrom: string;
  strokeTo: string;
  jlptLevels: string[];
  hasAnimation: boolean;
}

export interface SearchCriteria {
  text?: string;
  radicals?: string[];
  strokeCount?: number | null;
  grade?: number | null;
  jlpt?: number | null;
  filters?: GlobalFilters;
}
