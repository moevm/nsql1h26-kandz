import { ChevronLeft } from 'lucide-react';
import { getKanjiBySymbol } from '../constants';

interface CharacterDetailProps {
  selectedKanji: string | null;
  onClose: () => void;
}

const CharacterDetail = ({ selectedKanji, onClose }: CharacterDetailProps) => {
  if (!selectedKanji) {
    return null;
  }

  const entry = getKanjiBySymbol(selectedKanji);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white">
      <header className="flex items-center border-b p-3">
        <button onClick={onClose} className="p-1">
          <ChevronLeft size={24} />
        </button>
        <h2 className="flex-1 text-center text-sm font-bold uppercase">Character Information</h2>
        <div className="w-8" />
      </header>
      <div className="overflow-y-auto p-6">
        <div className="mb-8 flex items-center gap-8 border-b pb-8">
          <span className="text-9xl leading-none font-serif">{entry.symbol}</span>
          <div>
            <p className="font-bold text-blue-600">{entry.reading}</p>
            <p className="text-2xl font-black tracking-tighter italic uppercase">{entry.meaning}</p>
          </div>
        </div>
        <section className="space-y-4">
          <h3 className="border-b pb-1 text-[10px] font-black tracking-widest text-gray-400 uppercase">Words</h3>
          <div className="divide-y">
            {entry.words.map((word) => (
              <div key={word.value} className="flex items-center justify-between py-3 italic">
                <span className="text-xl font-medium">{word.value}</span>
                <span className="text-sm text-gray-500">{word.meaning}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default CharacterDetail;