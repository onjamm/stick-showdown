# Roadmap

Living task list. Completed items are removed. Add new items freely.
Format: `- [ ] Task — notes/context`

---

## Bugs / polish (do these first)

- [ ] Rematch in online mode — currently only works in local mode; online rematch needs `RollbackManager.reset()` + re-exchange of weapon selection via signaling
- [ ] `prevState` is `null` for the very first render frame — add a null guard or initialize it to `makeInitialState()` on boot
- [ ] Weapon special cancel (G+H / L+;) fires on the same frame as heavyAtk — add a 1-frame grace window to prevent accidental specials
- [ ] Camera doesn't reset between rounds — `makeCamera()` should be called on round start to snap back to center
- [ ] Signaling server has no heartbeat/ping — idle rooms persist until the WebSocket closes; add a 30s timeout for unmatched rooms

---

## V2 features

- [ ] **Jump** — add `jumpRise` / `jumpFall` FSM states, gravity constant (currently `GRAVITY = 0` in `types.ts`), aerial attack hitboxes. Update `fighter.ts` `stepFighter()` switch and add jump arc to `physics.ts`. This is the biggest V2 item.
- [ ] **Character select screen** — pre-match weapon + color pick, persisted through session handshake (add `weaponP1/weaponP2` to the signaling `room_joined` payload)
- [ ] **Non-flat stage** — platform collision. Physics already handles floor; extend `stepPhysics()` to accept a stage layout array of AABB platforms
- [ ] **Replay system** — deterministic sim makes this nearly free: record the input stream + initial state, play back by feeding inputs into `tick()`. Store as JSON in localStorage.

---

## Netcode

- [ ] **TURN relay** — uncomment + fill credentials in `src/net/transport.ts` `ICE_SERVERS`. Needed for ~15% of peer pairs behind symmetric NAT
- [ ] **Online rematch** — see Bugs above
- [ ] **Latency display** — show estimated RTT in debug overlay; use DataChannel message round-trip timing
- [ ] **Input delay tuning UI** — expose `INPUT_DELAY` as a runtime setting (0–4 frames) for players to tune based on their connection

---

## Audio / visual

- [ ] **Weapon trails** — currently drawn in `stickFigure.ts` as static lines; animate them with a short history buffer of tip positions (purely cosmetic, render-side only)
- [ ] **Round transition** — fade-to-black between rounds instead of instant reset
- [ ] **Win screen** — dedicated match-end screen with win counts, not just HUD overlay text

---

## Infrastructure

- [ ] **`.gitignore`** — add `dist/`, `node_modules/`, `server/node_modules/`
- [ ] **Hosted signaling server** — deploy `server/index.js` to Railway/Render/Fly so players don't need to run it locally for online play
- [ ] **HTTPS + WSS** — WebRTC requires a secure context on non-localhost; configure TLS for the Vite dev server or use a reverse proxy

---

## Icebox (good ideas, not soon)

- Ranked matchmaking / lobby browser
- Mobile touch controls
- Spectator mode (replay the confirmed input stream)
- Additional weapons (spear, dual blades)
- Stage hazards
