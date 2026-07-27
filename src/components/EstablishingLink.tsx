import { useEffect, useMemo, useState } from 'react';

type EstablishingLinkProps = {
  open: boolean;
  onClose: () => void;
  count?: number;
};

const LINE_INTERVAL_MS = 500;
const FINAL_LINE_HOLD_MS = 900;

function ordinal(value: number) {
  const remainder = value % 100;
  if (remainder >= 11 && remainder <= 13) return `${value}th`;

  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

export function EstablishingLink({ open, onClose, count }: EstablishingLinkProps) {
  const lines = useMemo(() => {
    const handshake = ['listening…', 'signal found', 'opening channel'];
    if (typeof count === 'number' && Number.isFinite(count) && count > 0) {
      handshake.push(`you are the ${ordinal(count)} down here`);
    }
    return handshake;
  }, [count]);
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (!open) {
      setVisibleLines(0);
      return;
    }

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setVisibleLines(lines.length);
      const dismissTimer = window.setTimeout(onClose, FINAL_LINE_HOLD_MS);
      return () => window.clearTimeout(dismissTimer);
    }

    setVisibleLines(1);
    const lineTimers = lines.slice(1).map((_, index) =>
      window.setTimeout(() => setVisibleLines(index + 2), LINE_INTERVAL_MS * (index + 1))
    );
    const dismissTimer = window.setTimeout(onClose, LINE_INTERVAL_MS * (lines.length - 1) + FINAL_LINE_HOLD_MS);

    return () => {
      lineTimers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(dismissTimer);
    };
  }, [lines, onClose, open]);

  if (!open) return null;

  return (
    <div className="establishing-link" role="dialog" aria-live="polite" onPointerDown={onClose}>
      <div className="establishing-link-terminal">
        {lines.slice(0, visibleLines).map((line) => (
          <p key={line} className="establishing-link-line">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
