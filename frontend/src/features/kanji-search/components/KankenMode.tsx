import { KANKEN_LEVELS } from '../constants';

const KankenMode = () => (
  <div className="space-y-2 overflow-y-auto p-4">
    {KANKEN_LEVELS.map((level) => (
      <button
        key={level}
        className="flex w-full items-center justify-between rounded border bg-white p-3 shadow-sm"
      >
        <span className="text-sm font-bold">Kanken Level {level}</span>
        <span className="text-xs text-gray-400">80 chars</span>
      </button>
    ))}
  </div>
);

export default KankenMode;