// FNV-32a checksum for desync detection
import type { GameState } from './types';

export function fnv32a(data: number[]): number {
  let hash = 0x811c9dc5;
  for (const byte of data) {
    hash ^= byte & 0xff;
    hash = (Math.imul(hash, 0x01000193)) >>> 0;
  }
  return hash;
}

export function hashState(s: GameState): number {
  const nums: number[] = [];
  nums.push(s.frame & 0xff, (s.frame >> 8) & 0xff);
  for (const f of s.fighters) {
    nums.push(
      f.pos.x & 0xff, (f.pos.x >> 8) & 0xff,
      f.pos.y & 0xff, (f.pos.y >> 8) & 0xff,
      f.hp & 0xff, (f.hp >> 8) & 0xff,
      f.fsm.charCodeAt(0),
      f.fsmFrame & 0xff,
      f.facing === 1 ? 1 : 0,
    );
  }
  nums.push(s.roundTimer & 0xff, (s.roundTimer >> 8) & 0xff);
  return fnv32a(nums) & 0xffff; // truncate to uint16
}
