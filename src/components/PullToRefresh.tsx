import { type ReactNode, useEffect, useRef, useState } from 'react';
import { usePwaUpdate } from '../hooks/usePwaUpdate';

const MAX_PULL = 120;
const THRESHOLD = 70;
const RESET_DELAY = 1000;

type PullState = 'idle' | 'pulling' | 'refreshing' | 'done';

export function PullToRefresh({ children }: { children: ReactNode }) {
  const { applyUpdate, checkForUpdate } = usePwaUpdate();
  const [pullDistance, setPullDistance] = useState(0);
  const [pullState, setPullState] = useState<PullState>('idle');
  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const distanceRef = useRef(0);
  const refreshingRef = useRef(false);
  const resetTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    const reset = () => {
      if (cancelled) return;

      distanceRef.current = 0;
      pullingRef.current = false;
      setPullDistance(0);
      setPullState('idle');
    };

    const onTouchStart = (event: TouchEvent) => {
      if (refreshingRef.current || window.scrollY > 0 || event.touches.length !== 1) return;

      startYRef.current = event.touches[0].clientY;
      pullingRef.current = true;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!pullingRef.current || refreshingRef.current || event.touches.length !== 1) return;

      const delta = event.touches[0].clientY - startYRef.current;
      if (delta <= 0 || window.scrollY > 0) {
        reset();
        return;
      }

      const resisted = Math.min(delta * 0.5, MAX_PULL);
      distanceRef.current = resisted;
      setPullDistance(resisted);
      setPullState('pulling');
    };

    const onTouchEnd = () => {
      if (!pullingRef.current || refreshingRef.current) return;

      pullingRef.current = false;

      if (distanceRef.current < THRESHOLD) {
        reset();
        return;
      }

      refreshingRef.current = true;
      setPullDistance(THRESHOLD);
      setPullState('refreshing');

      void checkForUpdate().then((hasUpdate) => {
        if (cancelled) return;

        if (hasUpdate) {
          applyUpdate();
          return;
        }

        refreshingRef.current = false;
        distanceRef.current = 0;
        setPullDistance(0);
        setPullState('done');

        resetTimerRef.current = window.setTimeout(reset, RESET_DELAY);
      });
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', reset, { passive: true });

    return () => {
      cancelled = true;
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', reset);

      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, [applyUpdate, checkForUpdate]);

  const readyToRelease = pullDistance >= THRESHOLD;
  const label =
    pullState === 'refreshing'
      ? 'Checking for update'
      : pullState === 'done'
        ? "You're up to date ✓"
        : readyToRelease
          ? 'Release to update'
          : 'Pull to refresh';

  return (
    <div className="pull-to-refresh">
      <div
        className={`pull-to-refresh-indicator is-${pullState}`}
        style={{
          opacity: pullState === 'idle' ? 0 : Math.min(1, pullDistance / THRESHOLD),
          transform: `translate3d(-50%, ${pullState === 'done' ? 8 : pullDistance - 40}px, 0)`
        }}
        aria-hidden={pullState === 'idle'}
      >
        <span className="pull-to-refresh-spinner" aria-hidden="true" />
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}
