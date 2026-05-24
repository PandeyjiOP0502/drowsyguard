/**
 * detector.js
 * DrowsyGuard — Enhanced Detection state machine.
 * Tracks frame counters, cooldown, EAR/MAR history, head pose, PERCLOS, blink rate.
 */

import { DEFAULTS } from './config.js';
import { combinedEAR, mouthAspectRatio, smoothPush, calculateHeadPose, calculatePERCLOS, calculateBlinkRate, clamp } from './math.js';

export class DrowsinessDetector {
  constructor(onDrowsy, onYawn, onStateChange, onGazeAway = null, onHeadPose = null) {
    this._onDrowsy      = onDrowsy;
    this._onYawn        = onYawn;
    this._onStateChange = onStateChange;
    this._onGazeAway    = onGazeAway;
    this._onHeadPose    = onHeadPose;

    this.earThreshold   = DEFAULTS.EAR_THRESHOLD;
    this.marThreshold   = DEFAULTS.MAR_THRESHOLD;
    this.alertFrames    = DEFAULTS.ALERT_FRAMES;

    this._earHist  = [];
    this._marHist  = [];

    this._drowsyFr = 0;
    this._yawnFr   = 0;
    this._gazeAwayFr = 0;

    this._cooldown = false;
    this._alerted  = false;

    this._lastState = null;

    // Enhanced tracking
    this._eyeStates = [];
    this._blinkHistory = [];
    this._lastBlinkTime = 0;
    this._wasEyesClosed = false;
    this._headPoseHistory = [];
    this._sessionStartMs = Date.now();
  }

  setEARThreshold(v)   { this.earThreshold  = v; }
  setMARThreshold(v)   { this.marThreshold  = v; }
  setAlertFrames(v)   { this.alertFrames   = v; }

  get drowsyFrameCount() { return this._drowsyFr; }
  get isCooldown()       { return this._cooldown; }

  // Enhanced metrics getters
  get blinkRate() {
    return calculateBlinkRate(this._blinkHistory, 60000);
  }

  get perclos() {
    const windowSize = DEFAULTS.PERCLOS_WINDOW_SEC * 30;
    const recentStates = this._eyeStates.slice(-windowSize);
    return calculatePERCLOS(recentStates);
  }

  get currentHeadPose() {
    if (this._headPoseHistory.length === 0) return { yaw: 0, pitch: 0, roll: 0 };
    return this._headPoseHistory[this._headPoseHistory.length - 1];
  }

  startCooldown(ms = 3500) {
    this._cooldown = true;
    this._alerted  = true;
    setTimeout(() => {
      this._cooldown = false;
      this._alerted  = false;
      this._drowsyFr = 0;
    }, ms);
  }

  resetAlert() {
    this._drowsyFr = 0;
    this._yawnFr   = 0;
    this._gazeAwayFr = 0;
    this._alerted  = false;
  }

  /**
   * @param {Array} landmarks - MediaPipe landmark array (or null if no face)
   * @returns {{ ear: number, mar: number, state: string, headPose: object, blinkRate: number, perclos: number } | null}
   */
  process(landmarks) {
    if (!landmarks) {
      this._drowsyFr = 0;
      this._yawnFr   = 0;
      this._gazeAwayFr = 0;
      this._emitState('NO_FACE');
      this._eyeStates.push('no_face');
      return null;
    }

    const rawEAR = combinedEAR(landmarks);
    const rawMAR = mouthAspectRatio(landmarks);

    const ear = smoothPush(this._earHist, rawEAR, DEFAULTS.SMOOTH_HIST);
    const mar = smoothPush(this._marHist, rawMAR, DEFAULTS.SMOOTH_HIST);

    // Track eye states for PERCLOS
    const eyeState = ear < this.earThreshold ? 'closed' : 'open';
    this._eyeStates.push(eyeState);
    if (this._eyeStates.length > 900) this._eyeStates.shift();

    // Blink detection
    if (eyeState === 'open' && this._wasEyesClosed && !this._cooldown) {
      const now = Date.now();
      if (now - this._lastBlinkTime > 200) {
        this._blinkHistory.push(now);
        if (this._blinkHistory.length > 100) this._blinkHistory.shift();
      }
      this._lastBlinkTime = now;
    }
    this._wasEyesClosed = eyeState === 'closed';

    // Drowsiness counter
    if (ear < this.earThreshold) {
      this._drowsyFr++;
      if (this._drowsyFr >= this.alertFrames && !this._cooldown) {
        this._cooldown = true;
        this._alerted  = true;
        this._onDrowsy();
      }
    } else {
      this._drowsyFr = Math.max(0, this._drowsyFr - 1);
    }

    // Yawn counter
    if (mar > this.marThreshold) {
      this._yawnFr++;
      if (this._yawnFr === DEFAULTS.YAWN_FRAMES && !this._cooldown) {
        this._onYawn();
      }
    } else {
      this._yawnFr = 0;
    }

    // Head pose tracking
    const headPose = calculateHeadPose(landmarks);
    this._headPoseHistory.push(headPose);
    if (this._headPoseHistory.length > 30) this._headPoseHistory.shift();

    if (this._onHeadPose) {
      this._onHeadPose(headPose);
    }

    // Gaze away detection
    if (headPose.isLookingAway) {
      this._gazeAwayFr++;
      if (this._gazeAwayFr >= DEFAULTS.GAZE_AWAY_FRAMES && !this._cooldown && this._onGazeAway) {
        this._onGazeAway();
        this._gazeAwayFr = 0;
      }
    } else {
      this._gazeAwayFr = Math.max(0, this._gazeAwayFr - 1);
    }

    // PERCLOS-based drowsiness
    const perclos = this.perclos;
    if (perclos > DEFAULTS.PERCLOS_THRESH && !this._cooldown && !this._alerted) {
      this._alerted = true;
      this._onDrowsy();
    }

    // Compute current state
    const drowsyPct = this._drowsyFr / this.alertFrames;
    let state;
    if (headPose.isLookingAway) {
      state = 'LOOKING_AWAY';
    } else if (drowsyPct >= 0.9) {
      state = 'DROWSY';
    } else if (drowsyPct >= 0.5) {
      state = 'CLOSING';
    } else if (mar > this.marThreshold) {
      state = 'YAWNING';
    } else {
      state = 'AWAKE';
    }

    this._emitState(state);

    return { 
      ear, 
      mar, 
      state,
      headPose,
      blinkRate: this.blinkRate,
      perclos
    };
  }

  _emitState(state) {
    if (state !== this._lastState) {
      this._lastState = state;
      this._onStateChange(state);
    }
  }
}
