import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addKanji,
  exportDatabase,
  getDatabase,
  getKanjiByLiteral,
  getRadicals,
  importDatabaseFromFile,
  loginAdmin,
  recognizeDrawing,
  searchKanji,
} from '../api/kanjiRepository';
import type { GlobalFilters, Point, SearchCriteria } from '../types/kanji';
import type { KanjiDocument } from '../types/kanji';

export const defaultFilters: GlobalFilters = {
  strokeFrom: '',
  strokeTo: '',
  jlptLevels: [],
  hasAnimation: false,
};

export const useDatabaseQuery = () =>
  useQuery({
    queryKey: ['database'],
    queryFn: getDatabase,
  });

export const useKanjiSearchQuery = (criteria: SearchCriteria) =>
  useQuery({
    queryKey: ['kanji-search', criteria],
    queryFn: () => searchKanji(criteria),
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

export const useRecognitionQuery = (strokes: Point[][]) =>
  useQuery({
    queryKey: ['recognition', strokes],
    queryFn: () => recognizeDrawing(strokes),
    enabled: strokes.length > 0,
  });

export const useExportMutation = () =>
  useMutation({
    mutationFn: exportDatabase,
  });

export const useImportMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importDatabaseFromFile,
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
    mutationFn: (kanji: KanjiDocument) => addKanji(kanji),
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
  });
};
