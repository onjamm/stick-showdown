// Cinematic camera — read-only access to positions, visual-only output
export interface Camera {
  x: number; // world-space center (in Fixed units)
  y: number;
  zoom: number; // pixels per 1000 Fixed units
}

// High-contrast arena fighter framing:
// - Keep fighters large and readable
// - Still zoom out a bit when spacing increases
const TARGET_HALF_WIDTH = 5200; // units
const ZOOM_MIN = 78;
const ZOOM_MAX = 112;
const CAM_LAG = 0.07; // visual-only smoothing

export function makeCamera(): Camera {
  return { x: 0, y: 0, zoom: 96 };
}

export function updateCamera(cam: Camera, p1x: number, p2x: number): void {
  const midX = (p1x + p2x) / 2;
  const dist = Math.abs(p1x - p2x);
  const halfSpan = Math.max(dist / 2 + 1400, TARGET_HALF_WIDTH);

  const targetZoom = Math.min(
    ZOOM_MAX,
    Math.max(ZOOM_MIN, (window.innerWidth / 2) / (halfSpan / 1000)),
  );

  cam.x += (midX - cam.x) * CAM_LAG;
  cam.zoom += (targetZoom - cam.zoom) * CAM_LAG;
}

export function worldToScreen(
  cam: Camera,
  wx: number,
  wy: number,
  cw: number,
  ch: number,
): [number, number] {
  const scale = cam.zoom / 1000;
  const sx = cw / 2 + (wx - cam.x) * scale;
  const sy = ch * 0.76 + (wy - cam.y) * scale;
  return [sx, sy];
}

export function worldScaleToPixels(cam: Camera, wu: number): number {
  return (wu * cam.zoom) / 1000;
}
