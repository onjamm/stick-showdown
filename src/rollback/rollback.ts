// GGPO-style rollback manager
import type { GameState, InputFrame } from '../sim/types';
import { tick, makeInitialState, hashState } from '../sim/simulation';
import { StateBuffer } from './stateBuffer';
import { InputBuffer } from './inputBuffer';
import type { Weapon } from '../sim/types';

export const ROLLBACK_WINDOW  = 8;   // max frames we can roll back
export const INPUT_DELAY      = 2;   // frames of intentional input delay
const CHECKSUM_INTERVAL       = 60;  // frames between desync checks

export interface RollbackCallbacks {
  onDesync(localHash: number, remoteHash: number, frame: number): void;
  onStateUpdate(state: GameState): void;
}

export class RollbackManager {
  private state:        GameState;
  private stateBuffer:  StateBuffer   = new StateBuffer();
  private localInputs:  InputBuffer   = new InputBuffer();
  private remoteInputs: InputBuffer   = new InputBuffer();
  private currentFrame: number        = 0;
  private localPlayerIdx: 0 | 1       = 0;
  private callbacks:    RollbackCallbacks;
  private simulatedDelay: number      = 0; // for local testing only
  private pendingRemoteInputs: { frame: number; input: InputFrame; checksum: number }[] = [];

  constructor(
    p1Weapon: Weapon,
    p2Weapon: Weapon,
    localIdx: 0 | 1,
    callbacks: RollbackCallbacks,
  ) {
    this.state = makeInitialState(p1Weapon, p2Weapon);
    this.localPlayerIdx = localIdx;
    this.callbacks = callbacks;
    this.stateBuffer.save(this.state);
  }

  get frame(): number { return this.currentFrame; }
  get gameState(): GameState { return this.state; }
  get localPlayerIndex(): 0 | 1 { return this.localPlayerIdx; }

  /** Called each simulation tick with local raw input */
  advanceFrame(rawLocalInput: InputFrame): void {
    const f = this.currentFrame;

    // Apply input delay: schedule input for frame + INPUT_DELAY
    const targetFrame = f + INPUT_DELAY;
    this.localInputs.set(targetFrame, rawLocalInput);

    // Process any pending remote inputs that arrived this tick
    this.flushPendingRemote();

    // Get inputs for current frame
    const { input: localIn }  = this.localInputs.getOrPredict(f);
    const { input: remoteIn, predicted } = this.remoteInputs.getOrPredict(f);

    this.remoteInputs.storePrediction(f, remoteIn);

    const inputs: [InputFrame, InputFrame] = this.localPlayerIdx === 0
      ? [localIn, remoteIn]
      : [remoteIn, localIn];

    this.stateBuffer.save(this.state);
    this.state = tick(this.state, inputs);
    this.currentFrame++;

    // Checksum piggyback
    let checksum = 0;
    if (f % CHECKSUM_INTERVAL === 0) checksum = hashState(this.state);

    this.callbacks.onStateUpdate(this.state);
  }

  /** Called when a remote InputMsg arrives over the network */
  receiveRemoteInput(frame: number, input: InputFrame, checksum: number): void {
    this.pendingRemoteInputs.push({ frame, input, checksum });
  }

  private flushPendingRemote(): void {
    if (!this.pendingRemoteInputs.length) return;

    let earliestMismatch: number | null = null;

    for (const { frame, input, checksum } of this.pendingRemoteInputs) {
      // Verify checksum if present
      if (checksum !== 0) {
        const snap = this.stateBuffer.load(frame);
        if (snap) {
          const localHash = hashState(snap);
          if (localHash !== checksum) {
            this.callbacks.onDesync(localHash, checksum, frame);
          }
        }
      }

      const mismatch = this.remoteInputs.findMismatch(frame, input);
      this.remoteInputs.set(frame, input);

      if (mismatch !== null && frame < this.currentFrame) {
        if (earliestMismatch === null || frame < earliestMismatch) {
          earliestMismatch = frame;
        }
      }
    }
    this.pendingRemoteInputs = [];

    // Rollback if needed
    if (earliestMismatch !== null) {
      this.rollbackTo(earliestMismatch);
    }
  }

  private rollbackTo(targetFrame: number): void {
    const rollbackFrames = this.currentFrame - targetFrame;
    if (rollbackFrames > ROLLBACK_WINDOW) return; // too far, skip

    const savedState = this.stateBuffer.load(targetFrame - 1);
    if (!savedState) return;

    this.state = savedState;
    const resimTo = this.currentFrame;
    this.currentFrame = targetFrame;

    // Re-simulate from targetFrame up to where we were
    while (this.currentFrame < resimTo) {
      const f = this.currentFrame;
      const { input: localIn }  = this.localInputs.getOrPredict(f);
      const { input: remoteIn } = this.remoteInputs.getOrPredict(f);

      const inputs: [InputFrame, InputFrame] = this.localPlayerIdx === 0
        ? [localIn, remoteIn]
        : [remoteIn, localIn];

      this.stateBuffer.save(this.state);
      this.state = tick(this.state, inputs);
      this.currentFrame++;
    }
  }

  /** Set simulated input delay for local testing (delays remote buffer population) */
  setSimulatedDelay(frames: number): void {
    this.simulatedDelay = frames;
  }

  /** For local 2P play — inject both inputs directly, no rollback needed */
  advanceLocal(p1Input: InputFrame, p2Input: InputFrame): void {
    this.stateBuffer.save(this.state);
    this.state = tick(this.state, [p1Input, p2Input]);
    this.currentFrame++;
    this.callbacks.onStateUpdate(this.state);
  }

  reset(p1Weapon: Weapon, p2Weapon: Weapon): void {
    this.state = makeInitialState(p1Weapon, p2Weapon);
    this.currentFrame = 0;
    this.stateBuffer.clear();
    this.localInputs.clear();
    this.remoteInputs.clear();
    this.stateBuffer.save(this.state);
  }
}
