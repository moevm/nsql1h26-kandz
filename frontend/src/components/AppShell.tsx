import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { BarChart3, Database, PencilLine, Puzzle } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { defaultFilters } from '../hooks/useKanjiQueries';
import type { GlobalFilters } from '../types/kanji';
import FilterPanel from './FilterPanel';

export interface AppOutletContext {
  filters: GlobalFilters;
  setFilters: Dispatch<SetStateAction<GlobalFilters>>;
  resetFilters: () => void;
  draftRadicals: string[];
  setDraftRadicals: Dispatch<SetStateAction<string[]>>;
  appliedRadicals: string[];
  setAppliedRadicals: Dispatch<SetStateAction<string[]>>;
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

const AppShell = () => {
  const [filters, setFilters] = useState(defaultFilters);
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [draftRadicals, setDraftRadicals] = useState<string[]>([]);
  const [appliedRadicals, setAppliedRadicals] = useState<string[]>([]);
  const [adminSession, setAdminSessionState] = useState({ username: '', token: '' });

  const resetFilters = () => setFilters(defaultFilters);
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
          onToggle={() => setFiltersCollapsed((value) => !value)}
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
