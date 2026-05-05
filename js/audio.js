/**
 * audio.js
 * DrowsyGuard — Plays "fahhhhh.mp3" alarm sound.
 * No external libraries required.
 */

let audioCtx = null;

// ── Lazy-init AudioContext (must be called on first user gesture) ─────────────
export function ensureAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// ── Play the fahhhhh.mp3 file ─────────────────────────────────────────────────
function playFahSound() {
  return new Promise((resolve) => {
    const audio = new Audio('fahhhhh.mp3');
    audio.volume = 1.0;
    audio.onended = resolve;
    audio.onerror = resolve;
    audio.play().catch(() => resolve());
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Play alarm.
 * @param {'drowsy'|'yawn'} type  - 'drowsy' plays 3×, 'yawn' plays 1×
 */
export async function playAlarm(type = 'drowsy') {
  try {
    ensureAudioCtx();
    const reps = type === 'drowsy' ? 3 : 1;
    for (let i = 0; i < reps; i++) {
      await playFahSound();
    }
  } catch (e) {
    console.warn('[audio] playAlarm failed:', e);
  }
}

/**
 * Play a short beep (used for UI feedback).
 * @param {number} freq  - frequency in Hz
 * @param {number} dur   - duration in seconds
 */
export function playBeep(freq = 880, dur = 0.08) {
  try {
    const ctx  = ensureAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
  } catch (e) { /* silent fail */ }
}
