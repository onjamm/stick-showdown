import type { HitboxDef } from './sword';

export const STAFF_LIGHT: (HitboxDef | null)[] = [
  null, null, null,
  { ox: 1800, oy: -300, w: 900, h: 300, damage: 80, hitstun: 11, knockback: 1200, blockDamage: 10 },
  { ox: 1800, oy: -300, w: 900, h: 300, damage: 80, hitstun: 11, knockback: 1200, blockDamage: 10 },
  null, null, null, null, // recovery  total: 9
];

// Two-hit combo: poke then sweep
export const STAFF_HEAVY: (HitboxDef | null)[] = [
  null, null, null, null,
  { ox: 2000, oy: -400, w: 900, h: 350, damage: 90, hitstun: 12, knockback: 1400, blockDamage: 12 }, // poke
  null, null,
  { ox: 1600, oy:  200, w: 1200, h: 300, damage: 100, hitstun: 16, knockback: 2000, blockDamage: 18 }, // sweep (low)
  { ox: 1600, oy:  200, w: 1200, h: 300, damage: 100, hitstun: 16, knockback: 2000, blockDamage: 18 },
  null, null, null, null, null, null, // recovery  total: 15
];

export const STAFF_SPECIAL: (HitboxDef | null)[] = [
  null, null,
  { ox: 1400, oy: -500, w: 700, h: 700, damage: 60, hitstun: 9, knockback: 800, blockDamage: 6 },
  { ox: 1800, oy: -500, w: 700, h: 700, damage: 60, hitstun: 9, knockback: 800, blockDamage: 6 },
  { ox: 2200, oy: -200, w: 700, h: 700, damage: 60, hitstun: 9, knockback: 800, blockDamage: 6 },
  null, null, null, null, null, null, // spinning staff arc  total: 11
];

export const STAFF_TOTAL = [STAFF_LIGHT.length, STAFF_HEAVY.length, STAFF_SPECIAL.length];
