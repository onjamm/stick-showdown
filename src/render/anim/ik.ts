import type { TwoBoneSolution, Vec2 } from './types';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function len(v: Vec2): number { return Math.hypot(v.x, v.y); }

function sub(a: Vec2, b: Vec2): Vec2 { return { x: a.x - b.x, y: a.y - b.y }; }
function add(a: Vec2, b: Vec2): Vec2 { return { x: a.x + b.x, y: a.y + b.y }; }
function mul(a: Vec2, s: number): Vec2 { return { x: a.x * s, y: a.y * s }; }

function norm(v: Vec2): Vec2 {
  const l = len(v);
  return l <= 1e-6 ? { x: 1, y: 0 } : { x: v.x / l, y: v.y / l };
}

// Analytic 2-bone IK in 2D.
// bendDir: +1 bends "clockwise" relative to root->target, -1 bends the other way.
export function solveTwoBoneIK(
  root: Vec2,
  target: Vec2,
  lenA: number,
  lenB: number,
  bendDir: 1 | -1,
): TwoBoneSolution {
  const toT = sub(target, root);
  const d = len(toT);

  // Clamp reach to avoid NaNs.
  const minD = Math.abs(lenA - lenB) + 1e-6;
  const maxD = (lenA + lenB) - 1e-6;
  const cd = clamp(d, minD, maxD);

  const dir = norm(toT);

  // angle between dir and first bone:
  // cos(theta) = (a^2 + d^2 - b^2) / (2ad)
  const cosTheta = clamp((lenA * lenA + cd * cd - lenB * lenB) / (2 * lenA * cd), -1, 1);
  const theta = Math.acos(cosTheta);

  // perpendicular to dir
  const perp: Vec2 = { x: -dir.y, y: dir.x };

  const jointDir = add(mul(dir, Math.cos(theta)), mul(perp, Math.sin(theta) * bendDir));
  const joint = add(root, mul(jointDir, lenA));

  // End is target clamped along root->target
  const end = add(root, mul(dir, cd));
  return { joint, end };
}

