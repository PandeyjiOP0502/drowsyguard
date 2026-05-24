/**
 * math.js
 * DrowsyGuard — Pure math helpers: distance, EAR, MAR, rolling average, head pose.
 * No DOM or audio dependencies.
 */

import { LANDMARKS, HEAD_POSE } from './config.js';

// ── Euclidean distance between two landmarks ─────────────────────────────────
export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function dist3D(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

// ── Eye Aspect Ratio ─────────────────────────────────────────────────────────
export function eyeAspectRatio(landmarks, indices) {
  const [p1, p2, p3, p4, p5, p6] = indices.map(i => landmarks[i]);
  const vertical  = dist(p2, p6) + dist(p3, p5);
  const horizontal = 2 * dist(p1, p4);
  return vertical / horizontal;
}

// ── Combined (both eyes) EAR ─────────────────────────────────────────────────
export function combinedEAR(landmarks) {
  const left  = eyeAspectRatio(landmarks, LANDMARKS.LEFT_EYE);
  const right = eyeAspectRatio(landmarks, LANDMARKS.RIGHT_EYE);
  return (left + right) / 2;
}

// ── Mouth Aspect Ratio ───────────────────────────────────────────────────────
export function mouthAspectRatio(landmarks) {
  const [L, R, T, B] = LANDMARKS.MOUTH_CORNERS.map(i => landmarks[i]);
  return dist(T, B) / dist(L, R);
}



// ── Head Pose Estimation ────────────────────────────────────────────────────
export function calculateHeadPose(landmarks) {
  const noseTip = landmarks[LANDMARKS.NOSE_TIP];
  const chin = landmarks[LANDMARKS.CHIN];
  const leftCheek = landmarks[LANDMARKS.LEFT_EAR];
  const rightCheek = landmarks[LANDMARKS.RIGHT_EAR];
  const forehead = landmarks[LANDMARKS.FOREHEAD_TOP];
  const noseBottom = landmarks[LANDMARKS.NOSE_BOTTOM];
  
  // Yaw (left/right rotation) - using cheek symmetry
  const faceWidth = dist(leftCheek, rightCheek);
  const noseOffsetX = (noseTip.x - 0.5) * 2;
  const yaw = -noseOffsetX * (90 / faceWidth);
  
  // Pitch (up/down rotation) - using nose-forehead alignment
  const verticalDist = dist(forehead, chin);
  const nosePosition = (noseTip.y - forehead.y) / verticalDist;
  const pitch = (nosePosition - 0.4) * 90;
  
  // Roll (tilt) - using eye line
  const leftEye = landmarks[LANDMARKS.LEFT_EYE_CENTER];
  const rightEye = landmarks[LANDMARKS.RIGHT_EYE_CENTER];
  const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);
  
  return {
    yaw: clamp(yaw, -60, 60),
    pitch: clamp(pitch, -45, 45),
    roll: clamp(roll, -30, 30),
    isLookingAway: Math.abs(yaw) > HEAD_POSE.YAW_RIGHT || Math.abs(pitch) > Math.abs(HEAD_POSE.PITCH_UP)
  };
}

// ── PERCLOS (Percentage of time eyes closed) ───────────────────────────────
export function calculatePERCLOS(eyeStates, windowSeconds = 30) {
  if (eyeStates.length === 0) return 0;
  const closedFrames = eyeStates.filter(s => s === 'closed').length;
  return closedFrames / eyeStates.length;
}

// ── Blink Rate Calculation ──────────────────────────────────────────────────
export function calculateBlinkRate(blinkHistory, timeWindowMs = 60000) {
  if (blinkHistory.length < 2) return 0;
  const now = Date.now();
  const recentBlinks = blinkHistory.filter(t => now - t < timeWindowMs);
  return recentBlinks.length;
}

// ── Rolling average smoothing ─────────────────────────────────────────────────
export function smoothPush(history, value, maxLen) {
  history.push(value);
  if (history.length > maxLen) history.shift();
  return history.reduce((s, v) => s + v, 0) / history.length;
}

// ── Clamp a number between min and max ───────────────────────────────────────
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

// ── Exponential smoothing for smoother transitions ─────────────────────────
export function exponentialSmooth(current, target, alpha = 0.3) {
  return alpha * target + (1 - alpha) * current;
}
