// Fixed-point ground physics — no floats, no gravity (ground-only v1)
import type { FighterState } from './types';
import { STAGE_LEFT, STAGE_RIGHT, FIGHTER_W, STAGE_FLOOR } from './types';

// Movement tuning:
// The previous value (3500) crossed the whole stage in a handful of frames, which reads as teleporting
// and makes the keyed walk cycle impossible to perceive.
const WALK_SPEED:      number = 140;   // fixed units/frame
const KNOCKBACK_DECAY: number = 800;   // fixed units decelerated per frame

export function applyWalkVelocity(f: FighterState, dx: number): void {
  f.vel.x = dx;
}

export function stepPhysics(f: FighterState): void {
  // Apply velocity
  f.pos.x += f.vel.x;
  f.pos.y += f.vel.y;

  // Ground clamp
  if (f.pos.y > STAGE_FLOOR) {
    f.pos.y = STAGE_FLOOR;
    f.vel.y = 0;
  }

  // Wall clamp
  const left  = STAGE_LEFT  + FIGHTER_W;
  const right = STAGE_RIGHT - FIGHTER_W;
  if (f.pos.x < left)  { f.pos.x = left;  f.vel.x = 0; }
  if (f.pos.x > right) { f.pos.x = right; f.vel.x = 0; }

  // Knockback decay
  if (f.vel.x > 0) { f.vel.x = Math.max(0, f.vel.x - KNOCKBACK_DECAY); }
  if (f.vel.x < 0) { f.vel.x = Math.min(0, f.vel.x + KNOCKBACK_DECAY); }
}

export function getWalkDelta(facing: 1 | -1, forward: boolean): number {
  return (forward ? WALK_SPEED : -WALK_SPEED) * facing;
}

export { WALK_SPEED };
