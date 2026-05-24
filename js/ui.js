/**
 * ui.js
 * DrowsyGuard — All DOM interactions: log, stats, alert overlay, sliders, HUD.
 * Exports functions that app.js calls; never imports app.js (one-way).
 * Enhanced with motion graphics: animated counters, typewriter log, parallax cards.
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
 * Append a log line with smooth entrance animation.
 * @param {string} msg
 * @param {'info'|'ok'|'yawn'|'alert'} type
 */
export function log(msg, type = 'info') {
  const row = document.createElement('div');
  row.className = `lg ${type}`;
  row.style.opacity = '0';
  row.style.transform = 'translateX(-8px)';
  row.innerHTML = `<span class="lt">${nowStamp()}</span><span>${msg}</span>`;
  const body = el('logBody');
  body.insertBefore(row, body.firstChild);
  
  // Animate entrance
  requestAnimationFrame(() => {
    row.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    row.style.opacity = '1';
    row.style.transform = 'translateX(0)';
  });
  
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
  const camChip = el('camChip');
  camChip.textContent    = 'CAM · LIVE';
  camChip.style.color    = 'var(--green)';
  camChip.style.borderColor = 'rgba(57, 255, 20, 0.3)';
  el('liveDot').classList.add('live');
  el('statusTxt').textContent  = 'ACTIVE';
  el('statusTxt').style.color  = 'var(--green)';
}

export function setHudOffline() {
  const camChip = el('camChip');
  camChip.textContent   = 'CAM · OFFLINE';
  camChip.style.color   = 'var(--txt-dim)';
  camChip.style.borderColor = '';
  el('liveDot').classList.remove('live', 'alarm');
  el('statusTxt').textContent = 'STANDBY';
  el('statusTxt').style.color = '';
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
  const chip = el('stateChip');
  chip.textContent   = s.text;
  chip.style.color   = s.color;
  
  // Subtle pulse on state change
  chip.style.transition = 'none';
  chip.style.transform = 'scale(1.05)';
  requestAnimationFrame(() => {
    chip.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
    chip.style.transform = 'scale(1)';
  });
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

  // Dynamic text shadow based on danger level
  const earEl = el('earV');
  if (ear < earT) {
    earEl.style.color = 'var(--alert)';
    earEl.style.textShadow = '0 0 20px rgba(255, 32, 85, 0.4)';
  } else if (ear < earT + 0.06) {
    earEl.style.color = 'var(--warn)';
    earEl.style.textShadow = '0 0 15px rgba(255, 215, 0, 0.3)';
  } else {
    earEl.style.color = 'var(--cyan)';
    earEl.style.textShadow = '0 0 20px rgba(0, 212, 255, 0.2)';
  }

  const marFill = el('marFill');
  marFill.style.width      = `${marPct}%`;
  if (mar > marT) {
    marFill.style.background = '';
    marFill.className = 'mfill warn';
    el('marV').style.color = 'var(--warn)';
    el('marV').style.textShadow = '0 0 15px rgba(255, 215, 0, 0.3)';
  } else {
    marFill.style.background = '';
    marFill.className = 'mfill';
    marFill.style.background = 'linear-gradient(90deg, var(--green), #00ff88, var(--green))';
    marFill.style.backgroundSize = '300% 100%';
    el('marV').style.color = 'var(--green)';
    el('marV').style.textShadow = '0 0 15px rgba(57, 255, 20, 0.2)';
  }
}

export function clearMetricBars() {
  el('earV').textContent      = '—';
  el('marV').textContent      = '—';
  el('earFill').style.width   = '0%';
  el('marFill').style.width   = '0%';
  el('earV').style.color      = 'var(--cyan)';
  el('marV').style.color      = 'var(--green)';
}

// ── Session counters & risk ───────────────────────────────────────────────────
export function updateCounts(alerts, yawns) {
  animateValue(el('cntAlert'), alerts);
  animateValue(el('cntYawn'), yawns);

  const score = alerts * 2 + yawns;
  let lbl, col;
  if      (score >= RISK.HIGH)   { lbl = 'HIGH'; col = 'var(--alert)'; }
  else if (score >= RISK.MEDIUM) { lbl = 'MED';  col = 'var(--warn)';  }
  else                           { lbl = 'LOW';  col = 'var(--green)'; }
  
  const riskEl = el('riskLevel');
  riskEl.textContent   = lbl;
  riskEl.style.color   = col;
  
  // Pulse effect on risk change
  riskEl.style.transition = 'none';
  riskEl.style.transform = 'scale(1.2)';
  requestAnimationFrame(() => {
    riskEl.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
    riskEl.style.transform = 'scale(1)';
  });
}

/**
 * Animate a numeric value change with a brief scale pulse.
 */
function animateValue(element, newValue) {
  if (!element) return;
  element.textContent = newValue;
  element.style.transition = 'none';
  element.style.transform = 'scale(1.15)';
  requestAnimationFrame(() => {
    element.style.transition = 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
    element.style.transform = 'scale(1)';
  });
}

// ── Enhanced metrics ─────────────────────────────────────────────────────────
let gazeAwayCount = 0;

export function updateEnhancedMetrics(blinkRate, perclos, headPose) {
  if (el('cntBlink')) {
    el('cntBlink').textContent = blinkRate;
    el('cntBlink').style.color = (blinkRate < 5 || blinkRate > 30) ? 'var(--warn)' : 'var(--cyan)';
    el('cntBlink').style.textShadow = (blinkRate < 5 || blinkRate > 30)
      ? '0 0 12px rgba(255, 215, 0, 0.3)'
      : '0 0 12px rgba(0, 212, 255, 0.2)';
  }
  
  if (el('cntPerclos')) {
    const perclosPct = Math.round(perclos * 100);
    el('cntPerclos').textContent = `${perclosPct}%`;
    if (perclosPct > 15) {
      el('cntPerclos').style.color = 'var(--alert)';
      el('cntPerclos').style.textShadow = '0 0 15px rgba(255, 32, 85, 0.3)';
    } else if (perclosPct > 8) {
      el('cntPerclos').style.color = 'var(--warn)';
      el('cntPerclos').style.textShadow = '0 0 12px rgba(255, 215, 0, 0.3)';
    } else {
      el('cntPerclos').style.color = 'var(--green)';
      el('cntPerclos').style.textShadow = '0 0 12px rgba(57, 255, 20, 0.2)';
    }
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
    animateValue(el('cntGaze'), gazeAwayCount);
    el('cntGaze').style.color = 'var(--warn)';
    el('cntGaze').style.textShadow = '0 0 12px rgba(255, 215, 0, 0.3)';
  }
  log('Gaze away detected', 'yawn');
}

// ── Alert overlay ─────────────────────────────────────────────────────────────
/**
 * Show full-screen alert overlay with enhanced animation.
 * @param {'drowsy'|'yawn'} type
 */
export function showAlert(type) {
  const alertBig = el('alertBig');
  const alertSub = el('alertSub');
  
  if (type === 'drowsy') {
    alertBig.textContent = '⚠ DROWSY!';
    alertBig.setAttribute('data-text', '⚠ DROWSY!');
    alertSub.textContent = 'WAKE UP — STAY ALERT';
  } else {
    alertBig.textContent = '😮 YAWNING';
    alertBig.setAttribute('data-text', '😮 YAWNING');
    alertSub.textContent = 'FATIGUE SIGN DETECTED';
  }
  
  el('alertOv').classList.add('on');
  el('liveDot').classList.add('alarm');

  // Camera box shake
  const box = el('camBox');
  box.classList.add('alarming');
  setTimeout(() => box.classList.remove('alarming'), 600);
}

export function hideAlert() {
  const overlay = el('alertOv');
  // Smooth fade-out
  overlay.style.transition = 'opacity 0.3s ease';
  overlay.style.opacity = '0';
  setTimeout(() => {
    overlay.classList.remove('on');
    overlay.style.opacity = '';
    overlay.style.transition = '';
  }, 300);
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
  ov.style.transform = 'scale(1.02)';
  ov.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  setTimeout(() => (ov.style.display = 'none'), 650);
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
