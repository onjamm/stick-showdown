// Fighter FSM step logic — pure, no I/O
import type { FighterState, InputFrame, Weapon } from './types';
import { INPUT_LEFT, INPUT_RIGHT, INPUT_LIGHT_ATK, INPUT_HEAVY_ATK, INPUT_BLOCK }
  from '../../shared/protocol';
import { applyWalkVelocity } from './physics';
import { SWORD_LIGHT, SWORD_HEAVY, SWORD_SPECIAL } from './weapons/sword';
import { STAFF_LIGHT, STAFF_HEAVY, STAFF_SPECIAL } from './weapons/staff';
import { NUNCHUCKS_LIGHT, NUNCHUCKS_HEAVY, NUNCHUCKS_SPECIAL } from './weapons/nunchucks';

const HITSTUN_MIN  = 8;
const KNOCKDOWN_FRAMES = 40;
const GETUP_FRAMES     = 20;
const BLOCK_STUN_FRAMES = 8;
const STAMINA_REGEN    = 1;   // per frame when not blocking
const STAMINA_MAX      = 100;

function attackLength(w: Weapon, fsm: 'lightAtk' | 'heavyAtk' | 'weaponSpecial'): number {
  const table = {
    sword:      [SWORD_LIGHT.length,      SWORD_HEAVY.length,      SWORD_SPECIAL.length],
    staff:      [STAFF_LIGHT.length,      STAFF_HEAVY.length,      STAFF_SPECIAL.length],
    nunchucks:  [NUNCHUCKS_LIGHT.length,  NUNCHUCKS_HEAVY.length,  NUNCHUCKS_SPECIAL.length],
  } as const;
  const idx = fsm === 'lightAtk' ? 0 : fsm === 'heavyAtk' ? 1 : 2;
  return table[w][idx];
}

export function stepFighter(f: FighterState, input: InputFrame, opponentX: number): void {
  // Decrement counters
  if (f.invincible > 0) f.invincible--;

  // Facing update — only when idle/walking
  if (f.fsm === 'idle' || f.fsm === 'walkF' || f.fsm === 'walkB') {
    f.facing = opponentX > f.pos.x ? 1 : -1;
  }

  // Stamina regen when not blocking
  if (f.fsm !== 'block' && f.stamina < STAMINA_MAX) {
    f.stamina = Math.min(STAMINA_MAX, f.stamina + STAMINA_REGEN);
  }

  const pressLight  = !!(input & INPUT_LIGHT_ATK);
  const pressHeavy  = !!(input & INPUT_HEAVY_ATK);
  const pressBlock  = !!(input & INPUT_BLOCK);
  const pressLeft   = !!(input & INPUT_LEFT);
  const pressRight  = !!(input & INPUT_RIGHT);

  const movingForward  = f.facing ===  1 ? pressRight : pressLeft;
  const movingBackward = f.facing === -1 ? pressRight : pressLeft;

  switch (f.fsm) {
    // ── Ground neutral ────────────────────────────────────────────────────────
    case 'idle':
    case 'walkF':
    case 'walkB': {
      f.vel.x = 0;
      if (pressLight) {
        f.fsm = 'lightAtk'; f.fsmFrame = 0; f.hitboxActive = false;
      } else if (pressHeavy) {
        f.fsm = 'heavyAtk'; f.fsmFrame = 0; f.hitboxActive = false;
      } else if (pressBlock && f.stamina > 0) {
        f.fsm = 'block'; f.fsmFrame = 0;
      } else if (movingForward) {
        f.fsm = 'walkF'; applyWalkVelocity(f, f.facing * 140);
      } else if (movingBackward) {
        f.fsm = 'walkB'; applyWalkVelocity(f, -f.facing * 110);
      } else {
        f.fsm = 'idle'; f.vel.x = 0;
      }
      break;
    }

    // ── Block ─────────────────────────────────────────────────────────────────
    case 'block': {
      f.vel.x = 0;
      if (!pressBlock || f.stamina <= 0) {
        f.fsm = 'idle'; f.fsmFrame = 0;
      }
      break;
    }

    case 'blockStun': {
      f.fsmFrame++;
      if (f.fsmFrame >= BLOCK_STUN_FRAMES) {
        f.fsm = 'idle'; f.fsmFrame = 0;
      }
      break;
    }

    // ── Attacks ───────────────────────────────────────────────────────────────
    case 'lightAtk':
    case 'heavyAtk':
    case 'weaponSpecial': {
      f.fsmFrame++;
      const len = attackLength(f.weapon, f.fsm);
      if (f.fsmFrame >= len) {
        f.fsm = 'idle'; f.fsmFrame = 0; f.hitboxActive = false;
      }
      break;
    }

    // ── Hit stun ──────────────────────────────────────────────────────────────
    case 'hitStun': {
      f.fsmFrame++;
      if (f.fsmFrame >= HITSTUN_MIN && f.hp > 0) {
        f.fsm = 'idle'; f.fsmFrame = 0;
      }
      break;
    }

    // ── Knockdown / getup ─────────────────────────────────────────────────────
    case 'knockdown': {
      f.fsmFrame++;
      if (f.fsmFrame >= KNOCKDOWN_FRAMES) {
        f.fsm = 'getup'; f.fsmFrame = 0; f.invincible = GETUP_FRAMES;
      }
      break;
    }

    case 'getup': {
      f.fsmFrame++;
      if (f.fsmFrame >= GETUP_FRAMES) {
        f.fsm = 'idle'; f.fsmFrame = 0;
      }
      break;
    }

    case 'dead':
      break;
  }

  // Special cancel: hold block + heavy during idle = weaponSpecial
  if ((f.fsm === 'idle') && pressBlock && pressHeavy && f.stamina >= 20) {
    f.fsm = 'weaponSpecial'; f.fsmFrame = 0; f.hitboxActive = false;
    f.stamina -= 20;
  }
}

export function applyHit(
  target: FighterState,
  damage: number,
  hitstun: number,
  knockback: number,
  attackerFacing: 1 | -1,
): void {
  if (target.fsm === 'dead') return;

  const isBlocking = target.fsm === 'block' || target.fsm === 'blockStun';

  if (isBlocking) {
    // Chip damage through block, stamina drain
    target.hp       -= Math.floor(damage * 0.1);
    target.stamina  -= 15;
    target.fsm       = 'blockStun';
    target.fsmFrame  = 0;
    if (target.stamina < 0) target.stamina = 0;
  } else {
    target.hp -= damage;
    target.vel.x = attackerFacing * knockback;
    if (target.hp <= 0) {
      target.hp  = 0;
      target.fsm = 'knockdown';
    } else if (knockback > 2500) {
      target.fsm = 'knockdown';
    } else {
      target.fsm = 'hitStun';
    }
    target.fsmFrame  = 0;
    target.hitboxActive = false;
    target.comboCount++;
    target.lastHitFrame = 0; // will be set by caller with actual frame
  }
}

export function makeFighter(x: number, facing: 1 | -1, weapon: Weapon): FighterState {
  return {
    pos:          { x, y: 0 },
    vel:          { x: 0, y: 0 },
    facing,
    hp:           1000,
    stamina:      100,
    weapon,
    fsm:          'idle',
    fsmFrame:     0,
    comboCount:   0,
    hitboxActive: false,
    invincible:   0,
    lastHitFrame: 0,
  };
}
