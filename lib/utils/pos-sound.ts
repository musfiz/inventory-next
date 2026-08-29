'use client';

/**
 * Tiny Web Audio "beep" helper for POS feedback (successful scan, payment,
 * error). Uses the Web Audio API so there are no binary audio assets to ship.
 * Safe to call in the browser only; no-ops during SSR or when audio is blocked.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    try {
      audioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

type BeepKind = 'scan' | 'success' | 'error';

const PRESETS: Record<BeepKind, { freq: number; dur: number; type: OscillatorType }> = {
  scan: { freq: 880, dur: 0.08, type: 'square' },
  success: { freq: 1046, dur: 0.14, type: 'sine' },
  error: { freq: 220, dur: 0.2, type: 'sawtooth' },
};

export function playPosBeep(kind: BeepKind = 'success') {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();

  const { freq, dur, type } = PRESETS[kind];
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;

  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.15, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}
