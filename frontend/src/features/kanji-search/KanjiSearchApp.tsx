import { useState } from 'react';
import CanvasMode from './components/CanvasMode';
import CharacterDetail from './components/CharacterDetail';
import Header from './components/Header';
import KankenMode from './components/KankenMode';
import PlaceholderMode from './components/PlaceholderMode';
import RadicalMode from './components/RadicalMode';
import SearchTabs from './components/SearchTabs';
import type { SearchMode } from './types';

const KanjiSearchApp = () => {
  const [mode, setMode] = useState<SearchMode>('Canvas');
  const [selectedKanji, setSelectedKanji] = useState<string | null>(null);

  return (
    <div className="mx-auto flex h-screen max-w-2xl flex-col border-x bg-white font-sans text-[#333] shadow-md">
      <Header />
      <SearchTabs mode={mode} onModeChange={setMode} />

      <main className="flex flex-1 flex-col overflow-hidden bg-[#eee]">
        {mode === 'Canvas' && <CanvasMode onSelectKanji={setSelectedKanji} />}
        {mode === 'Radical' && <RadicalMode />}
        {mode === 'Kanken' && <KankenMode />}
        {mode === 'Strokes' && <PlaceholderMode title="Strokes" />}
        {mode === 'School' && <PlaceholderMode title="School" />}
      </main>

      <CharacterDetail selectedKanji={selectedKanji} onClose={() => setSelectedKanji(null)} />
    </div>
  );
};

export default KanjiSearchApp;