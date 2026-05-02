// Renderer — read-only consumer of GameState. Never mutates sim state.
import type { GameState } from '../sim/types';
import type { Camera } from './camera';
import { makeCamera, updateCamera, worldToScreen, worldScaleToPixels } from './camera';
import { drawFighter } from './stickFigure';
import { drawEffects, updateEffects, getShakeOffset, spawnSparks, triggerShake } from './effects';
import { drawHUD } from './hud';
import { drawArenaBackground, drawArenaStage } from './stage';
import { getActiveHitbox, getHurtbox } from '../sim/hitbox';
import {
  soundLightHit, soundHeavyHit, soundBlock, soundKnockdown, soundRoundEnd,
} from './audio';

let debugMode = false;
export function toggleDebug(): void { debugMode = !debugMode; }

export interface Renderer {
  canvas: HTMLCanvasElement;
  draw(prev: GameState, curr: GameState, alpha: number): void;
}

export function makeRenderer(canvas: HTMLCanvasElement): Renderer {
  const ctx = canvas.getContext('2d')!;
  const cam = makeCamera();
  let prevPhase = 'fight';

  function resize(): void {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function draw(prev: GameState, curr: GameState, alpha: number): void {
    const cw = canvas.width;
    const ch = canvas.height;

    // ── Audio + effect triggers (state transition detection) ─────────────────
    for (let i = 0; i < 2; i++) {
      const pf = prev.fighters[i];
      const cf = curr.fighters[i];
      if (cf.lastHitFrame !== pf.lastHitFrame && cf.lastHitFrame > 0) {
        if (cf.fsm === 'knockdown' && pf.fsm !== 'knockdown') {
          soundKnockdown();
          spawnSparks(cf.pos.x, cf.pos.y - 800, 16, i === 0 ? '#4ab4ff' : '#ff8844');
          triggerShake(10, 14);
        } else if (cf.fsm === 'blockStun' && pf.fsm !== 'blockStun') {
          soundBlock();
          spawnSparks(cf.pos.x, cf.pos.y - 800, 6, '#cccccc');
          triggerShake(2, 4);
        } else {
          const heavy = prev.fighters[1 - i].fsm === 'heavyAtk'
                     || prev.fighters[1 - i].fsm === 'weaponSpecial';
          heavy ? soundHeavyHit() : soundLightHit();
          spawnSparks(cf.pos.x, cf.pos.y - 800, heavy ? 14 : 8,
            i === 0 ? '#4ab4ff' : '#ff8844');
          triggerShake(heavy ? 8 : 3, heavy ? 12 : 6);
        }
      }
    }

    if (curr.phase === 'roundEnd' && prevPhase === 'fight') soundRoundEnd();
    prevPhase = curr.phase;

    updateCamera(cam, curr.fighters[0].pos.x, curr.fighters[1].pos.x);
    updateEffects();
    const [shx, shy] = getShakeOffset();

    ctx.save();
    ctx.translate(shx, shy);

    // ── Background ────────────────────────────────────────────────────────────
    drawArenaBackground(ctx, cam, cw, ch);

    // ── Stage floor ───────────────────────────────────────────────────────────
    drawArenaStage(ctx, cam, cw, ch);

    const distX = Math.abs(curr.fighters[0].pos.x - curr.fighters[1].pos.x);
    const crowd = Math.max(0, Math.min(1, (2600 - distX) / 2600));

    // ── Fighters (draw back-to-front for overlap readability) ──
    const order: [0 | 1, 0 | 1] = curr.fighters[0].pos.x <= curr.fighters[1].pos.x ? [0, 1] : [1, 0];
    const foregroundIdx = order[1];
    for (const i of order) {
      drawFighter(
        ctx,
        curr.fighters[i],
        alpha,
        prev.fighters[i],
        cam,
        i,
        cw,
        ch,
        curr.frame,
        crowd,
        i === foregroundIdx,
      );
    }

    // ── Debug hitboxes ────────────────────────────────────────────────────────
    if (debugMode) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 2; i++) {
        const f  = curr.fighters[i];
        const hb = getActiveHitbox(f);
        if (hb) {
          const [sx, sy] = worldToScreen(cam, hb.cx, hb.cy, cw, ch);
          const sw = worldScaleToPixels(cam, hb.w);
          const sh = worldScaleToPixels(cam, hb.h);
          ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 2;
          ctx.strokeRect(sx - sw, sy - sh, sw * 2, sh * 2);
        }
        const hurt = getHurtbox(f);
        if (hurt) {
          const [sx, sy] = worldToScreen(cam, hurt.cx, hurt.cy, cw, ch);
          const sw = worldScaleToPixels(cam, hurt.w);
          const sh = worldScaleToPixels(cam, hurt.h);
          ctx.strokeStyle = '#44ff44'; ctx.lineWidth = 1;
          ctx.strokeRect(sx - sw, sy - sh, sw * 2, sh * 2);
        }
      }
      ctx.restore();
    }

    drawEffects(ctx, cam, cw, ch);
    ctx.restore();

    // HUD — no shake
    drawHUD(ctx, curr, cw, ch);

    // Debug text
    if (debugMode) {
      ctx.save();
      ctx.font = '11px monospace'; ctx.fillStyle = '#0009';
      ctx.fillRect(0, 0, 280, 106);
      ctx.fillStyle = '#8f8';
      [
        `frame: ${curr.frame}`,
        `P1  hp=${curr.fighters[0].hp}  fsm=${curr.fighters[0].fsm}[${curr.fighters[0].fsmFrame}]`,
        `P2  hp=${curr.fighters[1].hp}  fsm=${curr.fighters[1].fsm}[${curr.fighters[1].fsmFrame}]`,
        `round ${curr.roundIndex + 1}  wins ${curr.p1Wins}-${curr.p2Wins}  t=${Math.ceil(curr.roundTimer / 60)}s`,
        `zoom=${cam.zoom.toFixed(1)}  alpha=${alpha.toFixed(3)}`,
      ].forEach((l, i) => ctx.fillText(l, 8, 16 + i * 18));
      ctx.restore();
    }
  }

  return { canvas, draw };
}

// ── Background ────────────────────────────────────────────────────────────────
function drawBackground(
  ctx: CanvasRenderingContext2D,
  cam: Camera, cw: number, ch: number,
): void {
  // Deep dark gradient — top slightly blue-tinted, bottom near-black
  const bg = ctx.createLinearGradient(0, 0, 0, ch);
  bg.addColorStop(0,   '#0a0c14');
  bg.addColorStop(0.6, '#080a10');
  bg.addColorStop(1,   '#060608');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cw, ch);

  // Subtle ambient vignette
  const vig = ctx.createRadialGradient(cw / 2, ch * 0.5, ch * 0.1, cw / 2, ch * 0.5, ch * 0.85);
  vig.addColorStop(0,   'transparent');
  vig.addColorStop(1,   '#00000088');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, cw, ch);

  // Distant floor reflection / atmosphere glow
  const [, fly] = worldToScreen(cam, 0, 0, cw, ch);
  const glow = ctx.createRadialGradient(cw / 2, fly, 0, cw / 2, fly, cw * 0.7);
  glow.addColorStop(0,   '#1a2a3a18');
  glow.addColorStop(0.5, '#0d1a2a0a');
  glow.addColorStop(1,   'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, cw, ch);
}

// ── Stage ─────────────────────────────────────────────────────────────────────
function drawStage(
  ctx: CanvasRenderingContext2D,
  cam: Camera, cw: number, ch: number,
): void {
  const [flx1, fly] = worldToScreen(cam, -8000, 0, cw, ch);
  const [flx2]      = worldToScreen(cam,  8000, 0, cw, ch);
  const stageW      = flx2 - flx1;

  // Floor shadow/reflection beneath the line
  const refl = ctx.createLinearGradient(0, fly, 0, fly + worldScaleToPixels(cam, 2000));
  refl.addColorStop(0,   '#4ab4ff0a');
  refl.addColorStop(1,   'transparent');
  ctx.fillStyle = refl;
  ctx.fillRect(flx1, fly, stageW, worldScaleToPixels(cam, 2000));

  // Solid floor base
  ctx.strokeStyle = '#2a2d3a';
  ctx.lineWidth   = 3;
  ctx.beginPath();
  ctx.moveTo(flx1, fly);
  ctx.lineTo(flx2, fly);
  ctx.stroke();

  // P1-side glow (blue, left half)
  const gL = ctx.createLinearGradient(flx1, 0, cw / 2, 0);
  gL.addColorStop(0,   'transparent');
  gL.addColorStop(0.3, '#4ab4ff55');
  gL.addColorStop(1,   '#4ab4ff22');
  ctx.strokeStyle = gL;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(flx1, fly);
  ctx.lineTo(cw / 2, fly);
  ctx.stroke();

  // P2-side glow (orange, right half)
  const gR = ctx.createLinearGradient(cw / 2, 0, flx2, 0);
  gR.addColorStop(0,   '#ff884422');
  gR.addColorStop(0.7, '#ff884455');
  gR.addColorStop(1,   'transparent');
  ctx.strokeStyle = gR;
  ctx.beginPath();
  ctx.moveTo(cw / 2, fly);
  ctx.lineTo(flx2, fly);
  ctx.stroke();

  // Wall edge markers
  const wallH = worldScaleToPixels(cam, 1500);
  ctx.lineWidth = 1;
  for (const [wx, col] of [[-8000, '#4ab4ff33'], [8000, '#ff884433']] as [number, string][]) {
    const [wsx] = worldToScreen(cam, wx, 0, cw, ch);
    const wg = ctx.createLinearGradient(0, fly - wallH, 0, fly);
    wg.addColorStop(0,   'transparent');
    wg.addColorStop(1,   col);
    ctx.strokeStyle = wg;
    ctx.beginPath();
    ctx.moveTo(wsx, fly - wallH);
    ctx.lineTo(wsx, fly);
    ctx.stroke();
  }
}
