// Raw keyboard polling — snapshot state each frame, never use events inside sim
import {
  INPUT_LEFT, INPUT_RIGHT, INPUT_LIGHT_ATK, INPUT_HEAVY_ATK, INPUT_BLOCK,
} from '../../shared/protocol';

const held = new Set<string>();

export function initKeyboard(): void {
  window.addEventListener('keydown', e => { if (!e.repeat) held.add(e.code); });
  window.addEventListener('keyup',   e => held.delete(e.code));
}

// P1: WASD + F (light) G (heavy) H (block)
export function pollP1(): number {
  let mask = 0;
  if (held.has('KeyA'))      mask |= INPUT_LEFT;
  if (held.has('KeyD'))      mask |= INPUT_RIGHT;
  if (held.has('KeyF'))      mask |= INPUT_LIGHT_ATK;
  if (held.has('KeyG'))      mask |= INPUT_HEAVY_ATK;
  if (held.has('KeyH'))      mask |= INPUT_BLOCK;
  return mask;
}

// P2: Arrow keys + K (light) L (heavy) Semicolon (block)
export function pollP2(): number {
  let mask = 0;
  if (held.has('ArrowLeft'))  mask |= INPUT_LEFT;
  if (held.has('ArrowRight')) mask |= INPUT_RIGHT;
  if (held.has('KeyK'))       mask |= INPUT_LIGHT_ATK;
  if (held.has('KeyL'))       mask |= INPUT_HEAVY_ATK;
  if (held.has('Semicolon'))  mask |= INPUT_BLOCK;
  return mask;
}
