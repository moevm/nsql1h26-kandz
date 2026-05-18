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
  usage_count?: number;
}

export type RadicalGrouping = 'strokes' | 'usage';
export type SortOrder = 'asc' | 'desc';

export interface RadicalGroup {
  id: string;
  label: string;
  min: number;
  max: number;
  count: number;
  radicals: RadicalDocument[];
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

export interface KanjiPage {
  items: KanjiDocument[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface RecognitionCandidate {
  kanji: KanjiDocument;
  score: number;
}

export type SearchMode = 'canvas' | 'radicals';

export interface GlobalFilters {
  strokeFrom: string;
  strokeTo: string;
  jlptLevels: string[];
  gradeLevels: string[];
  freqFrom: string;
  freqTo: string;
  wordsFrom: string;
  wordsTo: string;
  examplesFrom: string;
  examplesTo: string;
  radicalsFrom: string;
  radicalsTo: string;
  readingsFrom: string;
  readingsTo: string;
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

export interface KanjiTableFilters {
  literal: string;
  meaning: string;
  radical: string;
  strokeCount: string;
  grade: string;
  jlpt: string;
}

export type ChartXAxis = 'jlpt' | 'stroke_count' | 'grade' | 'radical_top';
export type ChartYAxis = 'count' | 'avg_freq' | 'avg_words' | 'avg_examples' | 'avg_radicals' | 'avg_readings' | 'avg_strokes';

export interface ChartBucket {
  label: number | string | null;
  value: number;
  count: number;
}
