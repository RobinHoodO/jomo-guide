type MissingOutCounterProps = {
  total: number;
  favorites: number;
};

export function MissingOutCounter({ total, favorites }: MissingOutCounterProps) {
  const missing = Math.max(0, total - favorites);
  return (
    <p className="text-sm text-cream">
      You're happily missing <span className="font-black text-yellow">{missing.toLocaleString()}</span>{' '}
      other things.
    </p>
  );
}
