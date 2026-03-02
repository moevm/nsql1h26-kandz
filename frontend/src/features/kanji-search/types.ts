export type SearchMode = 'Canvas' | 'Radical' | 'Strokes' | 'School' | 'Kanken';

export interface KanjiWord {
  value: string;
  meaning: string;
}

export interface KanjiEntry {
  symbol: string;
  reading: string;
  meaning: string;
  words: KanjiWord[];
}