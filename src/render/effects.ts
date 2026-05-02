// Visual effects — hit sparks, screen shake, weapon trails
// Purely cosmetic — never read by simulation
import type { Camera } from './camera';
import { worldToScreen } from './camera';

export interface Spark {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  maxLife: number;
  color: string;
  angle: number;
  len: number;
}

interface Flash {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
  radius: number;
}

const sparks: Spark[] = [];
const flashes: Flash[] = [];
let shakeIntensity = 0;
let shakeFrames    = 0;

export function spawnSparks(wx: number, wy: number, count: number, color: string): void {
  flashes.push({
    x: wx,
    y: wy,
    life: 8,
    maxLife: 10,
    color,
    radius: 1800,
  });
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (i * 0.37);
    const speed = 800 + (i * 123) % 600;
    sparks.push({
      x: wx, y: wy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 12 + (i * 7) % 8,
      maxLife: 20,
      color,
      angle,
      len: 18 + (i % 4) * 7,
    });
  }
}

export function triggerShake(intensity: number, frames: number): void {
  shakeIntensity = Math.max(shakeIntensity, intensity);
  shakeFrames    = Math.max(shakeFrames, frames);
}

export function updateEffects(): void {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.x += s.vx / 60;
    s.y += s.vy / 60;
    s.life--;
    if (s.life <= 0) sparks.splice(i, 1);
  }
  for (let i = flashes.length - 1; i >= 0; i--) {
    const f = flashes[i];
    f.life--;
    if (f.life <= 0) flashes.splice(i, 1);
  }
  if (shakeFrames > 0) {
    shakeFrames--;
    if (shakeFrames === 0) shakeIntensity = 0;
  }
}

export function getShakeOffset(): [number, number] {
  if (shakeFrames <= 0) return [0, 0];
  const mag = shakeIntensity * (shakeFrames / 10);
  const ox  = Math.sin(shakeFrames * 7.3) * mag;
  const oy  = Math.cos(shakeFrames * 5.1) * mag;
  return [ox, oy];
}

export function drawEffects(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  cw: number,
  ch: number,
): void {
  // Impact flashes behind sparks
  for (const f of flashes) {
    const [sx, sy] = worldToScreen(cam, f.x, f.y, cw, ch);
    const t = 1 - f.life / f.maxLife;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.42 * (1 - t);
    const r = (1 + t * 0.65) * (f.radius * cam.zoom / 1000);
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.25, f.color);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();

    // Sharp ring for "punch"
    ctx.globalAlpha = 0.55 * (1 - t);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  for (const s of sparks) {
    const [sx, sy] = worldToScreen(cam, s.x, s.y, cw, ch);
    const t = 1 - s.life / s.maxLife;
    const len = Math.max(2, s.len * (1 - t));
    const lw = Math.max(1, 2.4 * (1 - t));

    ctx.save();
    ctx.globalAlpha = 0.9 * (1 - t);
    ctx.strokeStyle = s.color;
    ctx.lineCap = 'round';
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(s.angle) * len, sy + Math.sin(s.angle) * len);
    ctx.stroke();

    // White hot core
    ctx.globalAlpha *= 0.7;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, lw * 0.55);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(s.angle) * (len * 0.65), sy + Math.sin(s.angle) * (len * 0.65));
    ctx.stroke();
    ctx.restore();
  }
}
