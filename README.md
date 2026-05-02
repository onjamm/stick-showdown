# Stick Showdown

Browser-based 1v1 stick-figure fighting game with rollback netcode.

## Quick Start

**Terminal 1 — signaling server:**
```bash
cd server
node index.js
# Listening on ws://localhost:3001
```

**Terminal 2 — client dev server:**
```bash
npm run dev:client
# Open http://localhost:5173
```

Or run both together:
```bash
npm run dev
```

---

## Controls

| Action        | P1          | P2          |
|---------------|-------------|-------------|
| Move          | A / D       | ← / →       |
| Light attack  | F           | K           |
| Heavy attack  | G           | L           |
| Block         | H           | ;           |
| Weapon special| G + H       | L + ;       |
| Rematch       | R           | R           |
| Debug overlay | ` (backtick)| —           |

---

## Online Play

1. Both players open `http://localhost:5173` (or your LAN IP)
2. One player clicks **Create Room** → shares the 4-character code
3. Other player enters the code → **Join Room**
4. WebRTC P2P connection established via STUN

> **NAT note:** Public STUN covers ~85% of peer pairs. Players behind symmetric NAT
> will see a connection failure. Wire TURN credentials in `src/net/transport.ts`
> under the commented-out `ICE_SERVERS` entry to enable relay fallback.

---

## Architecture

```
src/
  sim/          Pure deterministic simulation — no I/O, no Math.random()
  rollback/     GGPO-style rollback: StateBuffer, InputBuffer, RollbackManager
  render/       Read-only canvas renderer + cinematic camera + Web Audio
  input/        Keyboard polling (snapshot per tick, not event-driven)
  net/          WebRTC transport + WebSocket signaling + session lifecycle
shared/
  protocol.ts   Wire types: InputMsg, SignalMsg, input bitmask constants
server/
  index.js      Node.js WebSocket signaling server (room broker only)
```

### Simulation clock

The sim runs on a **fixed-step 60 Hz accumulator loop** driven by `requestAnimationFrame`.
Each rAF callback drains the accumulator in discrete 16.667 ms steps, then passes
`alpha = accumulator / TICK_MS` to the renderer for **visual-only** position interpolation.
The authoritative `GameState` is never modified by the renderer.

### Rollback

- **Window:** 8 frames
- **Input delay:** 2 frames (tunable in `rollback/rollback.ts`)
- **Prediction:** repeat last confirmed input
- **Desync detection:** FNV-32 checksum of `GameState` piggybacked every 60 frames

### Networking

- WebRTC `RTCDataChannel` — `ordered: false, maxRetransmits: 0` (UDP semantics)
- Wire format: 8 bytes per input packet (frame u32 + input u8 + checksum u16)
- Signaling server relays SDP/ICE only — zero knowledge of game state

---

## Adding TURN

In `src/net/transport.ts`, uncomment and fill:
```ts
{ urls: 'turn:your.turn.server:3478', username: '...', credential: '...' },
```

---

## V2 Roadmap

- Jump + aerial attacks
- Character select screen
- Non-flat stages (platforms)
- Ranked matchmaking
- Replay system (deterministic sim makes this free)
