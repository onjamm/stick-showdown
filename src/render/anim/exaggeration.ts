import type { FighterState } from '../../sim/types';
import type { Pose } from './types';
import { easeInOutCubic } from './sample';
import { getAttackActiveWindow } from './clips';

export interface Exaggeration {
  armStretch: number;     // 1..1.2
  torsoSquash: number;    // 0.9..1.05 (visual-only)
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

function addPose(p: Pose, d: Partial<Pose>): Pose {
  return {
    ...p,
    hipOffset: d.hipOffset ? { x: p.hipOffset.x + d.hipOffset.x, y: p.hipOffset.y + d.hipOffset.y } : p.hipOffset,
    shoulderOffset: d.shoulderOffset ? { x: p.shoulderOffset.x + d.shoulderOffset.x, y: p.shoulderOffset.y + d.shoulderOffset.y } : p.shoulderOffset,
    headOffset: d.headOffset ? { x: p.headOffset.x + d.headOffset.x, y: p.headOffset.y + d.headOffset.y } : p.headOffset,
    rHandTarget: d.rHandTarget ? { x: p.rHandTarget.x + d.rHandTarget.x, y: p.rHandTarget.y + d.rHandTarget.y } : p.rHandTarget,
    lHandTarget: d.lHandTarget ? { x: p.lHandTarget.x + d.lHandTarget.x, y: p.lHandTarget.y + d.lHandTarget.y } : p.lHandTarget,
    rFootTarget: d.rFootTarget ? { x: p.rFootTarget.x + d.rFootTarget.x, y: p.rFootTarget.y + d.rFootTarget.y } : p.rFootTarget,
    lFootTarget: d.lFootTarget ? { x: p.lFootTarget.x + d.lFootTarget.x, y: p.lFootTarget.y + d.lFootTarget.y } : p.lFootTarget,
    weaponGripOffset: d.weaponGripOffset ? { x: p.weaponGripOffset.x + d.weaponGripOffset.x, y: p.weaponGripOffset.y + d.weaponGripOffset.y } : p.weaponGripOffset,
    torsoLean: p.torsoLean + (d.torsoLean ?? 0),
    weaponAngle: p.weaponAngle + (d.weaponAngle ?? 0),
    weaponReach: p.weaponReach + (d.weaponReach ?? 0),
  };
}

// Alan Becker-ish readability: plan full action (key poses) then add a small deterministic
// exaggeration layer around impact frames: stretch on contact, squash + follow-through after.
export function applyAttackExaggeration(
  pose: Pose,
  f: FighterState,
  alpha: number,
): { pose: Pose; ex: Exaggeration } {
  if (f.fsm !== 'lightAtk' && f.fsm !== 'heavyAtk' && f.fsm !== 'weaponSpecial') {
    return { pose, ex: { armStretch: 1, torsoSquash: 1 } };
  }

  const t = f.fsmFrame + alpha;
  const { start, end, len } = getAttackActiveWindow(f.weapon, f.fsm);

  // Normalized phases.
  const pre = clamp((t) / Math.max(1, start), 0, 1);
  const post = clamp((t - end) / Math.max(1, (len - end)), 0, 1);

  // Impact pulse: tight window around first active frame.
  const impactWindow = 0.9;
  const impactT = clamp((t - start) / impactWindow, 0, 1);
  const impact = 1 - Math.abs(impactT * 2 - 1); // triangle
  const impactK = easeInOutCubic(impact);

  // Anticipation squash (slight crouch + pull hands in).
  const ant = easeInOutCubic(pre);
  const antK = (t < start ? (1 - ant) : 0);

  // Follow-through recoil (overshoot back then settle).
  const ft = easeInOutCubic(post);
  const ftK = (t > end ? (1 - ft) : 0);

  const punchiness = f.fsm === 'heavyAtk' ? 1.0 : f.fsm === 'weaponSpecial' ? 0.9 : 0.75;

  // Additive pose offsets (in U units).
  let out = pose;
  if (antK > 0) {
    out = addPose(out, {
      hipOffset: { x: -0.06 * antK, y: 0.08 * antK },
      shoulderOffset: { x: -0.02 * antK, y: 0.04 * antK },
      rHandTarget: { x: -0.18 * antK, y: 0.08 * antK },
      lHandTarget: { x: -0.10 * antK, y: 0.05 * antK },
      weaponReach: -0.06 * antK,
      torsoLean: -0.06 * antK,
    });
  }

  if (impactK > 0) {
    out = addPose(out, {
      hipOffset: { x: 0.08 * impactK * punchiness, y: -0.02 * impactK },
      shoulderOffset: { x: 0.02 * impactK, y: -0.02 * impactK },
      rHandTarget: { x: 0.22 * impactK * punchiness, y: -0.06 * impactK },
      lHandTarget: { x: 0.10 * impactK, y: -0.03 * impactK },
      weaponReach: 0.10 * impactK,
      torsoLean: 0.10 * impactK * punchiness,
    });
  }

  if (ftK > 0) {
    out = addPose(out, {
      hipOffset: { x: -0.05 * ftK, y: 0.04 * ftK },
      rHandTarget: { x: -0.10 * ftK, y: 0.05 * ftK },
      lHandTarget: { x: -0.06 * ftK, y: 0.04 * ftK },
      weaponReach: -0.04 * ftK,
      torsoLean: -0.04 * ftK,
    });
  }

  const armStretch = clamp(lerp(1, 1.16, impactK * punchiness), 1, 1.18);
  const torsoSquash = clamp(1 - antK * 0.05 + impactK * 0.03 - ftK * 0.02, 0.92, 1.05);

  return { pose: out, ex: { armStretch, torsoSquash } };
}

