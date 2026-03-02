import type { KanjiEntry, SearchMode } from './types';

export const SEARCH_MODES: SearchMode[] = ['Canvas', 'Radical', 'Strokes', 'School', 'Kanken'];

export const RADICALS = ['人', '口', '土', '女', '子', '寸', '小', '尸', '山', '川', '工', '己'];

export const KANKEN_LEVELS = [10, 9, 8, 7, 6, 5, 4, 3];

export const KANJI_ENTRIES: KanjiEntry[] = [
  {
    symbol: '食',
    reading: 'しょく',
    meaning: 'eat',
    words: [
      { value: '食事 【しょくじ】', meaning: 'meal' },
      { value: '食堂 【しょくどう】', meaning: 'dining hall' },
    ],
  },
  {
    symbol: '舍',
    reading: 'しゃ',
    meaning: 'house',
    words: [
      { value: '宿舍 【しゅくしゃ】', meaning: 'dormitory' },
      { value: '田舍 【いなか】', meaning: 'countryside' },
    ],
  },
  {
    symbol: '全',
    reading: 'ぜん',
    meaning: 'whole',
    words: [
      { value: '安全 【あんぜん】', meaning: 'safety' },
      { value: '全部 【ぜんぶ】', meaning: 'all' },
    ],
  },
  {
    symbol: '金',
    reading: 'かね / キン',
    meaning: 'gold',
    words: [
      { value: '金融 【きんゆう】', meaning: 'financing' },
      { value: '料金 【りょうきん】', meaning: 'fee' },
    ],
  },
  {
    symbol: '人',
    reading: 'ひと / ジン',
    meaning: 'person',
    words: [
      { value: '人気 【にんき】', meaning: 'popularity' },
      { value: '人生 【じんせい】', meaning: 'life' },
    ],
  },
];

export const getKanjiBySymbol = (symbol: string) =>
  KANJI_ENTRIES.find((entry) => entry.symbol === symbol) ?? KANJI_ENTRIES[0];