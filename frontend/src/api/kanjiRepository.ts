import axios from 'axios';
import type { AxiosResponse } from 'axios';
import type {
  KanjiDatabase,
  KanjiDocument,
  KanjiPage,
  ChartBucket,
  ChartXAxis,
  ChartYAxis,
  Point,
  RadicalDocument,
  RadicalGroup,
  RadicalGrouping,
  RecognitionCandidate,
  SearchCriteria,
  SortOrder,
} from '../types/kanji';

const api = axios.create({
  baseURL: '/api',
});

const extractApiError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;

    if (typeof detail === 'string') {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail.map((item) => item.msg ?? String(item)).join('\n');
    }
  }

  return error instanceof Error ? error.message : 'Не удалось выполнить запрос к серверу.';
};

const request = async <T>(promise: Promise<AxiosResponse<T>>) => {
  try {
    return (await promise).data;
  } catch (error) {
    throw new Error(extractApiError(error));
  }
};

const numericParam = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const searchParams = (criteria: SearchCriteria = {}) => ({
  text: criteria.text?.trim() || undefined,
  radicals: criteria.radicals?.length ? criteria.radicals.join(',') : undefined,
  stroke_count: numericParam(criteria.strokeCount),
  grade: numericParam(criteria.grade),
  jlpt: numericParam(criteria.jlpt),
  stroke_from: numericParam(criteria.filters?.strokeFrom),
  stroke_to: numericParam(criteria.filters?.strokeTo),
  jlpt_levels: criteria.filters?.jlptLevels.length ? criteria.filters.jlptLevels.join(',') : undefined,
  grade_levels: criteria.filters?.gradeLevels.length ? criteria.filters.gradeLevels.join(',') : undefined,
  freq_from: numericParam(criteria.filters?.freqFrom),
  freq_to: numericParam(criteria.filters?.freqTo),
  words_from: numericParam(criteria.filters?.wordsFrom),
  words_to: numericParam(criteria.filters?.wordsTo),
  examples_from: numericParam(criteria.filters?.examplesFrom),
  examples_to: numericParam(criteria.filters?.examplesTo),
  radicals_from: numericParam(criteria.filters?.radicalsFrom),
  radicals_to: numericParam(criteria.filters?.radicalsTo),
  readings_from: numericParam(criteria.filters?.readingsFrom),
  readings_to: numericParam(criteria.filters?.readingsTo),
  has_animation: criteria.filters?.hasAnimation || undefined,
});

export const searchKanji = async (criteria: SearchCriteria = {}) =>
  request<KanjiDocument[]>(api.get('/search', { params: searchParams(criteria) }));

export const searchKanjiPage = async (criteria: SearchCriteria = {}, page: number, pageSize: number) =>
  request<KanjiPage>(
    api.get('/search/page', {
      params: {
        ...searchParams(criteria),
        page,
        page_size: pageSize,
      },
    }),
  );

export const getKanjiByLiteral = async (literal: string) =>
  request<KanjiDocument>(api.get(`/kanji/${encodeURIComponent(literal)}`));

export const getRadicals = async () => request<RadicalDocument[]>(api.get('/radicals'));

export const getRadicalGroups = async (groupBy: RadicalGrouping, order: SortOrder) =>
  request<RadicalGroup[]>(
    api.get('/radicals/groups', {
      params: {
        group_by: groupBy,
        order,
        buckets: 5,
      },
    }),
  );

export const recognizeDrawing = async (strokes: Point[][], filters?: SearchCriteria['filters']) =>
  request<RecognitionCandidate[]>(api.post('/recognize', { strokes, filters }));

export const getChartData = async (criteria: SearchCriteria, xAxis: ChartXAxis, yAxis: ChartYAxis) =>
  request<ChartBucket[]>(
    api.get('/charts', {
      params: {
        ...searchParams(criteria),
        x_axis: xAxis,
        y_axis: yAxis,
      },
    }),
  );

export const exportDatabase = async () => {
  try {
    const response = await api.get<Blob>('/export', { responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `kanji-database-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(extractApiError(error));
  }
};

export const importDatabaseFromFile = async (file: File, token: string) => {
  const formData = new FormData();
  formData.append('file', file);
  return request<KanjiDatabase>(
    api.post('/import', formData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );
};

export const addKanji = async (kanji: KanjiDocument, token: string) =>
  request<KanjiDocument>(
    api.post('/kanji', kanji, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );

export const updateKanji = async (literal: string, kanji: KanjiDocument) =>
  request<KanjiDocument>(api.put(`/kanji/${encodeURIComponent(literal)}`, kanji));

export const loginAdmin = async (username: string, password: string) =>
  request<{ username: string; access_token: string; token_type: string }>(
    api.post('/auth/login', { username, password }),
  );
