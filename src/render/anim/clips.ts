import type { Clip, Pose } from './types';
import type { HitboxDef } from '../../sim/weapons/sword';
import { SWORD_LIGHT, SWORD_HEAVY, SWORD_SPECIAL } from '../../sim/weapons/sword';
import { STAFF_LIGHT, STAFF_HEAVY, STAFF_SPECIAL } from '../../sim/weapons/staff';
import { NUNCHUCKS_LIGHT, NUNCHUCKS_HEAVY, NUNCHUCKS_SPECIAL } from '../../sim/weapons/nunchucks';

export const BASE_POSE: Pose = {
  hipOffset: { x: 0, y: 0 },
  torsoLean: 0.05,
  shoulderOffset: { x: 0, y: 0 },
  headOffset: { x: 0, y: 0 },
  rHandTarget: { x: 0.95, y: -0.10 }, // forward guard
  // Keep off-hand far enough from shoulder to avoid IK "min reach" popping.
  lHandTarget: { x: 0.35, y: 0.08 },  // support / guard
  rFootTarget: { x: 0.45, y: 0 },
  lFootTarget: { x: -0.45, y: 0 },
  weaponGripOffset: { x: 0, y: 0 },
  weaponAngle: -0.55,
  weaponReach: 0.55,
};

// Idle: Electric Man–style breathing sway with head bob + weapon float (32f loop).
export const CLIP_IDLE: Clip = {
  id: 'idle',
  length: 32,
  loop: true,
  keys: [
    { frame: 0,  pose: { hipOffset: { x: 0.03, y: 0.00 },  headOffset: { x: 0, y:  0.00 }, torsoLean: 0.04, rHandTarget: { x: 0.95, y: -0.08 }, lHandTarget: { x: 0.12, y:  0.08 }, weaponAngle: -0.55 } },
    { frame: 8,  pose: { hipOffset: { x: 0.00, y: -0.12 },  headOffset: { x: 0, y: -0.05 }, torsoLean: 0.07, rHandTarget: { x: 0.90, y: -0.16 }, lHandTarget: { x: 0.18, y:  0.12 }, weaponAngle: -0.62 } },
    { frame: 16, pose: { hipOffset: { x: -0.03, y: 0.02 }, headOffset: { x: 0, y:  0.01 }, torsoLean: 0.03, rHandTarget: { x: 0.98, y: -0.06 }, lHandTarget: { x: 0.10, y:  0.06 }, weaponAngle: -0.50 } },
    { frame: 24, pose: { hipOffset: { x: 0.00, y: -0.10 },  headOffset: { x: 0, y: -0.04 }, torsoLean: 0.06, rHandTarget: { x: 0.92, y: -0.14 }, lHandTarget: { x: 0.16, y:  0.10 }, weaponAngle: -0.58 } },
    { frame: 32, pose: { hipOffset: { x: 0.03, y: 0.00 },  headOffset: { x: 0, y:  0.00 }, torsoLean: 0.04, rHandTarget: { x: 0.95, y: -0.08 }, lHandTarget: { x: 0.12, y:  0.08 }, weaponAngle: -0.55 } },
  ],
};

// Walk: 8-pose loop with head bob on contact + bigger hip bounce + wider arm swing.
export const CLIP_WALK: Clip = {
  id: 'walk',
  length: 8,
  loop: true,
  keys: [
    // Contact (R forward) — body drives into step, head dips
    { frame: 0, pose: { hipOffset: { x: 0.10, y: 0.04 }, headOffset: { x: 0.06, y: 0.03 }, rFootTarget: { x: 0.80, y: 0 }, lFootTarget: { x: -0.70, y: 0 }, rHandTarget: { x: 0.45, y: 0.14 }, lHandTarget: { x: 1.28, y: -0.08 }, torsoLean: 0.20 } },
    // Down — maximum body sink
    { frame: 1, pose: { hipOffset: { x: 0.06, y: 0.22 }, headOffset: { x: 0.04, y: 0.05 }, rFootTarget: { x: 0.72, y: 0 }, lFootTarget: { x: -0.58, y: -0.14 }, rHandTarget: { x: 0.40, y: 0.18 }, lHandTarget: { x: 1.18, y: -0.04 }, torsoLean: 0.22 } },
    // Passing — knee swings through
    { frame: 2, pose: { hipOffset: { x: 0.02, y: -0.04 }, headOffset: { x: 0.02, y: 0.00 }, rFootTarget: { x: 0.42, y: 0 }, lFootTarget: { x: -0.14, y: -0.44 }, rHandTarget: { x: 0.65, y: 0.04 }, lHandTarget: { x: 1.00, y: -0.10 }, torsoLean: 0.14 } },
    // Up / loft — big knee drive, head pops up
    { frame: 3, pose: { hipOffset: { x: -0.04, y: -0.16 }, headOffset: { x: 0.01, y: -0.08 }, rFootTarget: { x: 0.12, y: 0 }, lFootTarget: { x: 0.42, y: -0.62 }, rHandTarget: { x: 0.90, y: -0.04 }, lHandTarget: { x: 0.72, y: -0.14 }, torsoLean: 0.10 } },
    // Contact (L forward)
    { frame: 4, pose: { hipOffset: { x: -0.10, y: 0.04 }, headOffset: { x: 0.06, y: 0.03 }, rFootTarget: { x: -0.70, y: 0 }, lFootTarget: { x: 0.80, y: 0 }, rHandTarget: { x: 1.28, y: -0.08 }, lHandTarget: { x: 0.45, y: 0.14 }, torsoLean: 0.20 } },
    // Down
    { frame: 5, pose: { hipOffset: { x: -0.06, y: 0.22 }, headOffset: { x: 0.04, y: 0.05 }, rFootTarget: { x: -0.58, y: -0.14 }, lFootTarget: { x: 0.72, y: 0 }, rHandTarget: { x: 1.18, y: -0.04 }, lHandTarget: { x: 0.40, y: 0.18 }, torsoLean: 0.22 } },
    // Passing
    { frame: 6, pose: { hipOffset: { x: -0.02, y: -0.04 }, headOffset: { x: 0.02, y: 0.00 }, rFootTarget: { x: -0.14, y: -0.44 }, lFootTarget: { x: 0.42, y: 0 }, rHandTarget: { x: 1.00, y: -0.10 }, lHandTarget: { x: 0.65, y: 0.04 }, torsoLean: 0.14 } },
    // Up / loft
    { frame: 7, pose: { hipOffset: { x: 0.04, y: -0.16 }, headOffset: { x: 0.01, y: -0.08 }, rFootTarget: { x: 0.42, y: -0.62 }, lFootTarget: { x: 0.12, y: 0 }, rHandTarget: { x: 0.72, y: -0.14 }, lHandTarget: { x: 0.90, y: -0.04 }, torsoLean: 0.10 } },
    // Loop seam (matches frame 0)
    { frame: 8, pose: { hipOffset: { x: 0.10, y: 0.04 }, headOffset: { x: 0.06, y: 0.03 }, rFootTarget: { x: 0.80, y: 0 }, lFootTarget: { x: -0.70, y: 0 }, rHandTarget: { x: 0.45, y: 0.14 }, lHandTarget: { x: 1.28, y: -0.08 }, torsoLean: 0.20 } },
  ],
};

// Block: strong defensive guard — nearly static, just barely breathing.
export const CLIP_BLOCK: Clip = {
  id: 'block',
  length: 8,
  loop: true,
  keys: [
    { frame: 0, pose: { torsoLean: -0.20, hipOffset: { x: -0.03, y: 0.06 }, rHandTarget: { x: 0.54, y: -0.26 }, lHandTarget: { x: 0.33, y: -0.15 }, weaponAngle: 1.22, weaponReach: 0.71 } },
    { frame: 4, pose: { torsoLean: -0.19, hipOffset: { x: -0.02, y: 0.05 }, rHandTarget: { x: 0.56, y: -0.24 }, lHandTarget: { x: 0.35, y: -0.13 }, weaponAngle: 1.21, weaponReach: 0.71 } },
    { frame: 8, pose: { torsoLean: -0.20, hipOffset: { x: -0.03, y: 0.06 }, rHandTarget: { x: 0.54, y: -0.26 }, lHandTarget: { x: 0.33, y: -0.15 }, weaponAngle: 1.22, weaponReach: 0.71 } },
  ],
};

// Hitstun: Electric Man snap — head whips back, arms flair, bigger lean.
export const CLIP_HITSTUN: Clip = {
  id: 'hitstun',
  length: 8,
  loop: false,
  keys: [
    { frame: 0, pose: { torsoLean: 0.28, hipOffset: { x: -0.08, y: 0.10 }, headOffset: { x: -0.10, y: -0.04 }, rHandTarget: { x: 0.28, y: 0.12 }, lHandTarget: { x: -0.08, y: 0.22 }, weaponReach: 0.30 } },
    { frame: 2, pose: { torsoLean: 0.55, hipOffset: { x: -0.14, y: 0.22 }, headOffset: { x: -0.22, y: -0.10 }, rHandTarget: { x: 0.02, y: 0.28 }, lHandTarget: { x: -0.25, y: 0.45 }, weaponAngle: -0.80, weaponReach: 0.20 } },
    { frame: 6, pose: { torsoLean: 0.30, hipOffset: { x: -0.08, y: 0.16 }, headOffset: { x: -0.08, y: -0.03 }, rHandTarget: { x: 0.18, y: 0.20 }, lHandTarget: { x: -0.10, y: 0.28 }, weaponReach: 0.26 } },
    { frame: 8, pose: { torsoLean: 0.24, hipOffset: { x: -0.05, y: 0.10 }, headOffset: { x: -0.02, y: 0.00 }, rHandTarget: { x: 0.26, y: 0.14 }, lHandTarget: { x: -0.04, y: 0.22 }, weaponReach: 0.30 } },
  ],
};

export const CLIP_BLOCKSTUN: Clip = {
  id: 'blockstun',
  length: 8,
  loop: false,
  keys: [
    { frame: 0, pose: { torsoLean: -0.08, hipOffset: { x: -0.02, y: 0.10 }, headOffset: { x: 0.00, y: 0.00 }, rHandTarget: { x: 0.40, y: -0.30 }, lHandTarget: { x: 0.25, y: -0.18 }, weaponAngle: 1.35, weaponReach: 0.72 } },
    { frame: 1, pose: { torsoLean: 0.06, hipOffset: { x: -0.08, y: 0.18 }, headOffset: { x: 0.05, y: 0.02 }, rHandTarget: { x: 0.28, y: -0.10 }, lHandTarget: { x: 0.04, y: 0.04 }, weaponAngle: 1.10, weaponReach: 0.66 } },
    { frame: 4, pose: { torsoLean: -0.14, hipOffset: { x: -0.04, y: 0.10 }, headOffset: { x: 0.02, y: 0.00 }, rHandTarget: { x: 0.44, y: -0.26 }, lHandTarget: { x: 0.26, y: -0.14 }, weaponAngle: 1.22, weaponReach: 0.70 } },
    { frame: 8, pose: { torsoLean: -0.18, hipOffset: { x: -0.03, y: 0.06 }, headOffset: { x: 0.00, y: 0.00 }, rHandTarget: { x: 0.52, y: -0.24 }, lHandTarget: { x: 0.34, y: -0.14 }, weaponAngle: 1.20, weaponReach: 0.70 } },
  ],
};

// Knockdown: fast fall then bounce-and-settle on the floor.
export const CLIP_KNOCKDOWN: Clip = {
  id: 'knockdown',
  length: 40,
  loop: false,
  keys: [
    { frame: 0,  pose: { torsoLean: 0.35,  hipOffset: { x: -0.12, y: 0.20 }, rHandTarget: { x: 0.10, y: 0.30 }, lHandTarget: { x: -0.20, y: 0.35 }, rFootTarget: { x: 0.20, y: -0.20 }, lFootTarget: { x: -0.30, y: -0.18 }, weaponReach: 0.22 } },
    { frame: 10, pose: { torsoLean: 1.15,  hipOffset: { x: -0.45, y: 0.55 }, rHandTarget: { x: -0.10, y: 0.45 }, lHandTarget: { x: -0.35, y: 0.45 }, rFootTarget: { x: 0.10, y: -0.10 }, lFootTarget: { x: -0.10, y: -0.10 }, weaponAngle: 0.20, weaponReach: 0.12 } },
    // Bounce slightly off floor
    { frame: 14, pose: { torsoLean: 1.10,  hipOffset: { x: -0.42, y: 0.48 }, rHandTarget: { x: -0.08, y: 0.42 }, lHandTarget: { x: -0.32, y: 0.42 }, weaponAngle: 0.15, weaponReach: 0.12 } },
    // Settle back down
    { frame: 22, pose: { torsoLean: 1.20,  hipOffset: { x: -0.40, y: 0.58 }, rHandTarget: { x: -0.05, y: 0.48 }, lHandTarget: { x: -0.30, y: 0.48 }, weaponAngle: 0.10, weaponReach: 0.12 } },
    { frame: 40, pose: { torsoLean: 1.20,  hipOffset: { x: -0.40, y: 0.60 }, rHandTarget: { x: -0.05, y: 0.48 }, lHandTarget: { x: -0.30, y: 0.48 }, rFootTarget: { x: 0.12, y: -0.08 }, lFootTarget: { x: -0.12, y: -0.08 }, weaponAngle: 0.10, weaponReach: 0.12 } },
  ],
};

// Getup: clearly staged — grounded → crawling → rising → guard.
export const CLIP_GETUP: Clip = {
  id: 'getup',
  length: 20,
  loop: false,
  keys: [
    { frame: 0,  pose: { torsoLean: 1.15, hipOffset: { x: -0.35, y: 0.55 }, rHandTarget: { x: -0.05, y: 0.48 }, lHandTarget: { x: -0.28, y: 0.48 }, rFootTarget: { x: 0.10, y: -0.08 }, lFootTarget: { x: -0.10, y: -0.08 }, weaponReach: 0.12 } },
    // Hand-and-knees crawl
    { frame: 6,  pose: { torsoLean: 0.70, hipOffset: { x: -0.15, y: 0.35 }, rHandTarget: { x: 0.35, y: 0.40 }, lHandTarget: { x: -0.08, y: 0.38 }, rFootTarget: { x: 0.30, y: 0 }, lFootTarget: { x: -0.25, y: -0.10 }, weaponAngle: -0.65, weaponReach: 0.22 } },
    // Rising
    { frame: 12, pose: { torsoLean: 0.45, hipOffset: { x: -0.08, y: 0.22 }, rHandTarget: { x: 0.20, y: 0.18 }, lHandTarget: { x: -0.02, y: 0.26 }, rFootTarget: { x: 0.42, y: 0 }, lFootTarget: { x: -0.42, y: 0 }, weaponAngle: -0.65, weaponReach: 0.38 } },
    // Back to guard
    { frame: 20, pose: { torsoLean: 0.06, hipOffset: { x: 0, y: 0.03 }, rHandTarget: { x: 0.95, y: -0.10 }, lHandTarget: { x: 0.15, y: 0.10 }, rFootTarget: { x: 0.45, y: 0 }, lFootTarget: { x: -0.45, y: 0 }, weaponAngle: -0.55, weaponReach: 0.55 } },
  ],
};

// Dash forward: explosive lunge — body near-horizontal, arms swept back.
export const CLIP_DASH_F: Clip = {
  id: 'dashF',
  length: 14,
  loop: false,
  keys: [
    { frame: 0,  pose: { torsoLean: 0.38, hipOffset: { x: 0.10, y: -0.04 }, headOffset: { x: 0.06, y: -0.02 }, rHandTarget: { x: -0.15, y: 0.18 }, lHandTarget: { x: -0.05, y: 0.18 }, rFootTarget: { x: 0.75, y: 0 }, lFootTarget: { x: -0.20, y: 0 }, weaponAngle: -0.20, weaponReach: 0.65 } },
    { frame: 5,  pose: { torsoLean: 0.55, hipOffset: { x: 0.22, y: -0.10 }, headOffset: { x: 0.10, y: -0.04 }, rHandTarget: { x: -0.30, y: 0.12 }, lHandTarget: { x: -0.18, y: 0.12 }, rFootTarget: { x: 0.65, y: -0.35 }, lFootTarget: { x: -0.10, y: 0 }, weaponAngle: -0.10, weaponReach: 0.70 } },
    { frame: 14, pose: { torsoLean: 0.08, hipOffset: { x: 0, y: 0.02 }, headOffset: { x: 0, y: 0 }, rHandTarget: { x: 0.90, y: -0.10 }, lHandTarget: { x: 0.15, y: 0.10 }, rFootTarget: { x: 0.45, y: 0 }, lFootTarget: { x: -0.45, y: 0 }, weaponAngle: -0.55, weaponReach: 0.55 } },
  ],
};

// Dash backward: quick defensive hop-away.
export const CLIP_DASH_B: Clip = {
  id: 'dashB',
  length: 14,
  loop: false,
  keys: [
    { frame: 0,  pose: { torsoLean: 0.05, hipOffset: { x: -0.05, y: 0.02 }, headOffset: { x: 0, y: 0 }, rHandTarget: { x: 0.80, y: -0.10 }, lHandTarget: { x: 0.20, y: 0.08 } } },
    { frame: 4,  pose: { torsoLean: -0.32, hipOffset: { x: -0.20, y: -0.08 }, headOffset: { x: -0.06, y: -0.03 }, rHandTarget: { x: 0.55, y: -0.08 }, lHandTarget: { x: 0.08, y: 0.14 }, rFootTarget: { x: -0.25, y: -0.38 }, lFootTarget: { x: 0.18, y: -0.10 } } },
    { frame: 10, pose: { torsoLean: -0.20, hipOffset: { x: -0.10, y: 0.06 }, headOffset: { x: -0.02, y: 0 }, rHandTarget: { x: 0.60, y: -0.20 }, lHandTarget: { x: 0.18, y: -0.08 }, rFootTarget: { x: 0.15, y: 0 }, lFootTarget: { x: -0.60, y: 0 } } },
    { frame: 14, pose: { torsoLean: 0.04, hipOffset: { x: 0, y: 0.02 }, headOffset: { x: 0, y: 0 }, rHandTarget: { x: 0.90, y: -0.10 }, lHandTarget: { x: 0.15, y: 0.10 }, rFootTarget: { x: 0.45, y: 0 }, lFootTarget: { x: -0.45, y: 0 } } },
  ],
};

type AttackData = (HitboxDef | null)[];
type AttackKind = 'lightAtk' | 'heavyAtk' | 'weaponSpecial';
type Weapon = 'sword' | 'staff' | 'nunchucks';

function getAttackData(weapon: Weapon, kind: AttackKind): AttackData {
  if (weapon === 'sword') return kind === 'lightAtk' ? SWORD_LIGHT : kind === 'heavyAtk' ? SWORD_HEAVY : SWORD_SPECIAL;
  if (weapon === 'staff') return kind === 'lightAtk' ? STAFF_LIGHT : kind === 'heavyAtk' ? STAFF_HEAVY : STAFF_SPECIAL;
  return kind === 'lightAtk' ? NUNCHUCKS_LIGHT : kind === 'heavyAtk' ? NUNCHUCKS_HEAVY : NUNCHUCKS_SPECIAL;
}

function findActiveWindow(data: AttackData): { start: number; end: number } {
  let start = -1;
  let end = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i]) {
      if (start < 0) start = i;
      end = i;
    }
  }
  if (start < 0) return { start: Math.max(0, Math.floor(data.length * 0.4)), end: Math.max(0, Math.floor(data.length * 0.4)) };
  return { start, end };
}

export function getAttackActiveWindow(weapon: Weapon, kind: AttackKind): { start: number; end: number; len: number } {
  const data = getAttackData(weapon, kind);
  const { start, end } = findActiveWindow(data);
  return { start, end, len: data.length };
}

const ATTACK_CLIP_CACHE = new Map<string, Clip>();

export function getAttackClip(weapon: Weapon, kind: AttackKind): Clip {
  const key = `${weapon}:${kind}`;
  const cached = ATTACK_CLIP_CACHE.get(key);
  if (cached) return cached;

  const data = getAttackData(weapon, kind);
  const len = data.length;
  const { start: activeStart, end: activeEnd } = findActiveWindow(data);
  const wind = Math.max(0, activeStart - 2);
  const recover = len;

  const clip: Clip = {
    id: `atk:${key}`,
    length: len,
    loop: false,
    keys: buildAttackKeys(weapon, kind, wind, activeStart, activeEnd, recover).sort((a, b) => a.frame - b.frame),
  };

  // Per-weapon flavor tweaks on top of the base key poses.
  if (weapon === 'staff') {
    for (const kf of clip.keys) {
      if (kf.pose.weaponReach != null) kf.pose.weaponReach = Math.min(1, kf.pose.weaponReach + 0.10);
      if (kf.frame >= activeStart && kf.frame <= activeEnd && kf.pose.weaponAngle != null) kf.pose.weaponAngle -= 0.10;
    }
  } else if (weapon === 'nunchucks') {
    for (const kf of clip.keys) {
      if (kf.frame >= activeStart && kf.frame <= activeEnd) {
        if (kf.pose.weaponReach != null) kf.pose.weaponReach = Math.max(0.65, kf.pose.weaponReach - 0.10);
        // Whip snap: extra weapon angle kick on the active window.
        if (kf.pose.weaponAngle != null) kf.pose.weaponAngle += 0.28;
      }
    }
  }

  ATTACK_CLIP_CACHE.set(key, clip);
  return clip;
}

function buildAttackKeys(
  weapon: Weapon,
  kind: AttackKind,
  wind: number,
  activeStart: number,
  activeEnd: number,
  recover: number,
): { frame: number; pose: Partial<typeof BASE_POSE> }[] {
  const guard = { rHandTarget: { x: 0.75, y: -0.08 }, lHandTarget: { x: 0.30, y: 0.10 } };

  if (weapon === 'sword') {
    if (kind === 'lightAtk') {
      return [
        { frame: 0,                               pose: { torsoLean: 0.02,  hipOffset: { x: -0.02, y: 0.06 }, headOffset: { x: 0.00, y: 0.00 }, weaponAngle: -0.85, weaponReach: 0.48, ...guard } },
        { frame: Math.max(0, activeStart - 1),    pose: { torsoLean: -0.18, hipOffset: { x: -0.14, y: 0.10 }, headOffset: { x: -0.04, y: 0.00 }, rHandTarget: { x: 0.12, y: 0.08 }, lHandTarget: { x: 0.15, y: 0.20 }, weaponAngle: -1.45, weaponReach: 0.36 } },
        { frame: activeStart,                     pose: { torsoLean: 0.32,  hipOffset: { x: 0.12, y: 0.05 },  headOffset: { x: 0.08, y: -0.03 }, rHandTarget: { x: 1.28, y: -0.22 }, lHandTarget: { x: 0.48, y: -0.06 }, weaponAngle: 0.08, weaponReach: 0.96 } },
        ...(activeEnd > activeStart ? [{ frame: activeEnd, pose: { torsoLean: 0.34, hipOffset: { x: 0.14, y: 0.05 }, headOffset: { x: 0.08, y: -0.03 }, rHandTarget: { x: 1.30, y: -0.20 }, lHandTarget: { x: 0.50, y: -0.04 }, weaponAngle: 0.04, weaponReach: 0.96 } }] : []),
        { frame: Math.min(recover, activeEnd + 3), pose: { torsoLean: 0.14,  hipOffset: { x: 0.05, y: 0.03 },  headOffset: { x: 0.02, y: 0.00 }, rHandTarget: { x: 0.96, y: -0.12 }, lHandTarget: { x: 0.32, y: 0.06 }, weaponAngle: -0.55, weaponReach: 0.62 } },
        { frame: recover,                          pose: { torsoLean: 0.06,  hipOffset: { x: 0.00, y: 0.02 },  headOffset: { x: 0.00, y: 0.00 }, ...guard, weaponAngle: -0.55, weaponReach: 0.55 } },
      ];
    }

    if (kind === 'heavyAtk') {
      return [
        { frame: 0,                               pose: { torsoLean: 0.02,  hipOffset: { x: -0.03, y: 0.06 }, headOffset: { x: 0.00, y: 0.00 }, weaponAngle: -0.95, weaponReach: 0.42, ...guard } },
        { frame: wind,                            pose: { torsoLean: -0.24, hipOffset: { x: -0.22, y: 0.12 }, headOffset: { x: -0.06, y: 0.00 }, rHandTarget: { x: -0.08, y: 0.12 }, lHandTarget: { x: 0.08, y: 0.24 }, weaponAngle: -1.65, weaponReach: 0.30 } },
        { frame: activeStart,                     pose: { torsoLean: 0.46,  hipOffset: { x: 0.18, y: 0.05 },  headOffset: { x: 0.14, y: -0.05 }, rHandTarget: { x: 1.50, y: -0.26 }, lHandTarget: { x: 0.60, y: -0.10 }, weaponAngle: 0.16, weaponReach: 1.00 } },
        ...(activeEnd > activeStart ? [{ frame: activeEnd, pose: { torsoLean: 0.48, hipOffset: { x: 0.20, y: 0.05 }, headOffset: { x: 0.14, y: -0.05 }, rHandTarget: { x: 1.52, y: -0.24 }, lHandTarget: { x: 0.62, y: -0.08 }, weaponAngle: 0.12, weaponReach: 1.00 } }] : []),
        { frame: Math.min(recover, activeEnd + 4), pose: { torsoLean: 0.16,  hipOffset: { x: 0.06, y: 0.03 },  headOffset: { x: 0.04, y: 0.00 }, rHandTarget: { x: 0.98, y: -0.12 }, lHandTarget: { x: 0.34, y: 0.06 }, weaponAngle: -0.55, weaponReach: 0.60 } },
        { frame: recover,                          pose: { torsoLean: 0.06,  hipOffset: { x: 0.00, y: 0.02 },  headOffset: { x: 0.00, y: 0.00 }, ...guard, weaponAngle: -0.55, weaponReach: 0.55 } },
      ];
    }

    // sword special — lunge thrust
    return [
      { frame: 0,                            pose: { torsoLean: 0.00,  hipOffset: { x: -0.02, y: 0.06 },  headOffset: { x: 0.00, y: 0.00 }, weaponAngle: -0.70, weaponReach: 0.50, ...guard } },
      { frame: Math.max(0, activeStart - 1), pose: { torsoLean: -0.10, hipOffset: { x: -0.18, y: 0.10 }, headOffset: { x: -0.04, y: 0.00 }, rHandTarget: { x: 0.32, y: -0.02 }, lHandTarget: { x: 0.22, y: 0.18 }, weaponAngle: -0.98, weaponReach: 0.40 } },
      { frame: activeStart,                  pose: { torsoLean: 0.26,  hipOffset: { x: 0.20, y: 0.04 },  headOffset: { x: 0.10, y: -0.02 }, rHandTarget: { x: 1.52, y: -0.10 }, lHandTarget: { x: 0.60, y: -0.02 }, weaponAngle: 0.00, weaponReach: 1.00 } },
      { frame: recover,                      pose: { torsoLean: 0.06,  hipOffset: { x: 0.00, y: 0.02 },  headOffset: { x: 0.00, y: 0.00 }, ...guard, weaponAngle: -0.55, weaponReach: 0.55 } },
    ];
  }

  // Staff + nunchucks: two-handed weapon, bigger sweep arcs.
  const longer = weapon === 'staff';
  const reach = longer ? 0.95 : 0.85;
  return [
    { frame: 0,          pose: { torsoLean: 0.02,  hipOffset: { x: -0.02, y: 0.06 },  headOffset: { x: 0.00, y: 0.00 }, rHandTarget: { x: 0.70, y: -0.06 }, lHandTarget: { x: 0.40, y: 0.10 }, weaponAngle: -0.85, weaponReach: 0.50 } },
    { frame: wind,       pose: { torsoLean: -0.20, hipOffset: { x: -0.18, y: 0.12 }, headOffset: { x: -0.05, y: 0.00 }, rHandTarget: { x: 0.12, y: 0.12 }, lHandTarget: { x: 0.18, y: 0.24 }, weaponAngle: longer ? -1.30 : -1.15, weaponReach: 0.40 } },
    { frame: activeStart, pose: { torsoLean: 0.36,  hipOffset: { x: 0.14, y: 0.05 },  headOffset: { x: 0.08, y: -0.02 }, rHandTarget: { x: 1.30, y: -0.20 }, lHandTarget: { x: 0.60, y: -0.08 }, weaponAngle: longer ? 0.04 : 0.18, weaponReach: reach } },
    ...(activeEnd > activeStart ? [{ frame: activeEnd, pose: { torsoLean: 0.38, hipOffset: { x: 0.16, y: 0.05 }, headOffset: { x: 0.08, y: -0.02 }, rHandTarget: { x: 1.32, y: -0.18 }, lHandTarget: { x: 0.62, y: -0.06 }, weaponAngle: longer ? 0.00 : 0.14, weaponReach: reach } }] : []),
    { frame: recover,    pose: { torsoLean: 0.06,  hipOffset: { x: 0.00, y: 0.02 },  headOffset: { x: 0.00, y: 0.00 }, rHandTarget: { x: 0.75, y: -0.08 }, lHandTarget: { x: 0.40, y: 0.10 }, weaponAngle: -0.55, weaponReach: 0.55 } },
  ];
}
