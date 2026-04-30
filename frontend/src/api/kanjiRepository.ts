import axios from 'axios';
import type {
  GlobalFilters,
  KanjiDatabase,
  KanjiDocument,
  Point,
  RecognitionCandidate,
  SearchCriteria,
} from '../types/kanji';

const STORAGE_KEY = 'kandz-kanji-database-v2';
const SEED_URL = '/kanji-db.json';

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalize = (value: string) => value.trim().toLowerCase();

const readStoredDatabase = () => {
  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as KanjiDatabase;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

const persistDatabase = (database: KanjiDatabase) => {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...database, updated_at: new Date().toISOString() }),
  );
};

const validateDatabase = (value: unknown): KanjiDatabase => {
  if (!isRecord(value) || !Array.isArray(value.kanji) || !Array.isArray(value.radicals)) {
    throw new Error('Файл должен содержать коллекции kanji и radicals.');
  }

  const database = value as unknown as KanjiDatabase;
  const hasBrokenKanji = database.kanji.some(
    (item) =>
      !isRecord(item) ||
      typeof item.literal !== 'string' ||
      !Array.isArray(item.meanings) ||
      !Array.isArray(item.radicals),
  );

  const hasBrokenRadicals = database.radicals.some(
    (item) =>
      !isRecord(item) ||
      typeof item._id !== 'string' ||
      !Array.isArray(item.kanji_list) ||
      typeof item.stroke_count !== 'number',
  );

  if (hasBrokenKanji || hasBrokenRadicals) {
    throw new Error('Структура JSON не соответствует модели данных kanji/radicals.');
  }

  return {
    updated_at: database.updated_at ?? new Date().toISOString(),
    kanji: database.kanji,
    radicals: database.radicals,
    users: Array.isArray(database.users) ? database.users : [],
  };
};

export const resetDatabaseCache = () => {
  window.localStorage.removeItem(STORAGE_KEY);
};

export const getDatabase = async () => {
  const stored = readStoredDatabase();

  if (stored) {
    return stored;
  }

  const response = await axios.get<KanjiDatabase>(SEED_URL);
  const database = validateDatabase(response.data);
  persistDatabase(database);
  return database;
};

const matchesGlobalFilters = (kanji: KanjiDocument, filters?: GlobalFilters) => {
  if (!filters) {
    return true;
  }

  const from = Number(filters.strokeFrom);
  const to = Number(filters.strokeTo);
  const hasFrom = filters.strokeFrom.trim().length > 0 && Number.isFinite(from);
  const hasTo = filters.strokeTo.trim().length > 0 && Number.isFinite(to);
  const strokeCount = kanji.stroke_count ?? 0;

  if (hasFrom && strokeCount < from) {
    return false;
  }

  if (hasTo && strokeCount > to) {
    return false;
  }

  if (filters.hasAnimation && !kanji.kvg) {
    return false;
  }

  if (filters.jlptLevels.length > 0) {
    const current = kanji.jlpt === null ? 'none' : String(kanji.jlpt);

    if (!filters.jlptLevels.includes(current)) {
      return false;
    }
  }

  return true;
};

const matchesText = (kanji: KanjiDocument, text?: string) => {
  const query = normalize(text ?? '');

  if (!query) {
    return true;
  }

  return [
    kanji.literal,
    kanji.unicode,
    ...kanji.meanings,
    ...kanji.readings.on,
    ...kanji.readings.kun,
    ...kanji.readings.nanori,
    ...kanji.words.flatMap((word) => [word.word, word.reading, ...word.meanings]),
  ].some((value) => normalize(value).includes(query));
};

const byFrequency = (left: KanjiDocument, right: KanjiDocument) =>
  (left.freq ?? Number.MAX_SAFE_INTEGER) - (right.freq ?? Number.MAX_SAFE_INTEGER);

export const searchKanji = async (criteria: SearchCriteria = {}) => {
  const database = await getDatabase();

  return database.kanji
    .filter((kanji) => matchesText(kanji, criteria.text))
    .filter((kanji) => matchesGlobalFilters(kanji, criteria.filters))
    .filter((kanji) =>
      criteria.radicals?.length
        ? criteria.radicals.every((radical) => kanji.radicals.includes(radical))
        : true,
    )
    .filter((kanji) =>
      criteria.strokeCount === null || criteria.strokeCount === undefined
        ? true
        : kanji.stroke_count === criteria.strokeCount,
    )
    .filter((kanji) =>
      criteria.grade === null || criteria.grade === undefined ? true : kanji.grade === criteria.grade,
    )
    .filter((kanji) =>
      criteria.jlpt === null || criteria.jlpt === undefined ? true : kanji.jlpt === criteria.jlpt,
    )
    .sort(byFrequency);
};

export const getKanjiByLiteral = async (literal: string) => {
  const database = await getDatabase();
  const kanji = database.kanji.find((item) => item.literal === literal);

  if (!kanji) {
    throw new Error('Иероглиф не найден в базе данных.');
  }

  return kanji;
};

export const getRadicals = async () => {
  const database = await getDatabase();
  return [...database.radicals].sort((left, right) => left.stroke_count - right.stroke_count);
};

export const recognizeDrawing = async (strokes: Point[][]) => {
  const pointCount = strokes.reduce((total, stroke) => total + stroke.length, 0);

  if (strokes.length === 0 || pointCount < 2) {
    return [];
  }

  await wait(420);

  const database = await getDatabase();
  const expectedStrokeCount = Math.max(3, Math.min(16, strokes.length * 3 + Math.round(pointCount / 32)));

  return database.kanji
    .map<RecognitionCandidate>((kanji, index) => {
      const strokePenalty = Math.abs((kanji.stroke_count ?? expectedStrokeCount) - expectedStrokeCount) * 5;
      const frequencyBonus = kanji.freq ? Math.max(0, 10 - Math.floor(kanji.freq / 300)) : 0;
      const score = Math.max(42, 96 - strokePenalty + frequencyBonus - index);

      return { kanji, score };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 6);
};

export const exportDatabase = async () => {
  const database = await getDatabase();
  const blob = new Blob([JSON.stringify(database, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `kanji-database-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const importDatabaseFromFile = async (file: File) => {
  const text = await file.text();
  const database = validateDatabase(JSON.parse(text));
  persistDatabase(database);
  return database;
};

export const addKanji = async (kanji: KanjiDocument) => {
  const database = await getDatabase();

  if (database.kanji.some((item) => item.literal === kanji.literal)) {
    throw new Error('Такой иероглиф уже есть в базе.');
  }

  const nextDatabase: KanjiDatabase = {
    ...database,
    kanji: [...database.kanji, kanji],
    radicals: database.radicals.map((radical) =>
      kanji.radicals.includes(radical._id)
        ? { ...radical, kanji_list: [...new Set([...radical.kanji_list, kanji.literal])] }
        : radical,
    ),
  };

  const knownRadicals = new Set(nextDatabase.radicals.map((radical) => radical._id));
  const missingRadicals = kanji.radicals
    .filter((radical) => !knownRadicals.has(radical))
    .map((radical) => ({
      _id: radical,
      kanji_list: [kanji.literal],
      stroke_count: 1,
      meaning: 'custom',
    }));

  const withRadicals = { ...nextDatabase, radicals: [...nextDatabase.radicals, ...missingRadicals] };
  persistDatabase(withRadicals);
  return kanji;
};

export const loginAdmin = async (username: string, password: string) => {
  const database = await getDatabase();
  const user = database.users.find((item) => item.username === username);

  await wait(220);

  if (!user || user.password !== password) {
    throw new Error('Неверный логин или пароль администратора.');
  }

  return { username: user.username };
};
