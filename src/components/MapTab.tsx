import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { EventCard } from './EventCard';
import {
  FREE_FLOATING_EVENTS,
  FREE_FLOATING_EVENT_COUNT,
  GRID_BOUNDS,
  MAP_CELLS,
  MAP_CELLS_BY_CODE,
  MAP_COLUMNS,
  MAP_NEIGHBORHOODS,
  MAP_ROWS,
  groupByDay,
  parseGridCode,
  type MapCell
} from '../lib/events';
import { canonicalCell, latLonToGrid, type GridPosition } from '../lib/geo';
import { isUnlocked, matchesSecretCell, unlock } from '../lib/hidden';
import { listMissions, type MissionListResult, type MissionWithClaims } from '../lib/missions';
import { CELL_SOURCE, getCurrentCellSnapshot, setCurrentCell, subscribeCurrentCell } from '../lib/whereami';
import { MAP_META, PLACES, PLAZAS, type Place } from '../data/info-content';

type MapTabProps = {
  selectedGrid: string | null;
  onSelectGrid: (grid: string) => void;
  onSelectCamp: (campId: string) => void;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  onUnlock: () => void;
  onOpenMissions: () => void;
};

const NEIGHBORHOOD_COLORS = [
  { fill: '#F8C9DA', stroke: '#E0447E' },
  { fill: '#CFE9F7', stroke: '#2D88B6' },
  { fill: '#F9E5A7', stroke: '#B57900' },
  { fill: '#D9EECF', stroke: '#3E7D34' },
  { fill: '#E2E0F5', stroke: '#34379E' },
  { fill: '#F7D7C5', stroke: '#B85B35' },
  { fill: '#D6F0E8', stroke: '#2F7F71' },
  { fill: '#F2D5ED', stroke: '#A94392' },
  { fill: '#DFE9C7', stroke: '#6C7E24' },
  { fill: '#D8DDF6', stroke: '#4952B8' }
];

const neighborhoodColor = new Map(
  MAP_NEIGHBORHOODS.map((neighborhood, index) => [
    neighborhood,
    NEIGHBORHOOD_COLORS[index % NEIGHBORHOOD_COLORS.length]
  ])
);

const CELL_SIZE = 22;
const GAP = 0;
const LEFT_AXIS = 24;
const TOP_AXIS = 20;
const RIGHT_PAD = 6;
const BOTTOM_PAD = 8;
const GRID_WIDTH = MAP_COLUMNS.length * (CELL_SIZE + GAP) - GAP;
const GRID_HEIGHT = MAP_ROWS.length * (CELL_SIZE + GAP) - GAP;
const VIEWBOX_WIDTH = LEFT_AXIS + GRID_WIDTH + RIGHT_PAD;
const VIEWBOX_HEIGHT = TOP_AXIS + GRID_HEIGHT + BOTTOM_PAD;
const ART_OFFSET_X = 0; // Horizontal artwork calibration in SVG units.
const ART_OFFSET_Y = 0; // Vertical artwork calibration in SVG units.
const ART_SCALE_X = 1; // Artwork width multiplier.
const ART_SCALE_Y = 1; // Artwork height multiplier.
const HOLD_DURATION_MS = 2000;
const HOLD_MOVE_THRESHOLD_PX = 10;
type MapView = 'events' | 'plazas' | 'places' | 'missions';

const MAP_VIEWS: Array<{ key: MapView; label: string }> = [
  { key: 'events', label: 'Events' },
  { key: 'plazas', label: 'Plazas' },
  { key: 'places', label: 'Places' },
  { key: 'missions', label: 'Missions' }
];

type LocationState = {
  grid: GridPosition | null;
  isWatching: boolean;
  note: string | null;
};

function markerPosition(grid: string) {
  const point = parseGridCode(grid);
  if (!point) return null;
  const columnIndex = MAP_COLUMNS.indexOf(point.column);
  const rowIndex = MAP_ROWS.indexOf(point.row);
  if (columnIndex < 0 || rowIndex < 0) return null;
  return {
    x: LEFT_AXIS + columnIndex * (CELL_SIZE + GAP) + CELL_SIZE / 2,
    y: TOP_AXIS + rowIndex * (CELL_SIZE + GAP) + CELL_SIZE / 2
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function floatingGridPosition(grid: GridPosition) {
  const minCol = GRID_BOUNDS.minColumnIndex - 1;
  const maxCol = GRID_BOUNDS.maxColumnIndex;
  const minRow = GRID_BOUNDS.minRow - 1;
  const maxRow = GRID_BOUNDS.maxRow;
  const clampedCol = clamp(grid.col, minCol, maxCol);
  const clampedRow = clamp(grid.row, minRow, maxRow);

  return {
    x: LEFT_AXIS + (clampedCol - minCol) * CELL_SIZE,
    y: TOP_AXIS + (clampedRow - minRow) * CELL_SIZE,
    isOffMap: clampedCol !== grid.col || clampedRow !== grid.row
  };
}

function cellColor(cell: MapCell) {
  if (!cell.neighborhood) return { fill: 'transparent', stroke: 'rgba(242,235,217,0.16)' };
  return neighborhoodColor.get(cell.neighborhood) || NEIGHBORHOOD_COLORS[0];
}

function Sparkle({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={`sparkle ${className}`} viewBox="0 0 20 20">
      <path d="M10 1.5 12.3 7.7 18.5 10 12.3 12.3 10 18.5 7.7 12.3 1.5 10 7.7 7.7 10 1.5Z" />
    </svg>
  );
}

function PlaceGlyph({ icon }: { icon: NonNullable<Place['icon']> }) {
  switch (icon) {
    case 'toilet':
      // toilet-paper roll (front view): body + top rim + hole + hanging sheet
      return (
        <>
          <path d="M-3.3 -2.6v5.1a3.3 1.5 0 0 0 6.6 0v-5.1" className="map-glyph-fill" />
          <ellipse cy="-2.6" rx="3.3" ry="1.5" className="map-glyph-fill" />
          <ellipse cy="-2.6" rx="1.3" ry="0.6" className="map-glyph-hole" />
          <path d="M3.3 -1v4.2h1.5v-3.9" className="map-glyph-fill" />
        </>
      );
    case 'trash':
      return (
        <>
          <path d="M-3.6 -2.2h7.2M-2.6 -4h5.2M-2.8 -1.2l.5 5.2h4.6l.5-5.2" className="map-glyph-stroke" />
          <path d="M-0.8 -0.6v3.4M1 -0.6v3.4" className="map-glyph-stroke-thin" />
        </>
      );
    case 'water':
      return <path d="M0 -4.8C2.5-1.7 3.5.1 3.5 2a3.5 3.5 0 0 1-7 0c0-1.9 1-3.7 3.5-6.8Z" className="map-glyph-fill" />;
    case 'info':
      return (
        <>
          <circle cy="-3.3" r="1" className="map-glyph-fill" />
          <path d="M0 -0.9v5" className="map-glyph-stroke" />
        </>
      );
    case 'sanctuary':
      return <path d="M-1.5 -4.2h3v2.7h2.7v3h-2.7v2.7h-3v-2.7h-2.7v-3h2.7Z" className="map-glyph-fill" />;
    case 'gate':
      return (
        <>
          <path d="M-2.6 -0.6v-1.6a2.6 2.6 0 0 1 5.2 0v1.6" className="map-glyph-stroke" />
          <rect x="-3.4" y="-0.8" width="6.8" height="5.6" rx="1" className="map-glyph-fill" />
          <circle cy="1.4" r="0.9" className="map-glyph-hole" />
          <path d="M0 1.9v1.5" className="map-glyph-hole-stroke" />
        </>
      );
    default:
      return null;
  }
}

function PlaceMarker({ place }: { place: Place }) {
  const position = markerPosition(place.grid);
  if (!position) return null;

  return (
    <g className="map-place" transform={`translate(${position.x} ${position.y})`}>
      <circle r="8.5" className="map-place-dot" />
      {place.number != null ? (
        <text y="2.9" textAnchor="middle" className="map-place-number">
          {place.number}
        </text>
      ) : place.icon ? (
        <PlaceGlyph icon={place.icon} />
      ) : null}
    </g>
  );
}

function PlaceLegendIcon({ place }: { place: Place }) {
  return (
    <svg viewBox="-9 -9 18 18" aria-hidden="true">
      <circle r="8.5" className="map-place-dot" />
      {place.number != null ? (
        <text y="2.9" textAnchor="middle" className="map-place-number">
          {place.number}
        </text>
      ) : place.icon ? (
        <PlaceGlyph icon={place.icon} />
      ) : null}
    </svg>
  );
}

// one legend row per key: the 4 numbered buildings, then one per facility icon
const PLACE_LEGEND: Array<{ label: string; sample: Place }> = (() => {
  const byIcon = (icon: Place['icon']) => PLACES.find((place) => place.icon === icon);
  const rows: Array<{ label: string; sample: Place }> = PLACES.filter((place) => place.number != null).map(
    (place) => ({ label: place.name, sample: place })
  );
  const icons: Array<[Place['icon'], string]> = [
    ['sanctuary', 'Sanctuary'],
    ['gate', 'Threshold (gate)'],
    ['toilet', 'Toilets'],
    ['water', 'Water'],
    ['info', 'Infopoint WTF'],
    ['trash', 'Trash containers']
  ];
  for (const [icon, label] of icons) {
    const sample = byIcon(icon);
    if (sample) rows.push({ label, sample });
  }
  return rows;
})();

function missionCapacityLabel(mission: MissionWithClaims) {
  if (mission.capacity_type === 'open') return 'open to everyone';
  if (mission.capacity_type === 'exclusive') return 'one person only';

  return `${mission.spotsLeft ?? 0} of ${mission.capacity ?? 0} spots left`;
}

export function MapTab({
  selectedGrid,
  onSelectGrid,
  onSelectCamp,
  isFavorite,
  toggleFavorite,
  onUnlock,
  onOpenMissions
}: MapTabProps) {
  const [showMapArt, setShowMapArt] = useState(true);
  const [showFreeFloating, setShowFreeFloating] = useState(false);
  const [mapView, setMapView] = useState<MapView>('events');
  const [missionBoard, setMissionBoard] = useState<MissionListResult | null>(null);
  const [location, setLocation] = useState<LocationState>({
    grid: null,
    isWatching: false,
    note: null
  });
  const watchIdRef = useRef<number | null>(null);
  const holdRef = useRef<{ pointerId: number; startX: number; startY: number; timer: number; token: number } | null>(null);
  const holdGenerationRef = useRef(0);
  const suppressNextCellClickRef = useRef(false);
  const currentCell = useSyncExternalStore(subscribeCurrentCell, getCurrentCellSnapshot, getCurrentCellSnapshot);
  const selectedCell = selectedGrid ? MAP_CELLS_BY_CODE.get(selectedGrid) || null : null;
  const groupedSelectedEvents = useMemo(() => groupByDay(selectedCell?.events || []), [selectedCell?.events]);
  const groupedFreeFloatingEvents = useMemo(() => groupByDay(FREE_FLOATING_EVENTS), []);
  const userMarker = useMemo(() => (location.grid ? floatingGridPosition(location.grid) : null), [location.grid]);
  const manualHereMarker = useMemo(
    () => (CELL_SOURCE === 'manual' && currentCell ? markerPosition(currentCell) : null),
    [currentCell]
  );
  const showEventLayer = mapView === 'events';
  const showMissionLayer = mapView === 'missions';
  const visibleMapViews = isUnlocked() ? MAP_VIEWS : MAP_VIEWS.filter((view) => view.key !== 'missions');
  const missionCells = useMemo(() => {
    const mapCellCodes = new Set(
      MAP_CELLS.map((cell) => canonicalCell(cell.code)).filter((code): code is string => code !== null)
    );
    const counts = new Map<string, number>();
    const missionsByCell = new Map<string, MissionWithClaims[]>();
    let withoutGridSquare = 0;

    for (const mission of missionBoard?.data ?? []) {
      const grid = mission.grid_ref ? canonicalCell(mission.grid_ref) : null;
      if (!grid || !mapCellCodes.has(grid)) {
        withoutGridSquare += 1;
        continue;
      }

      counts.set(grid, (counts.get(grid) ?? 0) + 1);
      missionsByCell.set(grid, [...(missionsByCell.get(grid) ?? []), mission]);
    }

    return { counts, missionsByCell, withoutGridSquare };
  }, [missionBoard]);
  const selectedMissions = selectedCell
    ? missionCells.missionsByCell.get(canonicalCell(selectedCell.code) ?? '') ?? []
    : [];

  useEffect(() => {
    if (mapView !== 'missions') return;

    let active = true;
    void listMissions().then((board) => {
      if (active) setMissionBoard(board);
    });

    return () => {
      active = false;
    };
  }, [mapView]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (holdRef.current !== null) {
        window.clearTimeout(holdRef.current.timer);
        holdRef.current = null;
        holdGenerationRef.current += 1;
      }
    };
  }, []);

  const cancelCellHold = (pointerId?: number) => {
    const hold = holdRef.current;
    if (!hold || (pointerId !== undefined && hold.pointerId !== pointerId)) return;

    window.clearTimeout(hold.timer);
    holdRef.current = null;
    holdGenerationRef.current += 1;
  };

  const releasePointer = (target: SVGGElement, pointerId: number) => {
    try {
      if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
    } catch {
      // Pointer capture is a progressive enhancement for gestures that leave the cell.
    }
  };

  const startCellHold = (event: React.PointerEvent<SVGGElement>, cellCode: string) => {
    if (isUnlocked() || event.button !== 0) return;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is not available in every SVG implementation.
    }

    const token = ++holdGenerationRef.current;
    const timer = window.setTimeout(() => {
      void (async () => {
        if (holdRef.current?.token !== token || isUnlocked()) return;

        const isSecretCell = await matchesSecretCell(cellCode);
        if (holdGenerationRef.current !== token || holdRef.current?.token !== token || isUnlocked()) return;

        holdRef.current = null;
        if (!isSecretCell) return;

        suppressNextCellClickRef.current = true;
        unlock();
        navigator.vibrate?.(60);
        onUnlock();
      })();
    }, HOLD_DURATION_MS);

    holdRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      timer,
      token
    };
  };

  const moveCellHold = (event: React.PointerEvent<SVGGElement>) => {
    const hold = holdRef.current;
    if (!hold || hold.pointerId !== event.pointerId) return;

    if (Math.hypot(event.clientX - hold.startX, event.clientY - hold.startY) > HOLD_MOVE_THRESHOLD_PX) {
      cancelCellHold(event.pointerId);
      releasePointer(event.currentTarget, event.pointerId);
    }
  };

  const startLocationWatch = () => {
    if (!('geolocation' in navigator)) {
      setLocation((current) => ({
        ...current,
        isWatching: false,
        note: "the satellites can't find you - this device has no location"
      }));
      return;
    }

    if (watchIdRef.current !== null) {
      setLocation((current) => ({ ...current, note: current.grid ? 'still tracking you' : 'still looking for you' }));
      return;
    }

    setLocation((current) => ({ ...current, isWatching: true, note: 'asking the satellites...' }));
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          grid: latLonToGrid(position.coords.latitude, position.coords.longitude),
          isWatching: true,
          note: null
        });
      },
      (error) => {
        let note = "the satellites can't find you - try again under open sky";
        if (error.code === error.PERMISSION_DENIED) {
          note = "the satellites can't find you - check location permissions";
        }
        if (error.code === error.POSITION_UNAVAILABLE) {
          note = "the satellites can't find you - location is unavailable";
        }
        setLocation((current) => ({
          ...current,
          isWatching: false,
          note
        }));
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div id="map-tab" className="space-y-5 scroll-mt-4">
      <section className="space-y-1.5">
        <p className="section-kicker">Map</p>
        <div className="flex items-center gap-1.5">
          <h2 className="display-heading text-lg">Where the maybes gather</h2>
          <Sparkle className="text-yellow" />
        </div>
        <p className="text-sm leading-5 text-cream">
          Tap a square to see its happenings. Some happenings float free of the grid: {FREE_FLOATING_EVENT_COUNT}.
        </p>
      </section>

      <section className="panel-card space-y-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className={`map-find-button ${location.isWatching ? 'is-active' : ''}`}
            onClick={startLocationWatch}
            aria-label="Find me on the map"
            title="Find me"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
            </svg>
          </button>
          <label className="toggle-row map-art-toggle">
            <input
              type="checkbox"
              checked={!showMapArt}
              onChange={(event) => setShowMapArt(!event.currentTarget.checked)}
            />
            <span>hide map art</span>
          </label>
        </div>
        {location.note || userMarker?.isOffMap ? (
          <p className="map-location-note">
            {userMarker?.isOffMap ? 'you are just off this map edge' : location.note}
          </p>
        ) : null}
        {CELL_SOURCE === 'manual' && currentCell ? (
          <p className="flex items-center gap-1 text-xs leading-5 text-[var(--muted-indigo)]">
            <span>you are here · {currentCell} (set by hand)</span>
            <button
              type="button"
              className="font-bold underline decoration-indigo-brand/30 underline-offset-2 hover:text-pink"
              onClick={() => setCurrentCell(null)}
            >
              clear
            </button>
          </p>
        ) : null}

        <div className="map-view-toggle" role="tablist" aria-label="Map view">
          {visibleMapViews.map((view) => (
            <button
              key={view.key}
              type="button"
              role="tab"
              aria-selected={mapView === view.key}
              className={mapView === view.key ? 'is-active' : ''}
              onClick={() => setMapView(view.key)}
            >
              {view.label}
            </button>
          ))}
        </div>

        <svg
          className="block h-auto w-full"
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          role="img"
          aria-label="Borderland event grid map"
        >
          <defs>
            <clipPath id="official-map-art-clip">
              <rect x={LEFT_AXIS} y={TOP_AXIS} width={GRID_WIDTH} height={GRID_HEIGHT} />
            </clipPath>
          </defs>

          {showMapArt ? (
            <image
              href="/map-official.webp"
              x={LEFT_AXIS + ART_OFFSET_X}
              y={TOP_AXIS + ART_OFFSET_Y}
              width={GRID_WIDTH * ART_SCALE_X}
              height={GRID_HEIGHT * ART_SCALE_Y}
              preserveAspectRatio="none"
              clipPath="url(#official-map-art-clip)"
              opacity="0.88"
            />
          ) : null}

          {/* Axis labels always render: grid refs like "N19" are how people tell
              each other where things are, so they must be readable over the
              artwork too, not only when it is switched off. */}
          {MAP_COLUMNS.map((column, index) => (
            <text
              key={column}
              x={LEFT_AXIS + index * (CELL_SIZE + GAP) + CELL_SIZE / 2}
              y="12"
              textAnchor="middle"
              className="map-axis"
            >
              {column}
            </text>
          ))}

          {MAP_ROWS.map((row, index) => (
            <text
              key={row}
              x="17"
              y={TOP_AXIS + index * (CELL_SIZE + GAP) + CELL_SIZE / 2 + 3}
              textAnchor="end"
              className="map-axis"
            >
              {row}
            </text>
          ))}

          {MAP_CELLS.map((cell) => {
            const columnIndex = MAP_COLUMNS.indexOf(cell.column);
            const rowIndex = MAP_ROWS.indexOf(cell.row);
            const colors = cellColor(cell);
            const isSelected = selectedGrid === cell.code;
            const canonicalCode = canonicalCell(cell.code);
            const missionCount = canonicalCode ? missionCells.counts.get(canonicalCode) ?? 0 : 0;
            const hasMapItems = showEventLayer ? cell.eventCount : showMissionLayer ? missionCount : 0;
            const fill = showMissionLayer && missionCount ? 'var(--pink)' : showEventLayer ? colors.fill : 'transparent';
            const stroke = isSelected
              ? '#E0447E'
              : showMissionLayer && missionCount
                ? 'var(--pink)'
                : showEventLayer
                  ? colors.stroke
                  : 'rgba(242,235,217,0.18)';
            const fillOpacity = showMissionLayer
              ? missionCount
                ? 1
                : 0.04
              : showEventLayer
              ? showMapArt
                ? cell.eventCount
                  ? 0.58
                  : 0.08
                : cell.eventCount
                  ? 1
                  : 0.45
              : 0.04;

            return (
              <g
                key={cell.code}
                role="button"
                tabIndex={0}
                aria-label={
                  showMissionLayer
                    ? `${cell.code}: ${missionCount} missions`
                    : `${cell.code}: ${cell.eventCount} events${cell.neighborhood ? ` in ${cell.neighborhood}` : ''}`
                }
                onClick={() => {
                  if (suppressNextCellClickRef.current) {
                    suppressNextCellClickRef.current = false;
                    return;
                  }
                  // Manual placement also makes presence-gated claims testable away from camp.
                  setCurrentCell(cell.code);
                  onSelectGrid(cell.code);
                }}
                onPointerDown={(event) => startCellHold(event, cell.code)}
                onPointerMove={moveCellHold}
                onPointerUp={(event) => {
                  cancelCellHold(event.pointerId);
                  releasePointer(event.currentTarget, event.pointerId);
                }}
                onPointerCancel={(event) => {
                  cancelCellHold(event.pointerId);
                  releasePointer(event.currentTarget, event.pointerId);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setCurrentCell(cell.code);
                    onSelectGrid(cell.code);
                  }
                }}
                className="map-cell"
              >
                <rect
                  x={LEFT_AXIS + columnIndex * (CELL_SIZE + GAP)}
                  y={TOP_AXIS + rowIndex * (CELL_SIZE + GAP)}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  rx={hasMapItems ? 5 : 3}
                  className={isSelected ? 'map-cell-selection' : undefined}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isSelected ? 2.2 : 1}
                  fillOpacity={fillOpacity}
                  strokeOpacity={showMapArt ? (isSelected ? 1 : 0.58) : 1}
                />
                {hasMapItems ? (
                  <text
                    x={LEFT_AXIS + columnIndex * (CELL_SIZE + GAP) + CELL_SIZE / 2}
                    y={TOP_AXIS + rowIndex * (CELL_SIZE + GAP) + CELL_SIZE / 2 + 3.5}
                    textAnchor="middle"
                    className="map-count"
                  >
                    {hasMapItems}
                  </text>
                ) : null}
              </g>
            );
          })}

          {selectedCell
            ? (() => {
                const columnIndex = MAP_COLUMNS.indexOf(selectedCell.column);
                const rowIndex = MAP_ROWS.indexOf(selectedCell.row);
                if (columnIndex < 0 || rowIndex < 0) return null;
                const x = LEFT_AXIS + columnIndex * (CELL_SIZE + GAP);
                const y = TOP_AXIS + rowIndex * (CELL_SIZE + GAP);
                return (
                  <g pointerEvents="none">
                    <rect
                      x={x - 7}
                      y={y - 7}
                      width={CELL_SIZE + 14}
                      height={CELL_SIZE + 14}
                      rx={10}
                      className="map-selection-halo"
                    />
                    <rect
                      x={x - 3.5}
                      y={y - 3.5}
                      width={CELL_SIZE + 7}
                      height={CELL_SIZE + 7}
                      rx={8}
                      className="map-selection-ring"
                    />
                  </g>
                );
              })()
            : null}

          <g pointerEvents="none">
            {mapView === 'plazas'
              ? PLAZAS.map((plaza, index) => {
                  const position = markerPosition(plaza.grid);
                  if (!position) return null;
                  const x = position.x + (plaza.nudge?.x ?? 0);
                  const y = position.y + (plaza.nudge?.y ?? 0);
                  return (
                    <g key={plaza.name}>
                      <circle cx={x} cy={y} r="8.5" className="map-plaza-dot" />
                      <text x={x} y={y + 3.2} textAnchor="middle" className="map-plaza-number">
                        {index + 1}
                      </text>
                    </g>
                  );
                })
              : null}

            {mapView === 'places' ? PLACES.map((place) => <PlaceMarker key={place.name} place={place} />) : null}

            {userMarker ? (
              <g className="map-you-marker" transform={`translate(${userMarker.x} ${userMarker.y})`}>
                <circle r="7.5" className="map-you-pulse" />
                <circle r="4.2" className="map-you-dot" />
                <text x="0" y="-10.5" textAnchor="middle" className="map-you-label">
                  YOU ARE HERE
                </text>
              </g>
            ) : null}
            {manualHereMarker ? (
              <g className="map-you-marker" transform={`translate(${manualHereMarker.x} ${manualHereMarker.y})`}>
                <circle r="7.5" className="map-you-pulse" />
                <circle r="4.2" className="map-you-dot" />
                <text x="0" y="-10.5" textAnchor="middle" className="map-you-label">
                  YOU ARE HERE
                </text>
              </g>
            ) : null}
          </g>
        </svg>

        <div className="space-y-2 border-t border-indigo-brand/15 pt-2">
          {mapView === 'events' ? (
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {MAP_NEIGHBORHOODS.map((neighborhood) => {
                const colors = neighborhoodColor.get(neighborhood) || NEIGHBORHOOD_COLORS[0];
                return (
                  <div key={neighborhood} className="legend-item">
                    <span style={{ background: colors.fill, borderColor: colors.stroke }} />
                    <span className="truncate">{neighborhood}</span>
                  </div>
                );
              })}
            </div>
          ) : null}

          {mapView === 'plazas' ? (
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {PLAZAS.map((plaza, index) => (
                <div key={plaza.name} className="legend-item">
                  <span className="legend-plaza">{index + 1}</span>
                  <span className="truncate">{plaza.name}</span>
                </div>
              ))}
            </div>
          ) : null}

          {mapView === 'places' ? (
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {PLACE_LEGEND.map((entry) => (
                <div key={entry.label} className="place-legend-item">
                  <PlaceLegendIcon place={entry.sample} />
                  <span className="truncate">{entry.label}</span>
                </div>
              ))}
            </div>
          ) : null}

          {mapView === 'missions' ? (
            <div className="space-y-1">
              <p className="text-xs leading-5 text-[var(--muted-indigo)]">
                {missionBoard ? `${missionBoard.data.length} missions on the board` : 'Loading missions…'}
                {missionBoard?.stale ? ' · showing your last synced board' : ''}
              </p>
              {missionCells.withoutGridSquare ? (
                <p className="text-xs leading-5 text-[var(--muted-indigo)]">
                  {missionCells.withoutGridSquare} mission{missionCells.withoutGridSquare === 1 ? '' : 's'} with no grid square
                </p>
              ) : null}
            </div>
          ) : null}

          <p className="text-xs leading-5 text-[var(--muted-indigo)]">{MAP_META.note}</p>
          {mapView === 'places' ? (
            <p className="text-xs font-bold leading-5 text-pink">{MAP_META.consentDropboxes}</p>
          ) : null}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="section-kicker">Selected Square</p>
            <h3 className="display-heading text-base">
              {selectedCell
                ? mapView === 'missions'
                  ? `${selectedCell.code} · ${selectedMissions.length} mission${selectedMissions.length === 1 ? '' : 's'}`
                  : `${selectedCell.code} · ${selectedCell.eventCount} happenings`
                : 'Pick a grid square'}
            </h3>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {mapView === 'missions' ? (
              <button type="button" className="chip" onClick={onOpenMissions}>
                Open in Missions
              </button>
            ) : null}
          </div>
        </div>

        {mapView === 'missions' ? (
          selectedMissions.length ? (
            <div className="space-y-2">
              {selectedMissions.map((mission) => (
                <article key={mission.id} className="panel-card space-y-2">
                  <h4 className="text-sm font-semibold leading-5 text-indigo-brand">{mission.title}</h4>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="soft-badge">{missionCapacityLabel(mission)}</span>
                    {mission.requires_presence ? <span className="soft-badge">here only</span> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="panel-card text-sm text-[var(--muted-indigo)]">
              {selectedCell ? 'No missions are on this square.' : 'Choose a square to see its missions.'}
            </p>
          )
        ) : selectedCell?.events.length ? (
          <div className="space-y-3">
            {groupedSelectedEvents.map((group) => (
              <section key={group.day} className="space-y-2 pt-1.5">
                <div className="day-pill">{group.day}</div>
                <div className="space-y-2">
                  {group.events.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      isFavorite={isFavorite(event.id)}
                      isOccurrenceFavorite={isFavorite}
                      onToggleFavorite={toggleFavorite}
                      onSelectGrid={onSelectGrid}
                      onSelectCamp={onSelectCamp}
                      compact
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <p className="panel-card text-sm text-[var(--muted-indigo)]">
            {selectedCell ? 'That square is quiet in the current program.' : 'Choose a colored square to open its list.'}
          </p>
        )}
      </section>

      {FREE_FLOATING_EVENTS.length > 0 ? (
        <section className="space-y-2">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="section-kicker">No fixed location</p>
              <h3 className="display-heading text-base">
                {FREE_FLOATING_EVENTS.length} happenings not on the grid
              </h3>
              <p className="mt-1 text-sm leading-5 text-[var(--muted-indigo)]">
                These float free of the map — still part of the program.
              </p>
            </div>
            <button
              type="button"
              className={`chip ${showFreeFloating ? 'is-active' : ''}`}
              onClick={() => setShowFreeFloating((current) => !current)}
              aria-expanded={showFreeFloating}
            >
              {showFreeFloating ? 'Hide' : 'Show'}
            </button>
          </div>

          {showFreeFloating ? (
            <div className="space-y-3">
              {groupedFreeFloatingEvents.map((group) => (
                <section key={group.day} className="space-y-2 pt-1.5">
                  <div className="day-pill">{group.day}</div>
                  <div className="space-y-2">
                    {group.events.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        isFavorite={isFavorite(event.id)}
                        isOccurrenceFavorite={isFavorite}
                        onToggleFavorite={toggleFavorite}
                        onSelectGrid={onSelectGrid}
                        onSelectCamp={onSelectCamp}
                        compact
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
