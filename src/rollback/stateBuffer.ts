// Circular buffer of GameState snapshots for rollback
import type { GameState } from '../sim/types';
import { cloneState } from '../sim/simulation';

const BUFFER_SIZE = 16; // must be power of 2, covers 8-frame rollback window with margin

export class StateBuffer {
  private buf: (GameState | null)[] = new Array(BUFFER_SIZE).fill(null);

  save(state: GameState): void {
    const slot = state.frame & (BUFFER_SIZE - 1);
    this.buf[slot] = cloneState(state);
  }

  load(frame: number): GameState | null {
    const slot = frame & (BUFFER_SIZE - 1);
    const s = this.buf[slot];
    if (!s || s.frame !== frame) return null;
    return cloneState(s);
  }

  clear(): void {
    this.buf.fill(null);
  }
}
