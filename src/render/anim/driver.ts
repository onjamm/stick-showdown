import type { FighterState } from '../../sim/types';
import type { Pose } from './types';
import { BASE_POSE, CLIP_BLOCK, CLIP_BLOCKSTUN, CLIP_GETUP, CLIP_HITSTUN, CLIP_IDLE, CLIP_KNOCKDOWN, CLIP_WALK, getAttackClip } from './clips';
import { sampleClip, blendPose } from './sample';
import { applyAttackExaggeration, type Exaggeration } from './exaggeration';

const WALK_SPEED_BASE = 140;

const HITSTUN_FRAMES = 8;
const KNOCKDOWN_FRAMES = 40;
const GETUP_FRAMES = 20;
const BLOCKSTUN_FRAMES = 8;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function abs(v: number): number { return v < 0 ? -v : v; }

function getClipFor(f: FighterState) {
  if (f.fsm === 'lightAtk' || f.fsm === 'heavyAtk' || f.fsm === 'weaponSpecial') {
    return getAttackClip(f.weapon, f.fsm);
  }
  if (f.fsm === 'walkF' || f.fsm === 'walkB') return CLIP_WALK;
  if (f.fsm === 'block') return CLIP_BLOCK;
  if (f.fsm === 'blockStun') return CLIP_BLOCKSTUN;
  if (f.fsm === 'hitStun') return CLIP_HITSTUN;
  if (f.fsm === 'knockdown') return CLIP_KNOCKDOWN;
  if (f.fsm === 'getup') return CLIP_GETUP;
  return CLIP_IDLE;
}

function getClipTime(f: FighterState, alpha: number, globalFrame: number): number {
  if (f.fsm === 'lightAtk' || f.fsm === 'heavyAtk' || f.fsm === 'weaponSpecial') {
    return f.fsmFrame + alpha;
  }
  if (f.fsm === 'hitStun') return clamp(f.fsmFrame + alpha, 0, HITSTUN_FRAMES);
  if (f.fsm === 'blockStun') return clamp(f.fsmFrame + alpha, 0, BLOCKSTUN_FRAMES);
  if (f.fsm === 'knockdown') return clamp(f.fsmFrame + alpha, 0, KNOCKDOWN_FRAMES);
  if (f.fsm === 'getup') return clamp(f.fsmFrame + alpha, 0, GETUP_FRAMES);

  if (f.fsm === 'walkF' || f.fsm === 'walkB') {
    // Electric Man-ish cadence: 8 poses; advance proportional to abs(vel.x).
    const speed = abs(f.vel.x);
    const k = (speed / WALK_SPEED_BASE) * 0.33; // tuned for readability
    return globalFrame * k;
  }

  if (f.fsm === 'block') {
    return globalFrame * 0.12;
  }

  // idle
  return globalFrame * 0.25;
}

function applyContextualAdjustments(p: Pose, f: FighterState): Pose {
  // Walk backward reads better with slight lean away from opponent.
  if (f.fsm === 'walkB') {
    return { ...p, torsoLean: p.torsoLean - 0.06, hipOffset: { x: p.hipOffset.x - 0.04, y: p.hipOffset.y } };
  }
  return p;
}

// Deterministic visual pose sampling from clips, keyed to sim state.
export function sampleFighterPose(
  prevF: FighterState,
  f: FighterState,
  alpha: number,
  globalFrame: number,
): { pose: Pose; ex: Exaggeration } {
  const clipA = getClipFor(prevF);
  const clipB = getClipFor(f);
  const tA = getClipTime(prevF, alpha, globalFrame);
  const tB = getClipTime(f, alpha, globalFrame);

  const poseA = applyContextualAdjustments(sampleClip(clipA, tA, BASE_POSE), prevF);
  const poseB = applyContextualAdjustments(sampleClip(clipB, tB, BASE_POSE), f);

  // Crossfade at FSM boundaries using alpha (visual-only interpolation).
  const blended = blendPose(poseA, poseB, alpha);

  // Two-hand handling for staff/nunchucks: pull the left hand closer to the weapon for a "held" read.
  let adjusted = blended;
  if (f.weapon !== 'sword') {
    // Encourage off-hand to stay nearer center line so we can later attach it to weapon.
    adjusted = {
      ...adjusted,
      lHandTarget: {
        x: clamp(adjusted.lHandTarget.x, -0.35, 0.65),
        y: clamp(adjusted.lHandTarget.y, -0.25, 0.45),
      },
    };
  }

  // Add deterministic action exaggeration on attacks (stretch/squash + follow-through).
  const exApplied = applyAttackExaggeration(adjusted, f, alpha);
  return exApplied;
}
