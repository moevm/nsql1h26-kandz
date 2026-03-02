import { RADICALS } from '../constants';

const RadicalMode = () => (
  <div className="grid grid-cols-6 gap-px overflow-y-auto bg-gray-300 p-1">
    {RADICALS.map((radical) => (
      <button
        key={radical}
        className="aspect-square bg-white text-xl hover:bg-gray-50"
      >
        {radical}
      </button>
    ))}
  </div>
);

export default RadicalMode;