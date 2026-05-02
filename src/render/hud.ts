import type { GameState } from '../sim/types';

// Sharp, high-contrast HUD for a dark arena fighter.
// No rounded SaaS panels; prioritize readability.

const INK = '#eaf2ff';
const HUD_BG = '#070910';
const HUD_STROKE = '#2a3046';
const P_COLORS = ['#4ab4ff', '#ff8844'];

export function drawHUD(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cw: number,
  ch: number,
): void {
  const [p1, p2] = state.fighters;

  const pad = 16;
  const barW = Math.min(560, Math.max(340, cw * 0.36));
  const barH = 18;
  const y = pad;

  drawHealthBar(ctx, pad, y, barW, barH, p1.hp / 1000, P_COLORS[0], true, 'P1', p1.weapon);
  drawHealthBar(ctx, cw - pad - barW, y, barW, barH, p2.hp / 1000, P_COLORS[1], false, 'P2', p2.weapon);
  drawWinPips(ctx, pad, y + barH + 6, state.p1Wins, P_COLORS[0], true);
  drawWinPips(ctx, cw - pad, y + barH + 6, state.p2Wins, P_COLORS[1], false);

  const seconds = Math.ceil(state.roundTimer / 60);
  drawTimer(ctx, cw / 2, y + barH / 2, seconds);

  // Phase overlays
  if (state.phase === 'roundEnd') {
    const winner =
      p1.hp <= 0 && p2.hp > 0 ? 'P2'
        : p2.hp <= 0 && p1.hp > 0 ? 'P1'
          : p1.hp > p2.hp ? 'P1'
            : p2.hp > p1.hp ? 'P2'
              : null;
    drawCenterText(ctx, cw, ch, winner ? `${winner} WINS ROUND` : 'DRAW');
  }

  if (state.phase === 'matchEnd') {
    const winner = state.p1Wins > state.p2Wins ? 'P1'
      : state.p2Wins > state.p1Wins ? 'P2'
        : null;
    drawCenterText(ctx, cw, ch, winner ? `${winner} WINS MATCH` : 'DRAW');

    ctx.save();
    ctx.font = '600 16px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    ctx.fillStyle = '#b7c2ffcc';
    ctx.textAlign = 'center';
    ctx.fillText('Press R to rematch', cw / 2, ch / 2 + 42);
    ctx.restore();
  }
}

function drawHealthBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  pct: number,
  accent: string,
  left: boolean,
  label: string,
  weapon: string,
): void {
  ctx.save();

  const clamped = Math.max(0, Math.min(1, pct));
  const fillW = Math.floor(w * clamped);

  // Background slab
  ctx.fillStyle = HUD_BG;
  ctx.fillRect(x - 2, y - 2, w + 4, h + 20);
  ctx.strokeStyle = HUD_STROKE;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 2, y - 2, w + 4, h + 20);

  // Bar base
  ctx.fillStyle = '#0f1320';
  ctx.fillRect(x, y, w, h);

  // Fill (hard edge + slight inner glow)
  ctx.fillStyle = accent;
  if (left) ctx.fillRect(x, y, fillW, h);
  else ctx.fillRect(x + (w - fillW), y, fillW, h);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.35;
  const gx = left ? x : x + (w - fillW);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(gx, y + 2, Math.max(0, fillW), Math.max(1, h - 4));
  ctx.restore();

  // Border
  ctx.strokeStyle = '#ffffff22';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  // Label + weapon
  ctx.font = '800 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.fillStyle = INK;
  ctx.textAlign = left ? 'left' : 'right';
  ctx.fillText(label, left ? x : x + w, y + h + 14);

  ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.fillStyle = '#c7d0ff99';
  ctx.fillText(weapon.toUpperCase(), left ? x + 32 : x + w - 32, y + h + 14);

  ctx.restore();
}

function drawTimer(ctx: CanvasRenderingContext2D, cx: number, cy: number, seconds: number): void {
  ctx.save();

  const w = 84;
  const h = 34;
  const x = cx - w / 2;
  const y = cy - h / 2 - 2;

  ctx.fillStyle = HUD_BG;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = HUD_STROKE;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  ctx.font = '900 22px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.fillStyle = seconds <= 10 ? '#ff4b4b' : INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(seconds), cx, y + h / 2 + 1);
  ctx.restore();
}

function drawCenterText(ctx: CanvasRenderingContext2D, cw: number, ch: number, text: string): void {
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = '#000000cc';
  ctx.fillRect(0, ch / 2 - 44, cw, 88);
  ctx.strokeStyle = '#ffffff22';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, ch / 2 - 44, cw, 88);

  ctx.font = '900 44px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cw / 2, ch / 2 + 2);
  ctx.restore();
}

function drawWinPips(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  wins: number,
  color: string,
  left: boolean,
): void {
  ctx.save();
  for (let i = 0; i < 2; i++) {
    const px = left ? x + i * 18 : x - (i + 1) * 18;
    ctx.fillStyle = i < wins ? color : '#0f1320';
    ctx.fillRect(px, y, 12, 8);
    ctx.strokeStyle = i < wins ? '#ffffff44' : HUD_STROKE;
    ctx.lineWidth = 2;
    ctx.strokeRect(px, y, 12, 8);
  }
  ctx.restore();
}
