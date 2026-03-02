import { SEARCH_MODES } from '../constants';
import type { SearchMode } from '../types';

interface SearchTabsProps {
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
}

const SearchTabs = ({ mode, onModeChange }: SearchTabsProps) => (
  <nav className="flex overflow-x-auto border-b bg-white no-scrollbar">
    {SEARCH_MODES.map((item) => (
      <button
        key={item}
        onClick={() => onModeChange(item)}
        className={`flex-none px-4 py-3 text-[10px] font-black tracking-wider uppercase transition-all ${
          mode === item ? 'border-b-4 border-black text-black' : 'text-gray-400'
        }`}
      >
        {item}
      </button>
    ))}
  </nav>
);

export default SearchTabs;