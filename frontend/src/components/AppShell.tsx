import { useState } from 'react';
import { Download, FileJson, Menu, Search, SlidersHorizontal } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { defaultFilters, useExportMutation } from '../hooks/useKanjiQueries';
import type { GlobalFilters } from '../types/kanji';
import FilterDrawer from './FilterDrawer';
import ImportDialog from './ImportDialog';

export interface AppOutletContext {
  filters: GlobalFilters;
  openFilters: () => void;
}

const navItems = [
  { to: '/search/canvas', label: 'Draw' },
  { to: '/search/radicals', label: 'Radicals' },
  { to: '/search/strokes', label: 'Strokes' },
  { to: '/search/school', label: 'School' },
  { to: '/data', label: 'Data' },
];

const AppShell = () => {
  const [filters, setFilters] = useState(defaultFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [toast, setToast] = useState('');
  const exportMutation = useExportMutation();

  const handleExport = async () => {
    await exportMutation.mutateAsync();
    setToast('Экспорт JSON начат.');
  };

  const appliedFilterCount =
    Number(Boolean(filters.strokeFrom)) +
    Number(Boolean(filters.strokeTo)) +
    Number(filters.hasAnimation) +
    filters.jlptLevels.length;

  return (
    <div className="app-shell">
      <header className="top-app-bar">
        <div className="brand-lockup">
          <button className="icon-button mobile-only" type="button" aria-label="Открыть фильтры" onClick={() => setFilterOpen(true)}>
            <Menu size={20} />
          </button>
          <NavLink to="/search/canvas" className="brand-mark" aria-label="KanjiLookup prototype">
            漢
          </NavLink>
          <div>
            <strong>KanjiLookup</strong>
            <span>учебный прототип</span>
          </div>
        </div>

        <nav className="mode-nav" aria-label="Режимы поиска">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="top-actions">
          <button className="tonal-button" type="button" onClick={() => setFilterOpen(true)}>
            <SlidersHorizontal size={18} />
            Filters
            {appliedFilterCount > 0 ? <span className="badge">{appliedFilterCount}</span> : null}
          </button>
          <button className="text-button" type="button" onClick={handleExport} disabled={exportMutation.isPending}>
            <Download size={18} />
            Export
          </button>
          <button className="filled-button" type="button" onClick={() => setImportOpen(true)}>
            <FileJson size={18} />
            Import
          </button>
        </div>
      </header>

      <main className="app-main">
        <Outlet context={{ filters, openFilters: () => setFilterOpen(true) } satisfies AppOutletContext} />
      </main>

      <nav className="bottom-nav" aria-label="Основная навигация">
        {navItems.slice(0, 4).map((item) => (
          <NavLink key={item.to} to={item.to}>
            <Search size={16} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <FilterDrawer
        key={JSON.stringify(filters)}
        open={filterOpen}
        filters={filters}
        onApply={(nextFilters) => {
          setFilters(nextFilters);
          setFilterOpen(false);
        }}
        onClose={() => setFilterOpen(false)}
      />

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(message) => setToast(message)}
      />

      {toast ? (
        <div className="snackbar" role="status" onAnimationEnd={() => setToast('')}>
          {toast}
        </div>
      ) : null}
    </div>
  );
};

export default AppShell;
