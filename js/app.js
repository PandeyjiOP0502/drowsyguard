/**
 * app.js
 * DrowsyGuard — Application entry point & orchestrator.
 * Initialises camera, MediaPipe FaceMesh, detector, and wires all modules.
 * Enhanced with particle system and boot sequence animation.
 */

import { MEDIAPIPE, CAM_CONSTRAINTS } from './config.js';
import { DrowsinessDetector }          from './detector.js';
import { renderOverlay, clearOverlay } from './draw.js';
import { playAlarm, ensureAudioCtx }   from './audio.js';
import { initParticleSystem }          from './particles.js';
import {
  log, setSessionStart, updateTimer, setFPS,
  setHudActive, setHudOffline,
  setStateChip, updateMetricBars, clearMetricBars,
  updateCounts, updateEnhancedMetrics, incrementGazeAway,
  showAlert, hideAlert,
  setLoadingState, setLoadingError, hideStartOverlay,
  bindSliders,
} from './ui.js';

// ── DOM references ────────────────────────────────────────────────────────────
const vid = document.getElementById('vid');
const ovCanvas = document.getElementById('ov');
const ctx2d = ovCanvas.getContext('2d');

// ── State ─────────────────────────────────────────────────────────────────────
let alertCount   = 0;
let yawnCount    = 0;
let fpsCounter   = 0;
let faceMesh     = null;
let camera       = null;
let rafId        = null;
let frameWatchdogId = null;
let hasSeenFace  = false;
let sendErrShown = false;
let fallbackLoopActive = false;
let lastResultsTs = 0;
let framesSent = 0;
let trackingStartTs = 0;

// ── Initialize particle system on page load ───────────────────────────────────
initParticleSystem();

// ── Detector ─────────────────────────────────────────────────────────────────
const detector = new DrowsinessDetector(
  /* onDrowsy */
  () => {
    alertCount++;
    showAlert('drowsy');
    playAlarm('drowsy');
    updateCounts(alertCount, yawnCount);
    log('DROWSINESS DETECTED — alert triggered', 'alert');
    detector.startCooldown(3500);
  },
  /* onYawn */
  () => {
    yawnCount++;
    showAlert('yawn');
    playAlarm('yawn');
    updateCounts(alertCount, yawnCount);
    log('Yawn detected', 'yawn');
  },
  /* onStateChange */
  (state) => {
    setStateChip(state);
  },
  /* onGazeAway */
  () => {
    incrementGazeAway();
    playAlarm('yawn');
  },
  /* onHeadPose */
  null
);

// ── Dismiss button / keyboard ─────────────────────────────────────────────────
function dismissAlert() {
  hideAlert();
  detector.resetAlert();
}
document.getElementById('btnDismiss')?.addEventListener('click', dismissAlert);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') dismissAlert();
});

// ── Slider wiring ─────────────────────────────────────────────────────────────
bindSliders((key, value) => {
  if      (key === 'EAR') detector.setEARThreshold(value);
  else if (key === 'MAR') detector.setMARThreshold(value);
  else if (key === 'DEL') detector.setAlertFrames(value);
});

// ── MediaPipe results callback ────────────────────────────────────────────────
function onResults(results) {
  lastResultsTs = Date.now();

  // Sync canvas size to video
  ovCanvas.width  = vid.videoWidth  || 640;
  ovCanvas.height = vid.videoHeight || 480;
  const W = ovCanvas.width;
  const H = ovCanvas.height;

  fpsCounter++;

  const landmarks =
    results.multiFaceLandmarks?.[0] ||
    results.multi_face_landmarks?.[0] ||
    null;

  if (!landmarks) {
    detector.process(null);
    clearOverlay(ctx2d, W, H);
    clearMetricBars();
    return;
  }

  if (!hasSeenFace) {
    hasSeenFace = true;
    log('Face detected — tracking active', 'ok');
  }

  const result = detector.process(landmarks);
  if (!result) return;

  const { ear, mar, headPose, blinkRate, perclos } = result;

  updateMetricBars(ear, mar, detector.earThreshold, detector.marThreshold);
  updateEnhancedMetrics(blinkRate, perclos, headPose);

  renderOverlay(
    ctx2d, landmarks, W, H,
    ear, mar,
    detector.drowsyFrameCount,
    detector.alertFrames,
    detector.earThreshold,
    detector.marThreshold,
    headPose
  );
}

// ── Fallback frame loop (if MediaPipe Camera util isn't available) ────────────
function startFallbackTrackingLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  fallbackLoopActive = true;
  let busy = false;

  const tick = async () => {
    if (!busy && faceMesh && !vid.paused && !vid.ended) {
      busy = true;
      try {
        framesSent++;
        await faceMesh.send({ image: vid });
      } catch (err) {
        if (!sendErrShown) {
          sendErrShown = true;
          log('Face tracking frame error: ' + err.message, 'alert');
        }
      } finally {
        busy = false;
      }
    }
    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);
}

function stopFrameWatchdog() {
  if (frameWatchdogId) {
    clearInterval(frameWatchdogId);
    frameWatchdogId = null;
  }
}

function startFrameWatchdog() {
  stopFrameWatchdog();

  frameWatchdogId = setInterval(() => {
    if (!faceMesh || fallbackLoopActive) return;
    if (!vid.srcObject) return;

    const now = Date.now();
    const sinceStart = now - trackingStartTs;
    const staleFor = lastResultsTs > 0 ? now - lastResultsTs : 0;

    // Generous initial window (15 seconds) for FaceMesh WASM models to download and compile.
    const noResultsYet = lastResultsTs === 0 && sinceStart > 15000;
    // Post-startup stall: if we had results before but haven't got any new ones in 5 seconds.
    const stalled = lastResultsTs > 0 && staleFor > 5000;

    if (!noResultsYet && !stalled) return;

    log('Frame pipeline stalled — restarting camera in fallback mode', 'alert');
    stopFrameWatchdog();

    if (camera && typeof camera.stop === 'function') {
      camera.stop().catch(() => {});
      camera = null;
    }

    // Re-request direct video stream and start the manual requestAnimationFrame loop
    startDirectStream()
      .then(() => {
        startFallbackTrackingLoop();
      })
      .catch((err) => {
        log('Fallback camera recovery failed: ' + err.message, 'alert');
      });
  }, 1500);
}

function stopVideoStream() {
  const stream = vid.srcObject;
  if (stream && typeof stream.getTracks === 'function') {
    stream.getTracks().forEach((track) => track.stop());
  }
  vid.srcObject = null;
}

async function getCameraPermissionState() {
  if (!navigator.permissions?.query) return 'unavailable';
  try {
    const status = await navigator.permissions.query({ name: 'camera' });
    return status.state;
  } catch {
    return 'unavailable';
  }
}

async function debugCameraSetup() {
  let isTopLevel = true;
  try {
    isTopLevel = window.top === window.self;
  } catch {
    isTopLevel = false;
  }

  const debug = {
    protocol: location.protocol,
    hostname: location.hostname,
    isSecureContext: window.isSecureContext,
    isTopLevel,
    hasMediaDevices: !!navigator.mediaDevices,
    hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia,
    cameraPermission: await getCameraPermissionState(),
    hasCameraUtils: typeof Camera === 'function',
    hasFaceMesh: typeof FaceMesh === 'function',
    userAgent: navigator.userAgent,
  };

  console.log('[DrowsyGuard] Camera setup debug:', debug);
  return debug;
}

function isLocalHostName(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function getCameraErrorMessage(err) {
  const name = err && typeof err === 'object' ? err.name : '';

  if (name === 'NotAllowedError') {
    return 'Camera permission denied. Allow camera access in browser site settings and reload.';
  }
  if (name === 'NotFoundError') {
    return 'No camera was found. Connect a camera device and try again.';
  }
  if (name === 'NotReadableError') {
    return 'Camera is busy or blocked by another app. Close other camera apps and retry.';
  }
  if (name === 'OverconstrainedError') {
    return 'Requested camera settings are not supported on this device.';
  }
  if (name === 'SecurityError') {
    return 'Camera access blocked by browser security policy. Use HTTPS or localhost in an external browser tab.';
  }

  if (err instanceof Error && err.message) {
    return err.message;
  }

  return 'Unable to start camera. Check browser permissions and browser context, then try again.';
}

async function startDirectStream() {
  stopVideoStream();
  try {
    const stream = await navigator.mediaDevices.getUserMedia(CAM_CONSTRAINTS);
    vid.srcObject = stream;
    await waitForVideoReady(vid);
    await vid.play();
  } catch (err) {
    throw new Error(getCameraErrorMessage(err));
  }
}

function waitForVideoReady(videoEl) {
  return new Promise((resolve) => {
    if (videoEl.readyState >= 2 && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
      resolve();
      return;
    }

    const onReady = () => {
      if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
        videoEl.removeEventListener('loadedmetadata', onReady);
        videoEl.removeEventListener('loadeddata', onReady);
        resolve();
      }
    };

    videoEl.addEventListener('loadedmetadata', onReady);
    videoEl.addEventListener('loadeddata', onReady);
  });
}

// ── Boot sequence messages ────────────────────────────────────────────────────
const BOOT_MESSAGES = [
  'INITIALIZING NEURAL ENGINE…',
  'LOADING FACE MESH MODEL…',
  'CALIBRATING EAR/MAR METRICS…',
  'CONFIGURING DETECTION PIPELINE…',
  'STARTING VISION SYSTEM…',
];

// ── Progress bar loader helper with boot sequence ─────────────────────────────
function startProgressAnim() {
  let prog = 0;
  let msgIdx = 0;
  return setInterval(() => {
    prog = Math.min(prog + 1.6, 88);
    
    // Cycle through boot messages
    const newIdx = Math.min(Math.floor(prog / 18), BOOT_MESSAGES.length - 1);
    if (newIdx !== msgIdx) {
      msgIdx = newIdx;
    }
    
    setLoadingState(BOOT_MESSAGES[msgIdx], prog);
  }, 40);
}

// ── init() — called by "Activate System" button ───────────────────────────────
export async function init() {
  const btn = document.getElementById('btnStart');
  btn.disabled     = true;
  btn.style.opacity = '0.4';

  // Kick off audio context on this user gesture
  ensureAudioCtx();

  const progTimer = startProgressAnim();

  try {
    const cameraDebug = await debugCameraSetup();

    if (location.protocol === 'file:') {
      throw new Error('Camera access requires localhost/https. Start with: npm run serve');
    }

    if (!window.isSecureContext) {
      throw new Error('Camera access requires a secure context. Use HTTPS or open http://localhost:8080 in an external browser tab.');
    }

    if (!cameraDebug.isTopLevel && !cameraDebug.hasGetUserMedia) {
      throw new Error('This page appears embedded and cannot access camera APIs. Open DrowsyGuard directly in Chrome/Edge/Firefox.');
    }

    if (cameraDebug.cameraPermission === 'denied') {
      throw new Error('Camera permission is blocked for this site. Allow camera access in browser settings and reload.');
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      const localHint = isLocalHostName(location.hostname)
        ? 'If you are in an embedded preview/webview, open http://localhost:8080 directly in Chrome/Edge/Firefox.'
        : 'Use HTTPS or localhost in a recent Chrome/Edge/Firefox build.';
      throw new Error('Camera API unavailable in this runtime. ' + localHint);
    }

    if (typeof FaceMesh !== 'function') {
      throw new Error('MediaPipe FaceMesh not loaded. Verify vendor scripts are available.');
    }

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    stopFrameWatchdog();
    hasSeenFace = false;
    sendErrShown = false;
    fallbackLoopActive = false;
    lastResultsTs = 0;
    framesSent = 0;
    trackingStartTs = Date.now();

    // ── MediaPipe FaceMesh ───────────────────────────────────────────────────
    faceMesh = new FaceMesh({ locateFile: MEDIAPIPE.LOCATE_FILE });
    faceMesh.setOptions(MEDIAPIPE.OPTIONS);
    faceMesh.onResults(onResults);

    clearInterval(progTimer);
    setLoadingState('SYSTEMS ONLINE — ACTIVATING…', 100);

    // ── MediaPipe Camera util ────────────────────────────────────────────────
    if (typeof Camera === 'function') {
      camera = new Camera(vid, {
        onFrame: async () => {
          try {
            framesSent++;
            await faceMesh.send({ image: vid });
          } catch (err) {
            if (!sendErrShown) {
              sendErrShown = true;
              log('Face tracking frame error: ' + err.message, 'alert');
            }
          }
        },
        width:  MEDIAPIPE.CAMERA.width,
        height: MEDIAPIPE.CAMERA.height,
      });
      try {
        await camera.start();
        await waitForVideoReady(vid);
        await vid.play().catch(() => {});
        startFrameWatchdog();
      } catch (cameraErr) {
        log('Camera utils failed, switching to direct stream: ' + getCameraErrorMessage(cameraErr), 'info');
        await startDirectStream();
        startFallbackTrackingLoop();
      }
    } else {
      await startDirectStream();
      startFallbackTrackingLoop();
      log('Camera utils unavailable, using fallback frame loop', 'info');
    }

    // ── Session start ────────────────────────────────────────────────────────
    const startTs = Date.now();
    setSessionStart(startTs);

    setInterval(updateTimer, 1000);
    setInterval(() => {
      setFPS(fpsCounter);
      fpsCounter = 0;
    }, 1000);

    hideStartOverlay();
    setHudActive();
    log('Detection system activated', 'ok');

  } catch (err) {
    const userMessage = getCameraErrorMessage(err);
    stopFrameWatchdog();
    clearInterval(progTimer);
    setLoadingError(userMessage);
    setHudOffline();
    log('Camera error: ' + userMessage, 'alert');
    console.error('[DrowsyGuard] Init error:', err);
    btn.disabled     = false;
    btn.style.opacity = '1';
  }
}

// ── Expose init to the HTML button onclick ────────────────────────────────────
window.initDrowsyGuard  = init;
window.dismissAlert     = dismissAlert;
