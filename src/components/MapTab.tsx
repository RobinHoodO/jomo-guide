import { useEffect, useMemo, useRef, useState } from 'react';
import { EventCard } from './EventCard';
import {
  FREE_FLOATING_EVENT_COUNT,
  GRID_BOUNDS,
  MAP_CELLS,
  MAP_CELLS_BY_CODE,
  MAP_COLUMNS,
  MAP_NEIGHBORHOODS,
  MAP_ROWS,
  parseGridCode,
  type MapCell
} from '../lib/events';
import { latLonToGrid, type GridPosition } from '../lib/geo';
import { MAP_META, PLACES, PLAZAS } from '../data/info-content';

type MapTabProps = {
  selectedGrid: string | null;
  onSelectGrid: (grid: string) => void;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
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
const OFFICIAL_MAP_GRID_SIZE = 26;

export const MAP_ART_OFFSET = { x: 0, y: 0 };
export const MAP_ART_SCALE = { x: 1, y: 1 };

const MAP_ART_WIDTH = (GRID_WIDTH * OFFICIAL_MAP_GRID_SIZE * MAP_ART_SCALE.x) / MAP_COLUMNS.length;
const MAP_ART_HEIGHT = (GRID_HEIGHT * OFFICIAL_MAP_GRID_SIZE * MAP_ART_SCALE.y) / MAP_ROWS.length;
const MAP_ART_X =
  LEFT_AXIS -
  ((GRID_BOUNDS.minColumnIndex - 1) / OFFICIAL_MAP_GRID_SIZE) * MAP_ART_WIDTH +
  MAP_ART_OFFSET.x;
const MAP_ART_Y =
  TOP_AXIS - ((GRID_BOUNDS.minRow - 1) / OFFICIAL_MAP_GRID_SIZE) * MAP_ART_HEIGHT + MAP_ART_OFFSET.y;

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

export function MapTab({ selectedGrid, onSelectGrid, isFavorite, toggleFavorite }: MapTabProps) {
  const [showMapArt, setShowMapArt] = useState(true);
  const [location, setLocation] = useState<LocationState>({
    grid: null,
    isWatching: false,
    note: null
  });
  const watchIdRef = useRef<number | null>(null);
  const selectedCell = selectedGrid ? MAP_CELLS_BY_CODE.get(selectedGrid) || null : null;
  const userMarker = useMemo(() => (location.grid ? floatingGridPosition(location.grid) : null), [location.grid]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

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
              href="/map-official.png"
              x={MAP_ART_X}
              y={MAP_ART_Y}
              width={MAP_ART_WIDTH}
              height={MAP_ART_HEIGHT}
              preserveAspectRatio="none"
              clipPath="url(#official-map-art-clip)"
              opacity="0.88"
            />
          ) : null}

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

            return (
              <g
                key={cell.code}
                role="button"
                tabIndex={0}
                aria-label={`${cell.code}: ${cell.eventCount} events${cell.neighborhood ? ` in ${cell.neighborhood}` : ''}`}
                onClick={() => onSelectGrid(cell.code)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
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
                  rx={cell.eventCount ? 5 : 3}
                  fill={colors.fill}
                  stroke={isSelected ? '#E0447E' : colors.stroke}
                  strokeWidth={isSelected ? 2.2 : 1}
                  fillOpacity={showMapArt ? (cell.eventCount ? 0.58 : 0.08) : cell.eventCount ? 1 : 0.45}
                  strokeOpacity={showMapArt ? (isSelected ? 1 : 0.58) : 1}
                />
                {cell.eventCount ? (
                  <text
                    x={LEFT_AXIS + columnIndex * (CELL_SIZE + GAP) + CELL_SIZE / 2}
                    y={TOP_AXIS + rowIndex * (CELL_SIZE + GAP) + CELL_SIZE / 2 + 3.5}
                    textAnchor="middle"
                    className="map-count"
                  >
                    {cell.eventCount}
                  </text>
                ) : null}
              </g>
            );
          })}

          <g pointerEvents="none">
            {PLAZAS.map((plaza, index) => {
              const position = markerPosition(plaza.grid);
              if (!position) return null;
              return (
                <g key={plaza.name}>
                  <circle cx={position.x} cy={position.y} r="7" className="map-plaza-dot" />
                  <text x={position.x} y={position.y + 3.2} textAnchor="middle" className="map-plaza-number">
                    {index + 1}
                  </text>
                </g>
              );
            })}

            {PLACES.map((place) => {
              const position = markerPosition(place.grid);
              if (!position) return null;
              const isSafety = place.kind === 'safety';
              return (
                <g key={place.name}>
                  {isSafety ? (
                    <>
                      <circle cx={position.x} cy={position.y} r="8" className="map-safety-marker" />
                      <path
                        d={`M${position.x - 3.5} ${position.y}h7M${position.x} ${position.y - 3.5}v7`}
                        className="map-safety-cross"
                      />
                    </>
                  ) : (
                    <rect
                      x={position.x - 5}
                      y={position.y - 5}
                      width="10"
                      height="10"
                      rx="2"
                      transform={`rotate(45 ${position.x} ${position.y})`}
                      className={place.kind === 'facility' ? 'map-facility-marker' : 'map-building-marker'}
                    />
                  )}
                </g>
              );
            })}
            {userMarker ? (
              <g className="map-you-marker" transform={`translate(${userMarker.x} ${userMarker.y})`}>
                <circle r="7.5" className="map-you-pulse" />
                <circle r="4.2" className="map-you-dot" />
                <text x="0" y="-10.5" textAnchor="middle" className="map-you-label">
                  YOU ARE HERE
                </text>
              </g>
            ) : null}
          </g>
        </svg>

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

        <div className="space-y-2 border-t border-indigo-brand/15 pt-2">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {PLAZAS.map((plaza, index) => (
              <div key={plaza.name} className="legend-item">
                <span className="legend-plaza">{index + 1}</span>
                <span className="truncate">{plaza.name}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {PLACES.map((place) => (
              <div key={place.name} className="legend-item">
                <span className={`legend-place ${place.kind === 'safety' ? 'is-safety' : ''}`} />
                <span className="truncate">{place.name}</span>
              </div>
            ))}
          </div>
          <p className="text-xs leading-5 text-[var(--muted-indigo)]">{MAP_META.note}</p>
          <p className="text-xs font-bold leading-5 text-pink">{MAP_META.consentDropboxes}</p>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="section-kicker">Selected Square</p>
            <h3 className="display-heading text-base">
              {selectedCell ? `${selectedCell.code} · ${selectedCell.eventCount} happenings` : 'Pick a grid square'}
            </h3>
          </div>
        </div>

        {selectedCell?.events.length ? (
          <div className="space-y-2">
            {selectedCell.events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isFavorite={isFavorite(event.id)}
                isOccurrenceFavorite={isFavorite}
                onToggleFavorite={toggleFavorite}
                onSelectGrid={onSelectGrid}
                compact
              />
            ))}
          </div>
        ) : (
          <p className="panel-card text-sm text-[var(--muted-indigo)]">
            {selectedCell ? 'That square is quiet in the current program.' : 'Choose a colored square to open its list.'}
          </p>
        )}
      </section>
    </div>
  );
}
