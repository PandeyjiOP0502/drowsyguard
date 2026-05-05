/**
 * ui.js
 * DrowsyGuard — All DOM interactions: log, stats, alert overlay, sliders, HUD.
 * Exports functions that app.js calls; never imports app.js (one-way).
 */

import { DEFAULTS, RISK } from './config.js';
import { clamp } from './math.js';

// ── Element shortcuts ─────────────────────────────────────────────────────────
const el = (id) => document.getElementById(id);

// ── Log ───────────────────────────────────────────────────────────────────────
let _logCount  = 0;
let _startTime = null;

export function setSessionStart(ts) { _startTime = ts; }

function nowStamp() {
  if (!_startTime) return '0:00';
  const s = Math.floor((Date.now() - _startTime) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Append a log line.
 * @param {string} msg
 * @param {'info'|'ok'|'yawn'|'alert'} type
 */
export function log(msg, type = 'info') {
  const row = document.createElement('div');
  row.className = `lg ${type}`;
  row.innerHTML = `<span class="lt">${nowStamp()}</span><span>${msg}</span>`;
  const body = el('logBody');
  body.insertBefore(row, body.firstChild);
  _logCount++;
  el('logCnt').textContent = `${_logCount} events`;
}

// ── Session timer ─────────────────────────────────────────────────────────────
export function updateTimer() {
  if (!_startTime) return;
  const s = Math.floor((Date.now() - _startTime) / 1000);
  el('cntTime').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ── HUD / nav ─────────────────────────────────────────────────────────────────
export function setHudActive() {
  el('camChip').textContent    = 'CAM · LIVE';
  el('camChip').style.color    = 'var(--green)';
  el('liveDot').classList.add('live');
  el('statusTxt').textContent  = 'ACTIVE';
}

export function setHudOffline() {
  el('camChip').textContent   = 'CAM · OFFLINE';
  el('camChip').style.color   = 'var(--txt-dim)';
  el('liveDot').classList.remove('live', 'alarm');
  el('statusTxt').textContent = 'STANDBY';
}

export function setFPS(fps) {
  el('fpsTxt').textContent = `${fps} FPS`;
}

// ── State chip ────────────────────────────────────────────────────────────────
const STATE = {
  NO_FACE:      { text: 'NO FACE DETECTED',  color: 'var(--txt-dim)' },
  AWAKE:        { text: '✓  AWAKE',          color: 'var(--green)'  },
  YAWNING:      { text: '😮 YAWNING',        color: 'var(--warn)'   },
  CLOSING:      { text: '⚠  EYES CLOSING',   color: 'var(--warn)'   },
  DROWSY:       { text: '⚠  VERY DROWSY',    color: 'var(--alert)'  },
  LOOKING_AWAY: { text: '👁 LOOKING AWAY',   color: 'var(--warn)'   },
};

export function setStateChip(key) {
  const s = STATE[key] || STATE.NO_FACE;
  el('stateChip').textContent   = s.text;
  el('stateChip').style.color   = s.color;
}

// ── Metric bars ───────────────────────────────────────────────────────────────
/**
 * @param {number} ear  - smoothed EAR (0..~0.5)
 * @param {number} mar  - smoothed MAR (0..~1)
 * @param {number} earT - EAR threshold
 * @param {number} marT - MAR threshold
 */
export function updateMetricBars(ear, mar, earT, marT) {
  el('earV').textContent = ear.toFixed(3);
  el('marV').textContent = mar.toFixed(3);

  const earPct = clamp(ear * 240, 0, 100);
  const marPct = clamp(mar * 110, 0, 100);

  const earFill = el('earFill');
  earFill.style.width = `${earPct}%`;
  earFill.className = 'mfill' + (
    ear < earT          ? ' danger' :
    ear < earT + 0.06   ? ' warn'   : ''
  );

  const marFill = el('marFill');
  marFill.style.width      = `${marPct}%`;
  marFill.style.background = mar > marT ? 'var(--warn)' : 'var(--green)';
}

export function clearMetricBars() {
  el('earV').textContent      = '—';
  el('marV').textContent      = '—';
  el('earFill').style.width   = '0%';
  el('marFill').style.width   = '0%';
}

// ── Session counters & risk ───────────────────────────────────────────────────
export function updateCounts(alerts, yawns) {
  el('cntAlert').textContent = alerts;
  el('cntYawn').textContent  = yawns;

  const score = alerts * 2 + yawns;
  let lbl, col;
  if      (score >= RISK.HIGH)   { lbl = 'HIGH'; col = 'var(--alert)'; }
  else if (score >= RISK.MEDIUM) { lbl = 'MED';  col = 'var(--warn)';  }
  else                           { lbl = 'LOW';  col = 'var(--green)'; }
  el('riskLevel').textContent   = lbl;
  el('riskLevel').style.color   = col;
}

// ── Enhanced metrics ─────────────────────────────────────────────────────────
let gazeAwayCount = 0;

export function updateEnhancedMetrics(blinkRate, perclos, headPose) {
  if (el('cntBlink')) {
    el('cntBlink').textContent = blinkRate;
    el('cntBlink').style.color = (blinkRate < 5 || blinkRate > 30) ? 'var(--warn)' : 'var(--cyan)';
  }
  
  if (el('cntPerclos')) {
    const perclosPct = Math.round(perclos * 100);
    el('cntPerclos').textContent = `${perclosPct}%`;
    el('cntPerclos').style.color = perclosPct > 15 ? 'var(--alert)' : perclosPct > 8 ? 'var(--warn)' : 'var(--green)';
  }
  
  if (el('cntHeadPose') && headPose) {
    const { yaw, pitch } = headPose;
    const isNormal = Math.abs(yaw) < 25 && Math.abs(pitch) < 20;
    el('cntHeadPose').textContent = isNormal ? 'OK' : 'TILT';
    el('cntHeadPose').style.color = isNormal ? 'var(--green)' : 'var(--warn)';
  }
}

export function incrementGazeAway() {
  if (el('cntGaze')) {
    gazeAwayCount++;
    el('cntGaze').textContent = gazeAwayCount;
    el('cntGaze').style.color = 'var(--warn)';
  }
  log('Gaze away detected', 'yawn');
}

// ── Alert overlay ─────────────────────────────────────────────────────────────
/**
 * Show full-screen alert overlay.
 * @param {'drowsy'|'yawn'} type
 */
export function showAlert(type) {
  if (type === 'drowsy') {
    el('alertBig').textContent = '⚠ DROWSY!';
    el('alertSub').textContent = 'WAKE UP — STAY ALERT';
  } else {
    el('alertBig').textContent = '😮 YAWNING';
    el('alertSub').textContent = 'FATIGUE SIGN DETECTED';
  }
  el('alertOv').classList.add('on');
  el('liveDot').classList.add('alarm');

  // Camera box shake
  const box = el('camBox');
  box.classList.add('alarming');
  setTimeout(() => box.classList.remove('alarming'), 600);
}

export function hideAlert() {
  el('alertOv').classList.remove('on');
  el('liveDot').classList.remove('alarm');
}

// ── Start overlay ─────────────────────────────────────────────────────────────
export function setLoadingState(msg, progress) {
  el('loadMsg').style.display      = 'block';
  el('loadBarWrap').style.display  = 'block';
  el('loadMsg').textContent        = msg;
  el('loadBar').style.width        = `${progress}%`;
}

export function setLoadingError(msg) {
  el('loadMsg').textContent   = `ERROR: ${msg}`;
  el('loadMsg').style.color   = 'var(--alert)';
  el('btnStart').disabled     = false;
  el('btnStart').style.opacity = '1';
}

export function hideStartOverlay() {
  const ov = el('startOv');
  ov.style.opacity = '0';
  setTimeout(() => (ov.style.display = 'none'), 550);
}

// ── Slider bindings ───────────────────────────────────────────────────────────
/**
 * Bind slider inputs and fire a callback on change.
 * @param {(key: string, value: number) => void} onChange
 * @returns {{ earT: number, marT: number, alertFrames: number }}
 */
export function bindSliders(onChange) {
  const sliders = [
    { id: 'sEAR', valId: 'vEAR', key: 'EAR', parse: parseFloat, def: DEFAULTS.EAR_THRESHOLD  },
    { id: 'sMAR', valId: 'vMAR', key: 'MAR', parse: parseFloat, def: DEFAULTS.MAR_THRESHOLD  },
    { id: 'sDEL', valId: 'vDEL', key: 'DEL', parse: parseInt,   def: DEFAULTS.ALERT_FRAMES   },
  ];

  sliders.forEach(({ id, valId, key, parse, def }) => {
    const input = el(id);
    input.value = def;
    el(valId).textContent = def;

    input.addEventListener('input', function () {
      const v = parse(this.value);
      el(valId).textContent = this.value;
      onChange(key, v);
    });
  });
}
