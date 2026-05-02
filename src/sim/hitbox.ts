import type { FighterState, Fixed } from './types';
import type { HitboxDef } from './weapons/sword';
import { SWORD_LIGHT, SWORD_HEAVY, SWORD_SPECIAL } from './weapons/sword';
import { STAFF_LIGHT, STAFF_HEAVY, STAFF_SPECIAL } from './weapons/staff';
import { NUNCHUCKS_LIGHT, NUNCHUCKS_HEAVY, NUNCHUCKS_SPECIAL } from './weapons/nunchucks';

type AttackData = (HitboxDef | null)[];

function getAttackData(f: FighterState): AttackData | null {
  const w = f.weapon;
  const fsm = f.fsm;
  if (fsm === 'lightAtk') {
    if (w === 'sword') return SWORD_LIGHT;
    if (w === 'staff') return STAFF_LIGHT;
    return NUNCHUCKS_LIGHT;
  }
  if (fsm === 'heavyAtk') {
    if (w === 'sword') return SWORD_HEAVY;
    if (w === 'staff') return STAFF_HEAVY;
    return NUNCHUCKS_HEAVY;
  }
  if (fsm === 'weaponSpecial') {
    if (w === 'sword') return SWORD_SPECIAL;
    if (w === 'staff') return STAFF_SPECIAL;
    return NUNCHUCKS_SPECIAL;
  }
  return null;
}

export interface ActiveHitbox {
  cx: Fixed; cy: Fixed; // center in world space
  w:  Fixed; h:  Fixed; // half-extents
  def: HitboxDef;
}

export function getActiveHitbox(f: FighterState): ActiveHitbox | null {
  const data = getAttackData(f);
  if (!data) return null;
  const frame = f.fsmFrame;
  if (frame >= data.length) return null;
  const def = data[frame];
  if (!def) return null;
  const ox = f.facing === 1 ? def.ox : -def.ox;
  return {
    cx: f.pos.x + ox,
    cy: f.pos.y + def.oy,
    w: def.w,
    h: def.h,
    def,
  };
}

// Hurtbox — always active unless invincible/knockdown
export interface Hurtbox {
  cx: Fixed; cy: Fixed;
  w:  Fixed; h:  Fixed;
}

export function getHurtbox(f: FighterState): Hurtbox | null {
  if (f.invincible > 0 || f.fsm === 'knockdown' || f.fsm === 'dead') return null;
  return { cx: f.pos.x, cy: f.pos.y - 500, w: 400, h: 1000 };
}

export function rectsOverlap(
  ax: Fixed, ay: Fixed, aw: Fixed, ah: Fixed,
  bx: Fixed, by: Fixed, bw: Fixed, bh: Fixed,
): boolean {
  return Math.abs(ax - bx) < aw + bw && Math.abs(ay - by) < ah + bh;
}
