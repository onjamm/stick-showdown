// Core deterministic simulation — pure function, no I/O, no Math.random(), no Date.now()
import type { GameState, InputFrame, Weapon } from './types';
import { ROUND_FRAMES, BEST_OF } from './types';
import { stepFighter, applyHit, makeFighter } from './fighter';
import { stepPhysics } from './physics';
import { getActiveHitbox, getHurtbox, rectsOverlap } from './hitbox';
import { hashState } from './hash';

export function makeInitialState(p1Weapon: Weapon, p2Weapon: Weapon): GameState {
  return {
    frame: 0,
    fighters: [
      makeFighter(-3000, 1,  p1Weapon),
      makeFighter( 3000, -1, p2Weapon),
    ],
    roundTimer: ROUND_FRAMES,
    roundIndex: 0,
    p1Wins: 0,
    p2Wins: 0,
    phase: 'fight',
    phaseFrame: 0,
  };
}

// Deep clone — no structuredClone (nondeterministic serialization order risk), manual copy
export function cloneState(s: GameState): GameState {
  const cloneFighter = (f: (typeof s.fighters)[0]) => ({
    pos:          { x: f.pos.x, y: f.pos.y },
    vel:          { x: f.vel.x, y: f.vel.y },
    facing:       f.facing,
    hp:           f.hp,
    stamina:      f.stamina,
    weapon:       f.weapon,
    fsm:          f.fsm,
    fsmFrame:     f.fsmFrame,
    comboCount:   f.comboCount,
    hitboxActive: f.hitboxActive,
    invincible:   f.invincible,
    lastHitFrame: f.lastHitFrame,
  });
  return {
    frame:      s.frame,
    fighters:   [cloneFighter(s.fighters[0]), cloneFighter(s.fighters[1])],
    roundTimer: s.roundTimer,
    roundIndex: s.roundIndex,
    p1Wins:     s.p1Wins,
    p2Wins:     s.p2Wins,
    phase:      s.phase,
    phaseFrame: s.phaseFrame,
  };
}

const ROUND_END_FREEZE   = 90;  // frames of freeze after round ends
const MATCH_END_FREEZE   = 180;

export function tick(state: GameState, inputs: [InputFrame, InputFrame]): GameState {
  const s = cloneState(state);
  s.frame++;

  if (s.phase === 'roundEnd') {
    s.phaseFrame++;
    if (s.phaseFrame >= ROUND_END_FREEZE) {
      // Check match end
      const wins = Math.ceil(BEST_OF / 2);
      if (s.p1Wins >= wins || s.p2Wins >= wins) {
        s.phase = 'matchEnd'; s.phaseFrame = 0;
      } else {
        // Start next round
        s.roundIndex++;
        s.roundTimer  = ROUND_FRAMES;
        s.phase       = 'fight';
        s.phaseFrame  = 0;
        const [w0, w1] = [s.fighters[0].weapon, s.fighters[1].weapon];
        s.fighters[0] = makeFighter(-3000, 1,  w0);
        s.fighters[1] = makeFighter( 3000, -1, w1);
      }
    }
    return s;
  }

  if (s.phase === 'matchEnd') {
    s.phaseFrame++;
    return s;
  }

  // ── Active fight ────────────────────────────────────────────────────────────
  s.roundTimer--;

  const [f0, f1] = s.fighters;

  // Step FSMs
  stepFighter(f0, inputs[0], f1.pos.x);
  stepFighter(f1, inputs[1], f0.pos.x);

  // Physics
  stepPhysics(f0);
  stepPhysics(f1);

  // Push apart if overlapping (prevent tunneling through each other)
  const overlap = 900; // fixed units — ~0.9u
  const dx = f1.pos.x - f0.pos.x;
  if (Math.abs(dx) < overlap) {
    const push = (overlap - Math.abs(dx)) >> 1;
    f0.pos.x -= push;
    f1.pos.x += push;
  }

  // Hit detection — f0 attacks f1
  {
    const hb = getActiveHitbox(f0);
    const hurt = getHurtbox(f1);
    if (hb && hurt && !f0.hitboxActive) {
      if (rectsOverlap(hb.cx, hb.cy, hb.w, hb.h, hurt.cx, hurt.cy, hurt.w, hurt.h)) {
        f0.hitboxActive = true; // one hit per attack window
        f1.lastHitFrame = s.frame;
        applyHit(f1, hb.def.damage, hb.def.hitstun, hb.def.knockback, f0.facing);
      }
    }
  }

  // Hit detection — f1 attacks f0
  {
    const hb = getActiveHitbox(f1);
    const hurt = getHurtbox(f0);
    if (hb && hurt && !f1.hitboxActive) {
      if (rectsOverlap(hb.cx, hb.cy, hb.w, hb.h, hurt.cx, hurt.cy, hurt.w, hurt.h)) {
        f1.hitboxActive = true;
        f0.lastHitFrame = s.frame;
        applyHit(f0, hb.def.damage, hb.def.hitstun, hb.def.knockback, f1.facing);
      }
    }
  }

  // Round end check
  const p1Dead = f0.hp <= 0;
  const p2Dead = f1.hp <= 0;
  const timeout = s.roundTimer <= 0;

  if (p1Dead || p2Dead || timeout) {
    if (timeout) {
      // Higher HP wins
      if (f0.hp > f1.hp) s.p1Wins++;
      else if (f1.hp > f0.hp) s.p2Wins++;
      // tie: neither wins
    } else {
      if (p2Dead && !p1Dead) s.p1Wins++;
      if (p1Dead && !p2Dead) s.p2Wins++;
      // simultaneous KO: neither wins this round
    }
    s.phase     = 'roundEnd';
    s.phaseFrame = 0;
  }

  return s;
}

// Exported for rollback desync verification
export { hashState };
