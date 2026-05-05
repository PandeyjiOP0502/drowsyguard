/**
 * config.js
 * DrowsyGuard — All constants, landmark indices, and default thresholds.
 */

// ── MediaPipe Face Mesh landmark indices ────────────────────────────────────
export const LANDMARKS = {
  LEFT_EYE:  [33, 160, 158, 133, 153, 144],
  RIGHT_EYE: [362, 385, 387, 263, 373, 380],
  MOUTH_CORNERS: [61, 291, 0, 17],
  MOUTH_RING: [
    61,185,40,39,37,0,267,269,270,409,
    291,375,321,405,314,17,84,181,91,146
  ],
  NOSE_BRIDGE: [168, 4],
  FOREHEAD:    10,
  NOSE_TIP: 1,
  CHIN: 152,
  LEFT_EAR: 234,
  RIGHT_EAR: 454,
  LEFT_EYE_CENTER: 473,
  RIGHT_EYE_CENTER: 468,
  LEFT_EYE_TOP: 159,
  LEFT_EYE_BOTTOM: 145,
  RIGHT_EYE_TOP: 386,
  RIGHT_EYE_BOTTOM: 374,
  FOREHEAD_TOP: 10,
  NOSE_BOTTOM: 4,
};

// ── Default detection thresholds ────────────────────────────────────────────
export const DEFAULTS = {
  EAR_THRESHOLD:  0.25,
  MAR_THRESHOLD:  0.55,
  ALERT_FRAMES:   25,
  YAWN_FRAMES:    18,
  SMOOTH_HIST:    4,
  // New enhanced thresholds
  HEAD_POSE_YAW_THRESH:    25,
  HEAD_POSE_PITCH_THRESH:  20,
  PERCLOS_THRESH:          0.15,
  BLINK_RATE_MIN:          5,
  BLINK_RATE_MAX:          25,
  PERCLOS_WINDOW_SEC:      30,
  GAZE_AWAY_FRAMES:        30,
};

// ── MediaPipe model config ───────────────────────────────────────────────────
// Uses vendored local files for offline operation
// MediaPipe assets are located at: /vendor/mediapipe/face_mesh/
export const MEDIAPIPE = {
  // locateFile: used by FaceMesh to resolve .tflite and WASM files.
  // Use module-relative URLs so it works from localhost and nested paths.
  LOCATE_FILE: (file) => new URL(`../vendor/mediapipe/face_mesh/${file}`, import.meta.url).href,
  OPTIONS: {
    maxNumFaces:            1,
    refineLandmarks:        true,
    selfieMode:             true,
    minDetectionConfidence: 0.3,
    minTrackingConfidence:  0.3,
  },
  CAMERA: {
    width:  640,
    height: 480,
  },
};

// ── Camera constraints ───────────────────────────────────────────────────────
export const CAM_CONSTRAINTS = {
  audio: false,
  video: {
    facingMode: 'user',
    width:  { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30, max: 60 },
  },
};

// ── Risk thresholds (combined score = alerts*2 + yawns) ─────────────────────
export const RISK = {
  HIGH:   6,
  MEDIUM: 3,
  LOW:    0,
};

// ── Head pose angles in degrees ─────────────────────────────────────────────
export const HEAD_POSE = {
  YAW_LEFT:   -25,
  YAW_RIGHT:   25,
  PITCH_UP:   -20,
  PITCH_DOWN:  20,
};
