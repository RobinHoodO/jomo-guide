import { memo, useCallback, useRef, useState, type PointerEvent, type MouseEvent } from 'react';
import { EventCard } from './EventCard';
import type { EventItem } from '../lib/events';

// Swipe right → favourite, swipe left → hide. Pointer events + touch-action:
// pan-y keep vertical scrolling native; no gesture library needed.
// Renders EventCard itself (instead of taking children) so memo works —
// the Program list mounts 1,200+ of these and search keystrokes must stay cheap.
const DRAG_START_PX = 12;
const TRIGGER_PX = 80;
const MAX_EASE_PX = 120;
const EXIT_MS = 200;

type SwipeableEventCardProps = {
  event: EventItem;
  isFavorite: boolean;
  isOccurrenceFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  onSelectGrid: (grid: string) => void;
  onSelectCamp: (campId: string) => void;
  onHide: (event: EventItem) => void;
  onSwipeFavorite: (event: EventItem) => void;
};

export const SwipeableEventCard = memo(function SwipeableEventCard({
  event,
  isFavorite,
  isOccurrenceFavorite,
  onToggleFavorite,
  onSelectGrid,
  onSelectCamp,
  onHide,
  onSwipeFavorite
}: SwipeableEventCardProps) {
  const [dx, setDx] = useState(0);
  const [isLeaving, setIsLeaving] = useState(false);
  const start = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const isDragging = useRef(false);
  const suppressClick = useRef(false);

  // Slide out, then commit the hide (the card unmounts once hidden).
  const startHide = useCallback(() => {
    setIsLeaving(true);
    window.setTimeout(() => onHide(event), EXIT_MS);
  }, [onHide, event]);

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
    // The click that follows pointerup gets eaten by handleClickCapture; if the
    // browser skips it after a real drag, clear the flag so keyboard clicks work.
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);

    if (dx <= -TRIGGER_PX) {
      startHide();
    } else {
      if (dx >= TRIGGER_PX) onSwipeFavorite(event);
      setDx(0);
    }
  };

  const handlePointerCancel = () => {
    start.current = null;
    isDragging.current = false;
    suppressClick.current = false;
    setDx(0);
  };

  // The browser fires a click after pointerup; keep a swipe from expanding the card.
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
        <EventCard
          event={event}
          isFavorite={isFavorite}
          isOccurrenceFavorite={isOccurrenceFavorite}
          onToggleFavorite={onToggleFavorite}
          onSelectGrid={onSelectGrid}
          onSelectCamp={onSelectCamp}
          onHide={startHide}
        />
      </div>
    </div>
  );
});
