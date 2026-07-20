// Georeference from the official Borderland map (github.com/theborderland/map,
// apps/map/src/utils/gridUtils.ts): grid origin = NW corner of cell A01, bearing 11°.
// In this file's y-down frame the grid bearing keeps its sign: +11, not -11.
export const ANCHOR = { lat: 57.6290247508, lon: 14.9139136076 };
export const ANCHOR_GRID = { col: 0, row: 0 };
export const ROTATION_DEG = 11;
export const CELL_METERS = 50;

export type GridPosition = {
  col: number;
  row: number;
};

export function latLonToGrid(lat: number, lon: number): GridPosition {
  const lat0Rad = (ANCHOR.lat * Math.PI) / 180;
  // ENU meters from the anchor. y grows downward on map-north.
  const dx = (lon - ANCHOR.lon) * 111320 * Math.cos(lat0Rad);
  const dy = (ANCHOR.lat - lat) * 111371; // WGS84 meters per degree latitude at 57.6°N
  const theta = (ROTATION_DEG * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  // Matches the official map's getGridReference within ~1.5 m across the site.
  const rotatedX = dx * cos - dy * sin;
  const rotatedY = dx * sin + dy * cos;

  return {
    col: ANCHOR_GRID.col + rotatedX / CELL_METERS,
    row: ANCHOR_GRID.row + rotatedY / CELL_METERS
  };
}
