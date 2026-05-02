import type { Camera } from './camera';
import { worldScaleToPixels, worldToScreen } from './camera';

// Procedural Flash-era arena — clean line art, soft grays/whites.
// Purely visual; safe for rollback.

export function drawArenaBackground(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  cw: number,
  ch: number,
): void {
  // High-contrast minimalist arena: dark, clean, readable.
  const bg = ctx.createLinearGradient(0, 0, 0, ch);
  bg.addColorStop(0, '#07080c');
  bg.addColorStop(0.55, '#05060a');
  bg.addColorStop(1, '#020309');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cw, ch);

  // Vignette to keep eyes on the fighters
  const vig = ctx.createRadialGradient(cw / 2, ch * 0.62, ch * 0.12, cw / 2, ch * 0.62, ch * 0.9);
  vig.addColorStop(0, 'transparent');
  vig.addColorStop(1, '#000000aa');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, cw, ch);

  // Keep background clean — no decorative line art. Combat readability first.
  void cam;
}

export function drawArenaStage(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  cw: number,
  ch: number,
): void {
  const [flx1, fly] = worldToScreen(cam, -12000, 0, cw, ch);
  const [flx2] = worldToScreen(cam, 12000, 0, cw, ch);
  const stageW = flx2 - flx1;

  // Minimal platform: flat top + dark mass beneath. Prioritize combat readability.
  const depth = Math.max(44, Math.min(120, worldScaleToPixels(cam, 1500)));
  const inset = Math.max(24, Math.min(84, worldScaleToPixels(cam, 900)));

  ctx.save();

  // Soft underglow right under the top edge (helps silhouettes pop)
  const sh = ctx.createLinearGradient(0, fly, 0, fly + depth);
  sh.addColorStop(0, '#6aa2ff22');
  sh.addColorStop(0.25, '#00000033');
  sh.addColorStop(1, 'transparent');
  ctx.fillStyle = sh;
  ctx.fillRect(flx1, fly, stageW, depth);

  // Stage mass
  ctx.fillStyle = '#0b0c11';
  ctx.strokeStyle = '#22263a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(flx1, fly);
  ctx.lineTo(flx2, fly);
  ctx.lineTo(flx2 - inset, fly + depth);
  ctx.lineTo(flx1 + inset, fly + depth);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Bright top line (primary read anchor)
  ctx.save();
  ctx.strokeStyle = '#eaf2ff';
  ctx.shadowColor = '#6aa2ff';
  ctx.shadowBlur = 8;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(flx1, fly);
  ctx.lineTo(flx2, fly);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}
