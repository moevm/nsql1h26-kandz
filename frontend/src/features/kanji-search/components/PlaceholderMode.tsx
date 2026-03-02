interface PlaceholderModeProps {
  title: string;
}

const PlaceholderMode = ({ title }: PlaceholderModeProps) => (
  <div className="flex h-full items-center justify-center p-6">
    <div className="rounded border bg-white px-6 py-4 text-center shadow-sm">
      <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">Mode</p>
      <p className="mt-2 text-lg font-bold">{title}</p>
      <p className="mt-1 text-sm text-gray-500">Coming soon</p>
    </div>
  </div>
);

export default PlaceholderMode;