// Per-player input history with repeat-last prediction
import type { InputFrame } from '../sim/types';

const BUFFER_SIZE = 64; // power of 2

export class InputBuffer {
  private buf: Int32Array = new Int32Array(BUFFER_SIZE).fill(-1); // -1 = not confirmed
  private predicted: Int32Array = new Int32Array(BUFFER_SIZE).fill(0);

  /** Store a confirmed input for a frame */
  set(frame: number, input: InputFrame): void {
    this.buf[frame & (BUFFER_SIZE - 1)] = input;
  }

  /** Get confirmed input or null */
  getConfirmed(frame: number): InputFrame | null {
    const v = this.buf[frame & (BUFFER_SIZE - 1)];
    return v === -1 ? null : v;
  }

  /** Get or predict input for a frame. Prediction = repeat last confirmed. */
  getOrPredict(frame: number): { input: InputFrame; predicted: boolean } {
    const confirmed = this.getConfirmed(frame);
    if (confirmed !== null) return { input: confirmed, predicted: false };

    // Find last confirmed frame (search backwards up to BUFFER_SIZE)
    for (let i = 1; i < BUFFER_SIZE; i++) {
      const f = frame - i;
      if (f < 0) break;
      const v = this.buf[f & (BUFFER_SIZE - 1)];
      if (v !== -1) return { input: v, predicted: true };
    }
    return { input: 0, predicted: true }; // no history: predict idle
  }

  /** Returns the earliest frame that needs correction vs stored predictions */
  findMismatch(frame: number, confirmedInput: InputFrame): number | null {
    const pred = this.predicted[frame & (BUFFER_SIZE - 1)];
    if (pred === confirmedInput) return null;
    return frame;
  }

  storePrediction(frame: number, input: InputFrame): void {
    this.predicted[frame & (BUFFER_SIZE - 1)] = input;
  }

  clear(): void {
    this.buf.fill(-1);
    this.predicted.fill(0);
  }
}
