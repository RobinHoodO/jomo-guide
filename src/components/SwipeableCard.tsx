import { useCallback, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from 'react';

// Deliberately duplicates SwipeableEventCard: Program needs its memoised EventCard hot path,
// while Missions needs the same gestures around a different card.
const DRAG_START_PX = 12;
const TRIGGER_PX = 80;
const MAX_EASE_PX = 120;
const EXIT_MS = 200;

type SwipeableCardProps = {
  children: ReactNode;
  onHide: () => void;
  onSwipeFavorite: () => void;
};

export function SwipeableCard({ children, onHide, onSwipeFavorite }: SwipeableCardProps) {
  const [dx, setDx] = useState(0);
  const [isLeaving, setIsLeaving] = useState(false);
  const start = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const isDragging = useRef(false);
  const suppressClick = useRef(false);

  const startHide = useCallback(() => {
    setIsLeaving(true);
    window.setTimeout(onHide, EXIT_MS);
  }, [onHide]);

  const handlePointerDown = (pointerEvent: PointerEvent<HTMLDivElement>) => {
    if (isLeaving) return;
    if (pointerEvent.pointerType === 'mouse' && pointerEvent.button !== 0) return;
    start.current = { x: pointerEvent.clientX, y: pointerEvent.clientY, pointerId: pointerEvent.pointerId };
    isDragging.current = false;
    suppressClick.current = false;
  };

  const handlePointerMove = (pointerEvent: PointerEvent<HTMLDivElement>) => {
    if (!start.current || pointerEvent.pointerId !== start.current.pointerId || isLeaving) return;
    const deltaX = pointerEvent.clientX - start.current.x;
    const deltaY = pointerEvent.clientY - start.current.y;

    if (!isDragging.current) {
      if (Math.abs(deltaX) < DRAG_START_PX || Math.abs(deltaX) < Math.abs(deltaY) * 1.4) return;
      isDragging.current = true;
      suppressClick.current = true;
      pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
    }

    const distance = Math.abs(deltaX);
    const eased = distance > MAX_EASE_PX ? MAX_EASE_PX + (distance - MAX_EASE_PX) * 0.35 : distance;
    setDx(Math.sign(deltaX) * eased);
  };

  const handlePointerEnd = (pointerEvent: PointerEvent<HTMLDivElement>) => {
    if (!start.current || pointerEvent.pointerId !== start.current.pointerId) return;
    start.current = null;
    if (!isDragging.current) return;
    isDragging.current = false;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);

    if (dx <= -TRIGGER_PX) {
      startHide();
    } else {
      if (dx >= TRIGGER_PX) onSwipeFavorite();
      setDx(0);
    }
  };

  const handlePointerCancel = () => {
    start.current = null;
    isDragging.current = false;
    suppressClick.current = false;
    setDx(0);
  };

  const handleClickCapture = (clickEvent: MouseEvent<HTMLDivElement>) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
  };

  const cardStyle = isLeaving
    ? { transform: 'translateX(-110%)', opacity: 0, transition: `transform ${EXIT_MS}ms ease-in, opacity ${EXIT_MS}ms ease-in` }
    : {
        transform: dx ? `translateX(${dx}px)` : undefined,
        transition: isDragging.current ? 'none' : 'transform 0.18s ease'
      };

  const showUnder = dx !== 0 || isLeaving;

  return (
    <div
      className="swipe-wrap"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerCancel}
      onClickCapture={handleClickCapture}
    >
      {showUnder ? (
        <div
          aria-hidden="true"
          className={`swipe-under ${dx > 0 ? 'is-favorite' : 'is-hide'}`}
          style={{ opacity: isLeaving ? 1 : Math.min(Math.abs(dx) / TRIGGER_PX, 1) }}
        >
          {dx > 0 ? <span>⭐ Favourite</span> : <span>🙈 Hide</span>}
        </div>
      ) : null}
      <div className="swipe-card" style={cardStyle}>
        {children}
      </div>
    </div>
  );
}
