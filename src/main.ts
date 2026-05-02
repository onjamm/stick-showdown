// Stick Showdown — main bootstrap
// Wires: rAF accumulator loop → sim → rollback → renderer → net
import './style.css';
import { RollbackManager } from './rollback/rollback';
import { makeRenderer, toggleDebug } from './render/renderer';
import { unlockAudio } from './render/audio';
import { initKeyboard, pollP1, pollP2 } from './input/keyboard';
import { Session } from './net/session';
import { hashState } from './sim/simulation';
import type { Weapon, GameState } from './sim/types';
import type { InputMsg } from '../shared/protocol';

// ── Constants ─────────────────────────────────────────────────────────────────
const TICK_MS           = 1000 / 60;
const ACCUMULATOR_CAP   = 200;         // ms — spiral-of-death prevention
const SIGNALING_URL     = `ws://${window.location.hostname}:3001`;
const CHECKSUM_INTERVAL = 60;

// ── App state ─────────────────────────────────────────────────────────────────
type AppMode = 'menu' | 'local' | 'online_lobby' | 'online_match' | 'disconnected';

let mode:      AppMode              = 'menu';
let rollback:  RollbackManager | null = null;
let session:   Session         | null = null;
let prevState: GameState       | null = null;
let p1Weapon:  Weapon               = 'sword';
let p2Weapon:  Weapon               = 'sword';
let rematchRequested = false;

// ── Renderer & input ──────────────────────────────────────────────────────────
const canvas   = document.getElementById('game') as HTMLCanvasElement;
const renderer = makeRenderer(canvas);
initKeyboard();

// ── Accumulator loop ──────────────────────────────────────────────────────────
let lastTime    = 0;
let accumulator = 0;

function mainLoop(timestamp: number): void {
  const dt = lastTime === 0 ? 0 : timestamp - lastTime;
  lastTime = timestamp;

  if (dt > 0 && (mode === 'local' || mode === 'online_match')) {
    accumulator += dt;
    // Clamp: prevents spiral-of-death when tab was backgrounded
    if (accumulator > ACCUMULATOR_CAP) accumulator = ACCUMULATOR_CAP;

    while (accumulator >= TICK_MS) {
      simTick();
      accumulator -= TICK_MS;
    }
  }

  // alpha: fractional progress through current tick — used for visual-only interpolation only
  const alpha = accumulator / TICK_MS;

  if (rollback && prevState) {
    renderer.draw(prevState, rollback.gameState, alpha);
  }

  requestAnimationFrame(mainLoop);
}

function simTick(): void {
  if (!rollback) return;

  if (mode === 'local') {
    prevState = rollback.gameState;
    rollback.advanceLocal(pollP1(), pollP2());

  } else if (mode === 'online_match') {
    const frame    = rollback.frame;
    const checksum = frame % CHECKSUM_INTERVAL === 0 ? hashState(rollback.gameState) : 0;
    const localIn  = rollback.localPlayerIndex === 0 ? pollP1() : pollP2();

    prevState = rollback.gameState;
    rollback.advanceFrame(localIn);

    const msg: InputMsg = { frame, input: localIn, checksum };
    session?.sendInput(msg);
  }

  // Rematch
  if (rollback.gameState.phase === 'matchEnd' && rematchRequested) {
    rematchRequested = false;
    if (mode === 'local') startLocalMatch();
  }
}

// ── Match starters ────────────────────────────────────────────────────────────
function startLocalMatch(): void {
  mode     = 'local';
  rollback = new RollbackManager(p1Weapon, p2Weapon, 0, {
    onDesync() {},
    onStateUpdate(s) { prevState = s; },
  });
  prevState = rollback.gameState;
  showScreen('game-screen');
}

function startOnlineMatch(localIdx: 0 | 1, w1: Weapon, w2: Weapon): void {
  mode     = 'online_match';
  rollback = new RollbackManager(w1, w2, localIdx, {
    onDesync(local, remote, frame) {
      console.warn(`DESYNC frame=${frame} local=${local} remote=${remote}`);
      showOverlay('desync-overlay');
    },
    onStateUpdate() {},
  });
  prevState = rollback.gameState;
  showScreen('game-screen');
}

// ── Online session ────────────────────────────────────────────────────────────
function createOnlineSession(): void {
  session?.destroy();
  session = new Session({
    onStateChange(s)              { updateLobbyStatus(s); },
    onMatchReady(idx, w1, w2)     { startOnlineMatch(idx, w1, w2); },
    onRemoteInput(msg)            { rollback?.receiveRemoteInput(msg.frame, msg.input, msg.checksum); },
    onDisconnect()                { showOverlay('disconnect-overlay'); mode = 'disconnected'; },
    onError(msg)                  { showError(msg); },
  });
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function showScreen(id: string): void {
  document.querySelectorAll<HTMLElement>('.screen').forEach(el => el.style.display = 'none');
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}

function showOverlay(id: string): void {
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}

function hideOverlays(): void {
  ['disconnect-overlay', 'desync-overlay'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

function updateLobbyStatus(state: string): void {
  const el = document.getElementById('lobby-status');
  if (!el) return;
  const msgs: Record<string, string> = {
    connecting_signal: 'Connecting to server…',
    in_lobby:   `Room code: <strong>${session?.code ?? ''}</strong><br>Waiting for opponent…`,
    connecting_peer: 'Peer found — establishing connection…',
    in_match:    'Match starting!',
    disconnected: 'Disconnected.',
  };
  el.innerHTML = msgs[state] ?? state;
}

function showError(msg: string): void {
  const el = document.getElementById('error-msg');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function backToMenu(): void {
  session?.destroy();
  session  = null;
  rollback = null;
  hideOverlays();
  showScreen('menu-screen');
  mode = 'menu';
  lastTime    = 0;
  accumulator = 0;
}

// ── DOM wiring ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Unlock audio on first interaction
  document.addEventListener('keydown',    () => unlockAudio(), { once: true });
  document.addEventListener('pointerdown',() => unlockAudio(), { once: true });

  // Debug toggle: Backtick (`)
  window.addEventListener('keydown', e => {
    if (e.code === 'Backquote') toggleDebug();
    if (e.code === 'KeyR' && (mode === 'local' || mode === 'online_match')) {
      rematchRequested = true;
    }
  });

  // Local play
  document.getElementById('btn-local')?.addEventListener('click', () => {
    p1Weapon = (document.getElementById('p1-weapon') as HTMLSelectElement).value as Weapon;
    p2Weapon = (document.getElementById('p2-weapon') as HTMLSelectElement).value as Weapon;
    startLocalMatch();
  });

  // Create room
  document.getElementById('btn-create')?.addEventListener('click', async () => {
    p1Weapon = (document.getElementById('online-weapon') as HTMLSelectElement).value as Weapon;
    createOnlineSession();
    showScreen('lobby-screen');
    try {
      await session!.createRoom(SIGNALING_URL, p1Weapon);
    } catch {
      showError('Cannot reach signaling server. Run: cd server && npm start');
    }
  });

  // Join room
  document.getElementById('btn-join')?.addEventListener('click', async () => {
    const code = (document.getElementById('room-code-input') as HTMLInputElement).value;
    p2Weapon   = (document.getElementById('online-weapon') as HTMLSelectElement).value as Weapon;
    createOnlineSession();
    showScreen('lobby-screen');
    try {
      await session!.joinRoom(SIGNALING_URL, code, p2Weapon);
    } catch {
      showError('Cannot reach signaling server. Run: cd server && npm start');
    }
  });

  // Room code input: auto-uppercase
  document.getElementById('room-code-input')?.addEventListener('input', (e) => {
    const input = e.target as HTMLInputElement;
    input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });

  // All back-to-menu buttons
  document.querySelectorAll('.btn-back-menu').forEach(btn =>
    btn.addEventListener('click', backToMenu));

  showScreen('menu-screen');
  requestAnimationFrame(t => { lastTime = t; requestAnimationFrame(mainLoop); });
});
