// Web Audio API — synthesized hit sounds, no external assets

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function playTone(
  freq: number, type: OscillatorType,
  attack: number, decay: number,
  gainPeak: number, detune = 0,
): void {
  const ac  = getCtx();
  const osc = ac.createOscillator();
  const env = ac.createGain();

  osc.type      = type;
  osc.frequency.value = freq;
  osc.detune.value    = detune;

  const now = ac.currentTime;
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(gainPeak, now + attack);
  env.gain.exponentialRampToValueAtTime(0.001, now + attack + decay);

  osc.connect(env);
  env.connect(ac.destination);
  osc.start(now);
  osc.stop(now + attack + decay + 0.05);
}

function playNoise(duration: number, gainPeak: number): void {
  const ac     = getCtx();
  const buf    = ac.createBuffer(1, ac.sampleRate * duration, ac.sampleRate);
  const data   = buf.getChannelData(0);
  // Deterministic pseudo-noise (same sound each time — not in sim, purely cosmetic)
  for (let i = 0; i < data.length; i++) {
    data[i] = ((i * 127 + 31) % 256) / 128 - 1;
  }
  const src    = ac.createBufferSource();
  const env    = ac.createGain();
  const filter = ac.createBiquadFilter();
  filter.type            = 'bandpass';
  filter.frequency.value = 1200;
  filter.Q.value         = 0.8;

  src.buffer = buf;
  const now  = ac.currentTime;
  env.gain.setValueAtTime(gainPeak, now);
  env.gain.exponentialRampToValueAtTime(0.001, now + duration);

  src.connect(filter);
  filter.connect(env);
  env.connect(ac.destination);
  src.start(now);
  src.stop(now + duration + 0.05);
}

export function soundLightHit(): void {
  playTone(180, 'square', 0.005, 0.12, 0.3);
  playNoise(0.08, 0.15);
}

export function soundHeavyHit(): void {
  playTone(90, 'sawtooth', 0.005, 0.25, 0.5);
  playTone(140, 'square', 0.005, 0.15, 0.25, -20);
  playNoise(0.15, 0.3);
}

export function soundBlock(): void {
  playTone(320, 'square', 0.003, 0.08, 0.2);
  playTone(480, 'square', 0.003, 0.06, 0.1);
}

export function soundKnockdown(): void {
  playTone(60, 'sawtooth', 0.005, 0.4, 0.6);
  playNoise(0.25, 0.5);
}

export function soundRoundEnd(): void {
  playTone(440, 'sine', 0.01, 0.3, 0.4);
  playTone(550, 'sine', 0.01, 0.3, 0.3, 0);
  setTimeout(() => playTone(660, 'sine', 0.01, 0.5, 0.5), 180);
}

// Must be called from a user gesture to unlock AudioContext on Chrome
export function unlockAudio(): void {
  getCtx().resume().catch(() => {});
}
