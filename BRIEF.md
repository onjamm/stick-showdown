# Stick Showdown — Project Brief

## What it is

A browser-based 1v1 stick-figure fighting game. Two players pick a weapon (sword, staff, or nunchucks), either share a keyboard or connect online via a 4-character room code, and fight best-of-3 rounds. The game runs at a fixed 60 Hz simulation with GGPO-style rollback netcode — inputs only are sent over WebRTC P2P, and both peers independently run the same deterministic simulation.

## Core design decisions

**Ground-only V1.** No jumping. This was a deliberate scope call: aerial states significantly complicate FSM prediction accuracy in rollback, and a ground-only fighter is fully playable. Jump is first on the V2 list.

**No server-authoritative combat.** Simulation runs identically on both peers. The signaling server is a pure room broker (~60 lines) that steps aside once WebRTC connects. It never sees game state or inputs.

**Determinism over convenience.** All simulation values are fixed-point integers (×1000 scale). No floats, no `Math.random()`, no `Date.now()` inside `src/sim/`. This is a hard rule enforced by code review, not the type system.

**Rendering is a read-only consumer.** The renderer never mutates GameState. Visual interpolation (sub-frame position lerp), screen shake, hit sparks, and audio are all derived from state transitions between frames — they cannot cause desync.

## Tech stack

- **TypeScript + Vite** — client
- **HTML5 Canvas 2D** — renderer (no game engine, no physics lib)
- **WebRTC DataChannel** — P2P input transport (UDP semantics)
- **Node.js + ws** — signaling server (SDP/ICE relay only)
- **STUN** — NAT traversal (TURN-ready, not yet wired)

## Who works on what

This is a solo/small-team project. The codebase is intentionally structured so different concerns can be worked on independently:

- **Game feel / balance** → `src/sim/weapons/` and constants in `src/sim/fighter.ts` and `src/sim/physics.ts`
- **Visuals / animation** → `src/render/stickFigure.ts`, `src/render/effects.ts`, `src/render/camera.ts`
- **Netcode** → `src/rollback/`, `src/net/`
- **New features (jump, stages, characters)** → start in `src/sim/types.ts` and `src/sim/fighter.ts`

## Constraints to respect

1. `src/sim/` must remain a pure-function island — no imports from `render/`, `net/`, or `input/`
2. No floats, no nondeterministic APIs inside `src/sim/`
3. State snapshots must use `cloneState()` in `simulation.ts` — not `structuredClone()` or JSON round-trips
4. The signaling server must not be extended to relay game state or act as a relay for inputs — that path leads to server-authoritative architecture
