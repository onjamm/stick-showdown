import type { HitboxDef } from './sword';

// Fast 3-hit string, short range, chip on block
export const NUNCHUCKS_LIGHT: (HitboxDef | null)[] = [
  null, null,
  { ox: 1200, oy: -200, w: 600, h: 400, damage: 55, hitstun: 8, knockback: 800, blockDamage: 6 },
  { ox: 1200, oy: -200, w: 600, h: 400, damage: 55, hitstun: 8, knockback: 800, blockDamage: 6 },
  null, null, null, // total: 7
];

export const NUNCHUCKS_HEAVY: (HitboxDef | null)[] = [
  null, null, null,
  { ox: 1100, oy: -300, w: 700, h: 500, damage: 75, hitstun: 12, knockback: 1200, blockDamage: 9 },
  { ox: 1300, oy:    0, w: 700, h: 500, damage: 75, hitstun: 12, knockback: 1200, blockDamage: 9 },
  null, null, null, null, // total: 9
];

// 3-hit rapid string
export const NUNCHUCKS_SPECIAL: (HitboxDef | null)[] = [
  null,
  { ox: 1000, oy: -200, w: 500, h: 400, damage: 45, hitstun: 7, knockback: 600, blockDamage: 5 },
  null,
  { ox: 1200, oy: -100, w: 500, h: 400, damage: 45, hitstun: 7, knockback: 600, blockDamage: 5 },
  null,
  { ox: 1400, oy: -300, w: 500, h: 400, damage: 45, hitstun: 7, knockback: 700, blockDamage: 5 },
  null, null, null, // total: 9
];

export const NUNCHUCKS_TOTAL = [NUNCHUCKS_LIGHT.length, NUNCHUCKS_HEAVY.length, NUNCHUCKS_SPECIAL.length];
