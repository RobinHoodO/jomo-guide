export const ANCHOR = { lat: 57.62188, lon: 14.92604 };
export const ANCHOR_GRID = { col: 13.0, row: 13.0 };
export const ROTATION_DEG = -11;
export const CELL_METERS = 50;

export type GridPosition = {
  col: number;
  row: number;
};

export function latLonToGrid(lat: number, lon: number): GridPosition {
  const lat0Rad = (ANCHOR.lat * Math.PI) / 180;
  // ENU meters from the anchor. y grows downward on map-north.
  const dx = (lon - ANCHOR.lon) * 111320 * Math.cos(lat0Rad);
  const dy = (ANCHOR.lat - lat) * 110574;
  const theta = (ROTATION_DEG * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  // ANCHOR_GRID and the ROTATION_DEG sign are field-calibration knobs:
  // walk to a known plaza, then adjust the grid anchor or rotation sign until the dot lines up.
  const rotatedX = dx * cos - dy * sin;
  const rotatedY = dx * sin + dy * cos;

  return {
    col: ANCHOR_GRID.col + rotatedX / CELL_METERS,
    row: ANCHOR_GRID.row + rotatedY / CELL_METERS
  };
}
