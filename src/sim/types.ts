// ─────────────────────────────────────────────────────────────────────────────
// Core simulation types — ALL values are fixed-point integers (×1000 scale)
// so 1000 = 1.0 unit.  NEVER use floats inside sim/.
// ─────────────────────────────────────────────────────────────────────────────

export type Fixed = number; // integer, ×1000 scale

export interface Vec2 {
  x: Fixed;
  y: Fixed;
}

export type Weapon = 'sword' | 'staff' | 'nunchucks';

export type FighterFSM =
  | 'idle'
  | 'walkF'
  | 'walkB'
  | 'lightAtk'
  | 'heavyAtk'
  | 'weaponSpecial'
  | 'block'
  | 'blockStun'
  | 'hitStun'
  | 'knockdown'
  | 'getup'
  | 'dead';

export interface FighterState {
  pos:          Vec2;
  vel:          Vec2;
  facing:       1 | -1;      // 1 = right, -1 = left
  hp:           number;       // 0–1000
  stamina:      number;       // 0–100, consumed by blocking
  weapon:       Weapon;
  fsm:          FighterFSM;
  fsmFrame:     number;       // frames elapsed in current state
  comboCount:   number;
  hitboxActive: boolean;
  invincible:   number;       // frames of invincibility remaining
  lastHitFrame: number;       // frame of last hit received (for combo window)
}

export interface GameState {
  frame:      number;
  fighters:   [FighterState, FighterState];
  roundTimer: number;         // frames remaining (60 × seconds)
  roundIndex: number;         // 0-based
  p1Wins:     number;
  p2Wins:     number;
  phase:      'fight' | 'roundEnd' | 'matchEnd';
  phaseFrame: number;         // frames elapsed in current phase
}

export type InputFrame = number; // uint8 bitmask matching protocol.ts constants

export const STAGE_LEFT:   Fixed = -8000;   // -8.0 units
export const STAGE_RIGHT:  Fixed =  8000;   //  8.0 units
export const STAGE_FLOOR:  Fixed =  0;
export const FIGHTER_W:    Fixed =  500;    // half-width for wall push
export const GRAVITY:      Fixed =  0;      // ground-only v1 — no gravity needed
export const ROUND_FRAMES:  number = 60 * 90; // 90-second rounds
export const BEST_OF:       number = 3;
