/**
 * PowerFlow UI Sound System
 *
 * Uses the Web Audio API to synthesize short techy sounds.
 * No audio files needed — everything is generated at runtime.
 */

let audioCtx: AudioContext | null = null;

function ctx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/* ── Individual sound generators ── */

/** Short click / tap — quick high-pitched blip */
function playTap() {
  const c = ctx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1800, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, c.currentTime + 0.06);
  gain.gain.setValueAtTime(0.08, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.06);
}

/** Navigation / page change — ascending two-tone sweep */
function playNavigate() {
  const c = ctx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(800, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1400, c.currentTime + 0.1);
  gain.gain.setValueAtTime(0.07, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.12);
}

/** Success — bright ascending arpeggio (three quick notes) */
function playSuccess() {
  const c = ctx();
  const freqs = [880, 1100, 1320];
  freqs.forEach((f, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    const t = c.currentTime + i * 0.08;
    osc.frequency.setValueAtTime(f, t);
    gain.gain.setValueAtTime(0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  });
}

/** Error — low buzz with slight wobble */
function playError() {
  const c = ctx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(220, c.currentTime);
  osc.frequency.setValueAtTime(200, c.currentTime + 0.08);
  osc.frequency.setValueAtTime(220, c.currentTime + 0.16);
  gain.gain.setValueAtTime(0.06, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.22);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.22);
}

/** Keypad press — soft tick (for PIN entry etc.) */
function playKeypress() {
  const c = ctx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(2400, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1600, c.currentTime + 0.03);
  gain.gain.setValueAtTime(0.06, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.04);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.04);
}

/** Charging / recharge — electric zap sweep */
function playCharge() {
  const c = ctx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(400, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(2000, c.currentTime + 0.15);
  osc.frequency.exponentialRampToValueAtTime(600, c.currentTime + 0.3);
  gain.gain.setValueAtTime(0.05, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.3);
}

/* ── Public API ── */

export const Sounds = {
  tap: playTap,
  navigate: playNavigate,
  success: playSuccess,
  error: playError,
  keypress: playKeypress,
  charge: playCharge,
} as const;
