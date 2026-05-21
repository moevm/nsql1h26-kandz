import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addKanji,
  exportDatabase,
  getChartData,
  getKanjiByLiteral,
  getRadicalGroups,
  getRadicals,
  importDatabaseFromFile,
  loginAdmin,
  recognizeDrawing,
  searchKanji,
  searchKanjiPage,
  updateKanji,
} from '../api/kanjiRepository';
import type { ChartXAxis, ChartYAxis, GlobalFilters, Point, RadicalGrouping, SearchCriteria, SortOrder } from '../types/kanji';
import type { KanjiDocument } from '../types/kanji';

export const defaultFilters: GlobalFilters = {
  strokeFrom: '',
  strokeTo: '',
  jlptLevels: [],
  gradeLevels: [],
  freqFrom: '',
  freqTo: '',
  wordsFrom: '',
  wordsTo: '',
  examplesFrom: '',
  examplesTo: '',
  radicalsFrom: '',
  radicalsTo: '',
  readingsFrom: '',
  readingsTo: '',
  hasAnimation: false,
};

export const useKanjiSearchQuery = (criteria: SearchCriteria) =>
  useQuery({
    queryKey: ['kanji-search', criteria],
    queryFn: () => searchKanji(criteria),
  });

export const useKanjiSearchPageQuery = (criteria: SearchCriteria, page: number, pageSize: number, enabled = true) =>
  useQuery({
    queryKey: ['kanji-search-page', criteria, page, pageSize],
    queryFn: () => searchKanjiPage(criteria, page, pageSize),
    enabled,
    placeholderData: keepPreviousData,
  });

export const useKanjiDetailQuery = (literal: string | undefined) =>
  useQuery({
    queryKey: ['kanji-detail', literal],
    queryFn: () => getKanjiByLiteral(literal ?? ''),
    enabled: Boolean(literal),
  });

export const useRadicalsQuery = () =>
  useQuery({
    queryKey: ['radicals'],
    queryFn: getRadicals,
  });

export const useRadicalGroupsQuery = (groupBy: RadicalGrouping, order: SortOrder, enabled = true) =>
  useQuery({
    queryKey: ['radical-groups', groupBy, order],
    queryFn: () => getRadicalGroups(groupBy, order),
    enabled,
  });

export const useRecognitionQuery = (strokes: Point[][]) =>
  useQuery({
    queryKey: ['recognition', strokes],
    queryFn: () => recognizeDrawing(strokes),
    enabled: strokes.length > 0,
  });

export const useFilteredRecognitionQuery = (strokes: Point[][], filters: GlobalFilters) =>
  useQuery({
    queryKey: ['recognition', strokes, filters],
    queryFn: () => recognizeDrawing(strokes, filters),
    enabled: strokes.length > 0,
  });

export const useChartQuery = (criteria: SearchCriteria, xAxis: ChartXAxis, yAxis: ChartYAxis) =>
  useQuery({
    queryKey: ['kanji-chart', criteria, xAxis, yAxis],
    queryFn: () => getChartData(criteria, xAxis, yAxis),
  });

export const useExportMutation = () =>
  useMutation({
    mutationFn: exportDatabase,
  });

export const useImportMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, token }: { file: File; token: string }) =>
      importDatabaseFromFile(file, token),
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
  });
};

export const useAdminLoginMutation = () =>
  useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      loginAdmin(username, password),
  });

export const useAddKanjiMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ kanji, token }: { kanji: KanjiDocument; token: string }) => addKanji(kanji, token),
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
  });
};

export const useUpdateKanjiMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ literal, kanji }: { literal: string; kanji: KanjiDocument }) =>
      updateKanji(literal, kanji),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['kanji-detail', variables.literal] });
      void queryClient.invalidateQueries({ queryKey: ['kanji-search'] });
      void queryClient.invalidateQueries({ queryKey: ['kanji-search-page'] });
      void queryClient.invalidateQueries({ queryKey: ['radicals'] });
    },
  });
};
