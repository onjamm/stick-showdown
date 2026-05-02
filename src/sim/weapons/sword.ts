// Sword: slow, long reach, high single-hit damage
// Hitbox coords are relative to fighter facing right (flip x if facing left)

export interface HitboxDef {
  ox: number; oy: number; // offset from pos in Fixed units
  w: number;  h: number;  // half-extents in Fixed units
  damage: number;         // HP
  hitstun: number;        // frames
  knockback: number;      // Fixed velocity applied on hit
  blockDamage: number;    // stamina cost to blocker
}

// Maps fsmFrame → HitboxDef | null (null = no active hitbox this frame)
export const SWORD_LIGHT: (HitboxDef | null)[] = [
  null, null, null, null,           // startup: 4 frames
  { ox: 2200, oy: -200, w: 1000, h: 400, damage: 120, hitstun: 14, knockback: 1800, blockDamage: 15 }, // active: 1
  { ox: 2200, oy: -200, w: 1000, h: 400, damage: 120, hitstun: 14, knockback: 1800, blockDamage: 15 },
  null, null, null, null, null, null, // recovery: 6 frames  total: 12
];

export const SWORD_HEAVY: (HitboxDef | null)[] = [
  null, null, null, null, null, null, null, // startup: 7
  { ox: 2400, oy: -300, w: 1200, h: 500, damage: 220, hitstun: 22, knockback: 3200, blockDamage: 35 }, // active: 2
  { ox: 2400, oy: -300, w: 1200, h: 500, damage: 220, hitstun: 22, knockback: 3200, blockDamage: 35 },
  null, null, null, null, null, null, null, null, null, // recovery: 9  total: 18
];

export const SWORD_SPECIAL: (HitboxDef | null)[] = [
  null, null, null,
  { ox: 1800, oy: -100, w: 800, h: 300, damage: 80, hitstun: 10, knockback: 1000, blockDamage: 8 },
  { ox: 2200, oy: -100, w: 800, h: 300, damage: 80, hitstun: 10, knockback: 1000, blockDamage: 8 },
  { ox: 2600, oy: -100, w: 800, h: 300, damage: 80, hitstun: 10, knockback: 1000, blockDamage: 8 },
  null, null, null, null, null, null, null, null, // thrust lunge  total: 14
];

export const SWORD_TOTAL = [SWORD_LIGHT.length, SWORD_HEAVY.length, SWORD_SPECIAL.length];
