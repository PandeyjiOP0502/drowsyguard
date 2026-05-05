/**
 * DrowsyGuard Type Definitions
 * Professional TypeScript types for all modules
 */

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export type LandmarkArray = Landmark[];

export interface FaceMeshResults {
  multiFaceLandmarks?: LandmarkArray[];
  multi_face_landmarks?: LandmarkArray[];
}

export interface HeadPose {
  yaw: number;
  pitch: number;
  roll: number;
  isLookingAway: boolean;
}

export interface DetectionResult {
  ear: number;
  mar: number;
  state: string;
  headPose: HeadPose;
  blinkRate: number;
  perclos: number;
}

export interface DetectionCallbacks {
  onDrowsy: () => void;
  onYawn: () => void;
  onStateChange: (state: string) => void;
  onGazeAway?: () => void;
  onHeadPose?: (pose: HeadPose) => void;
}

export interface DetectorConfig {
  earThreshold: number;
  marThreshold: number;
  alertFrames: number;
  yawnFrames: number;
  smoothHistory: number;
}

export interface UIState {
  alertCount: number;
  yawnCount: number;
  sessionTime: number;
  riskLevel: 'LOW' | 'MED' | 'HIGH';
  blinkRate: number;
  perclos: number;
  gazeAwayCount: number;
  headPose: HeadPose;
}

export interface CameraConfig {
  width: number;
  height: number;
  facingMode: 'user' | 'environment';
  frameRate: number;
}

export interface MediaPipeConfig {
  locateFile: (file: string) => string;
  maxNumFaces: number;
  refineLandmarks: boolean;
  selfieMode: boolean;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
}