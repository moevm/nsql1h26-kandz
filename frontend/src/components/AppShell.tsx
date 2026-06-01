import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { BarChart3, Database, PencilLine, Puzzle } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { defaultFilters } from '../hooks/useKanjiQueries';
import type { GlobalFilters, Point } from '../types/kanji';
import FilterPanel from './FilterPanel';
import './AppShell.scss';

export interface AppOutletContext {
  filters: GlobalFilters;
  setFilters: Dispatch<SetStateAction<GlobalFilters>>;
  resetFilters: () => void;
  draftRadicals: string[];
  setDraftRadicals: Dispatch<SetStateAction<string[]>>;
  appliedRadicals: string[];
  setAppliedRadicals: Dispatch<SetStateAction<string[]>>;
  canvasStrokes: Point[][];
  setCanvasStrokes: Dispatch<SetStateAction<Point[][]>>;
  adminToken: string;
  adminName: string;
  setAdminSession: (username: string, token: string) => void;
  clearAdminSession: () => void;
}

const navItems = [
  { to: '/search/canvas', label: 'Рисунок', icon: PencilLine },
  { to: '/search/radicals', label: 'Радикалы', icon: Puzzle },
  { to: '/charts', label: 'Диаграммы', icon: BarChart3 },
  { to: '/data', label: 'Данные', icon: Database },
];

const filtersCollapsedStorageKey = 'kandz.filtersCollapsed';
const canvasStrokesStorageKey = 'kandz.canvasStrokes';

const isPoint = (value: unknown): value is Point => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const point = value as Partial<Point>;
  return typeof point.x === 'number' && typeof point.y === 'number';
};

const readCanvasStrokes = (): Point[][] => {
  try {
    const savedValue = window.localStorage.getItem(canvasStrokesStorageKey);
    const parsed = savedValue ? JSON.parse(savedValue) : [];

    return Array.isArray(parsed)
      ? parsed.filter((stroke): stroke is Point[] => Array.isArray(stroke) && stroke.every(isPoint))
      : [];
  } catch {
    return [];
  }
};

const AppShell = () => {
  const [filters, setFilters] = useState(defaultFilters);
  const [filtersCollapsed, setFiltersCollapsed] = useState(() => {
    try {
      const savedValue = window.localStorage.getItem(filtersCollapsedStorageKey);
      return savedValue === null ? true : savedValue === 'true';
    } catch {
      return true;
    }
  });
  const [draftRadicals, setDraftRadicals] = useState<string[]>([]);
  const [appliedRadicals, setAppliedRadicals] = useState<string[]>([]);
  const [canvasStrokes, setCanvasStrokes] = useState<Point[][]>(() => readCanvasStrokes());
  const [adminSession, setAdminSessionState] = useState({ username: '', token: '' });

  useEffect(() => {
    try {
      window.localStorage.setItem(canvasStrokesStorageKey, JSON.stringify(canvasStrokes));
    } catch {
      // Drawing should stay usable even if persistent storage is unavailable.
    }
  }, [canvasStrokes]);

  const resetFilters = () => setFilters(defaultFilters);
  const toggleFiltersCollapsed = () => {
    setFiltersCollapsed((current) => {
      const nextValue = !current;

      try {
        window.localStorage.setItem(filtersCollapsedStorageKey, String(nextValue));
      } catch {
        // Ignore storage failures: the toggle itself should still work.
      }

      return nextValue;
    });
  };
  const setAdminSession = (username: string, token: string) => {
    setAdminSessionState({ username, token });
  };
  const clearAdminSession = () => {
    setAdminSessionState({ username: '', token: '' });
  };

  return (
    <div className="app-shell">
      <header className="top-app-bar">
        <div className="brand-lockup">
          <NavLink to="/search/canvas" className="brand-mark" aria-label="KanjiLookup">
            漢
          </NavLink>
          <div>
            <strong>KanjiLookup</strong>
            <span>поиск и разбор кандзи</span>
          </div>
        </div>

        <nav className="mode-nav" aria-label="Основная навигация">
          {navItems.map(({ icon: Icon, ...item }) => (
            <NavLink key={item.to} to={item.to}>
              <Icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </header>

      <div className={filtersCollapsed ? 'workspace-layout filters-collapsed' : 'workspace-layout'}>
        <main className="app-main">
          <Outlet
            context={{
              filters,
              setFilters,
              resetFilters,
              draftRadicals,
              setDraftRadicals,
              appliedRadicals,
              setAppliedRadicals,
              canvasStrokes,
              setCanvasStrokes,
              adminToken: adminSession.token,
              adminName: adminSession.username,
              setAdminSession,
              clearAdminSession,
            } satisfies AppOutletContext}
          />
        </main>

        <FilterPanel
          collapsed={filtersCollapsed}
          filters={filters}
          onChange={setFilters}
          onReset={resetFilters}
          onToggle={toggleFiltersCollapsed}
        />
      </div>

      <nav className="bottom-nav" aria-label="Основная навигация">
        {navItems.map(({ icon: Icon, ...item }) => (
          <NavLink key={item.to} to={item.to}>
            <Icon size={17} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default AppShell;
