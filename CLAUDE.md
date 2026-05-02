# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run everything (signaling server + Vite dev client)
npm run dev

# Client only
npm run dev:client          # http://localhost:5173

# Signaling server only
npm run dev:server          # ws://localhost:3001
# or
cd server && node index.js

# Type-check (no emit)
node node_modules/typescript/bin/tsc --noEmit

# Production build (also type-checks)
npm run build
```

There are no automated tests. The simulation's determinism guarantee is structural — `src/sim/` contains only pure functions with no I/O, no `Math.random()`, no `Date.now()`, and all values are fixed-point integers. To manually verify determinism, run the sim headlessly in Node.js by importing `makeInitialState` and `tick` from `src/sim/simulation.ts` and comparing `hashState()` output across two independent runs.

## Architecture

### The hard boundary: sim vs. everything else

`src/sim/` is a pure, deterministic island. **Nothing in `src/sim/` may import from `src/render/`, `src/net/`, or `src/input/`.** The entire directory is a closed pure-function system. This boundary is what makes rollback netcode possible — both peers can re-simulate any range of frames identically.

### Fixed-point math

All positions, velocities, and spatial values inside `src/sim/` use `Fixed = number` at ×1000 integer scale (so `1000 = 1.0 unit`). Never introduce floats, `Math.floor` rounding inconsistencies, or `Math.random()` into any file under `src/sim/`. The type alias `Fixed` is a documentation contract, not a runtime type.

### Main loop: accumulator pattern

`src/main.ts` drives everything. The loop runs on `requestAnimationFrame` but simulation ticks are fixed-step via an accumulator:

```
rAF callback
  └── accumulator += dt
  └── while (accumulator >= 16.667ms) → simTick() + accumulator -= 16.667ms
  └── renderer.draw(prevState, currentState, alpha)  // alpha = accumulator / TICK_MS
```

`alpha` (0–1) is passed to the renderer for **visual-only** sub-frame interpolation of positions. It never touches `GameState`. The accumulator is clamped at 200ms to prevent spiral-of-death on tab resume.

### Rollback flow (online matches)

Each `simTick()` call in online mode:
1. Snapshots current state into `StateBuffer` (circular, 16 slots)
2. Reads local input, queues it for `frame + INPUT_DELAY` (default: 2 frames)
3. Gets or predicts remote input via `InputBuffer` (prediction = repeat last)
4. Calls `tick(state, [p1In, p2In])` → new state
5. Sends `InputMsg{frame, input, checksum}` over WebRTC DataChannel

When a late remote `InputMsg` arrives, `RollbackManager.receiveRemoteInput()` queues it. On the next `simTick()`, `flushPendingRemote()` compares it against stored predictions, finds the earliest mismatch, loads the snapshot from before that frame, and re-simulates forward. The rollback window is 8 frames (`ROLLBACK_WINDOW` in `rollback/rollback.ts`).

### Weapon data tables

`src/sim/weapons/{sword,staff,nunchucks}.ts` each export three arrays (`LIGHT`, `HEAVY`, `SPECIAL`). Each array index is a frame number; each entry is either `null` (no active hitbox) or a `HitboxDef` (offset, half-extents, damage, hitstun, knockback, blockDamage). To tune a weapon's frame data, edit these arrays — array length = total animation duration in frames. Adding a new weapon means: adding a file here, extending the `Weapon` union in `types.ts`, and adding a branch in `hitbox.ts`'s `getAttackData()`.

### Renderer is read-only

`src/render/renderer.ts` imports from `src/sim/` but never calls `tick()` or mutates state. Hit detection for audio/VFX triggers is done by comparing `prev` vs `curr` state passed into `draw()`. Screen shake, sparks, and audio are all computed from state transitions — none of them feed back into `GameState`.

### Networking topology

```
Browser A                    Signaling Server (Node.js/WS)          Browser B
  └── WebSocket ─────────────── SDP/ICE relay only ──────────────── WebSocket
  └── RTCDataChannel (P2P) ───────── inputs only ─────────────────── RTCDataChannel
```

The signaling server (`server/index.js`) is ~60 lines. It knows room codes and peer IDs; it never sees input data or game state. The WebRTC channel is configured `ordered: false, maxRetransmits: 0` (UDP semantics) — lost packets are absorbed by rollback, not retransmitted.

TURN is wired but disabled. To enable: uncomment the entry in `src/net/transport.ts`'s `ICE_SERVERS` array and add credentials.

### Input bitmask

`shared/protocol.ts` defines the 5-bit input layout:
```
bit 0: LEFT   bit 1: RIGHT   bit 2: LIGHT_ATK   bit 3: HEAVY_ATK   bit 4: BLOCK
```
Weapon special = HEAVY_ATK + BLOCK held simultaneously (handled in `fighter.ts`). The same bitmask is used for local keyboard state, rollback input buffers, and the wire format.

### Desync detection

Every 60 frames, the local client computes `hashState()` (FNV-32a over key GameState fields, truncated to uint16) and piggybacks it on the `InputMsg.checksum` field. On receive, each peer compares the remote checksum against its own snapshot for that frame. Mismatch triggers `onDesync()` callback → desync overlay in UI.

## Key tuning constants

| Constant | Location | Default | Effect |
|---|---|---|---|
| `ROLLBACK_WINDOW` | `rollback/rollback.ts` | 8 | Max frames that can be rolled back |
| `INPUT_DELAY` | `rollback/rollback.ts` | 2 | Intentional input delay (frames) |
| `ACCUMULATOR_CAP` | `main.ts` | 200ms | Max catchup after tab resume |
| `ROUND_FRAMES` | `sim/types.ts` | 5400 | Round duration (90s × 60) |
| `BEST_OF` | `sim/types.ts` | 3 | Match format |
| `WALK_SPEED` | `sim/physics.ts` | 3500 | Fixed units/frame |

## V2 scope (not yet implemented)

Jump states (`jumpRise`, `jumpFall`) are intentionally absent from the FSM. They were deferred from V1 to keep the rollback prediction accuracy high (airborne state prediction is harder than grounded). See `ROADMAP.md` for the full V2+ plan.
