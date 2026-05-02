import type { Clip, Pose, PosePatch, Vec2 } from './types';

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

export function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function blendPose(a: Pose, b: Pose, t: number): Pose {
  const x = clamp01(t);
  return {
    hipOffset: lerpV(a.hipOffset, b.hipOffset, x),
    torsoLean: lerp(a.torsoLean, b.torsoLean, x),
    shoulderOffset: lerpV(a.shoulderOffset, b.shoulderOffset, x),
    headOffset: lerpV(a.headOffset, b.headOffset, x),
    rHandTarget: lerpV(a.rHandTarget, b.rHandTarget, x),
    lHandTarget: lerpV(a.lHandTarget, b.lHandTarget, x),
    rFootTarget: lerpV(a.rFootTarget, b.rFootTarget, x),
    lFootTarget: lerpV(a.lFootTarget, b.lFootTarget, x),
    weaponGripOffset: lerpV(a.weaponGripOffset, b.weaponGripOffset, x),
    weaponAngle: lerp(a.weaponAngle, b.weaponAngle, x),
    weaponReach: lerp(a.weaponReach, b.weaponReach, x),
  };
}

export function sampleClip(clip: Clip, f: number, base: Pose): Pose {
  if (clip.keys.length === 0) return base;

  const len = Math.max(1, clip.length);
  const ff = clip.loop ? mod(f, len) : Math.max(0, Math.min(f, len));

  // Find bracketing keys.
  let k0 = clip.keys[0];
  let k1 = clip.keys[clip.keys.length - 1];
  for (let i = 0; i < clip.keys.length - 1; i++) {
    const a = clip.keys[i];
    const b = clip.keys[i + 1];
    if (ff >= a.frame && ff <= b.frame) { k0 = a; k1 = b; break; }
    if (ff < clip.keys[0].frame) { k0 = clip.keys[0]; k1 = clip.keys[0]; break; }
  }

  if (k0.frame === k1.frame) return applyPatch(base, k0.pose);

  const t = easeInOutCubic((ff - k0.frame) / (k1.frame - k0.frame));
  const pA = applyPatch(base, k0.pose);
  const pB = applyPatch(base, k1.pose);
  return blendPose(pA, pB, t);
}

function applyPatch(base: Pose, patch: PosePatch): Pose {
  return {
    hipOffset: patch.hipOffset ?? base.hipOffset,
    torsoLean: patch.torsoLean ?? base.torsoLean,
    shoulderOffset: patch.shoulderOffset ?? base.shoulderOffset,
    headOffset: patch.headOffset ?? base.headOffset,
    rHandTarget: patch.rHandTarget ?? base.rHandTarget,
    lHandTarget: patch.lHandTarget ?? base.lHandTarget,
    rFootTarget: patch.rFootTarget ?? base.rFootTarget,
    lFootTarget: patch.lFootTarget ?? base.lFootTarget,
    weaponGripOffset: patch.weaponGripOffset ?? base.weaponGripOffset,
    weaponAngle: patch.weaponAngle ?? base.weaponAngle,
    weaponReach: patch.weaponReach ?? base.weaponReach,
  };
}

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function lerpV(a: Vec2, b: Vec2, t: number): Vec2 { return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }; }

function mod(x: number, m: number): number {
  const r = x % m;
  return r < 0 ? r + m : r;
}

