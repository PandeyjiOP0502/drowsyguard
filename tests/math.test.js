import { describe, it, expect, beforeEach } from 'vitest';
import {
  dist,
  dist3D,
  eyeAspectRatio,
  combinedEAR,
  mouthAspectRatio,
  calculateHeadPose,
  calculatePERCLOS,
  calculateBlinkRate,
  smoothPush,
  clamp,
  exponentialSmooth
} from '../js/math.js';

describe('Math Helpers', () => {
  describe('dist', () => {
    it('calculates 2D Euclidean distance', () => {
      const a = { x: 0, y: 0 };
      const b = { x: 3, y: 4 };
      expect(dist(a, b)).toBe(5);
    });

    it('returns 0 for same point', () => {
      const a = { x: 5, y: 5 };
      const b = { x: 5, y: 5 };
      expect(dist(a, b)).toBe(0);
    });
  });

  describe('dist3D', () => {
    it('calculates 3D Euclidean distance', () => {
      const a = { x: 0, y: 0, z: 0 };
      const b = { x: 1, y: 2, z: 2 };
      expect(dist3D(a, b)).toBe(3);
    });
  });

  describe('clamp', () => {
    it('clamps value to min', () => {
      expect(clamp(5, 10, 20)).toBe(10);
    });

    it('clamps value to max', () => {
      expect(clamp(25, 10, 20)).toBe(20);
    });

    it('returns value if within range', () => {
      expect(clamp(15, 10, 20)).toBe(15);
    });
  });

  describe('smoothPush', () => {
    it('calculates rolling average', () => {
      const history = [];
      const v1 = smoothPush(history, 2, 4);
      const v2 = smoothPush(history, 4, 4);
      const v3 = smoothPush(history, 6, 4);
      expect(v3).toBe(4); // (2+4+6)/3
    });

    it('respects max length', () => {
      const history = [];
      smoothPush(history, 1, 3);
      smoothPush(history, 2, 3);
      smoothPush(history, 3, 3);
      smoothPush(history, 4, 3);
      expect(history.length).toBe(3);
    });
  });

  describe('exponentialSmooth', () => {
    it('applies exponential smoothing', () => {
      const result = exponentialSmooth(10, 20, 0.5);
      expect(result).toBe(15);
    });

    it('favors target with high alpha', () => {
      const result = exponentialSmooth(10, 20, 0.9);
      expect(result).toBeCloseTo(19, 0);
    });
  });
});

describe('Eye Aspect Ratio', () => {
  // Mock landmarks for eye (simplified)
  const mockEyeIndices = [0, 1, 2, 3, 4, 5];
  
  const openEyeLandmarks = [
    { x: 0.1, y: 0.2 }, // p1 left
    { x: 0.15, y: 0.18 }, // p2 top
    { x: 0.15, y: 0.22 }, // p3 bottom
    { x: 0.2, y: 0.2 }, // p4 right
    { x: 0.17, y: 0.19 }, // p5
    { x: 0.17, y: 0.21 } // p6
  ];

  it('calculates higher EAR for open eye', () => {
    const ear = eyeAspectRatio(openEyeLandmarks, mockEyeIndices);
    expect(ear).toBeGreaterThan(0.2);
  });
});

describe('Mouth Aspect Ratio', () => {
  it('calculates MAR for closed mouth', () => {
    const closedMouth = [
      { x: 0.3, y: 0.5 }, // left
      { x: 0.7, y: 0.5 }, // right
      { x: 0.5, y: 0.48 }, // top
      { x: 0.5, y: 0.52 } // bottom
    ];
    const mar = mouthAspectRatio(closedMouth);
    expect(mar).toBeLessThan(0.2);
  });

  it('calculates higher MAR for open mouth', () => {
    const openMouth = [
      { x: 0.3, y: 0.5 },
      { x: 0.7, y: 0.5 },
      { x: 0.5, y: 0.45 },
      { x: 0.5, y: 0.65 }
    ];
    const mar = mouthAspectRatio(openMouth);
    expect(mar).toBeGreaterThan(0.3);
  });
});

describe('Head Pose', () => {
  it('calculates head pose angles', () => {
    const landmarks = Array(500).fill(null).map(() => ({ x: 0.5, y: 0.5, z: 0 }));
    // Set key landmarks
    landmarks[1] = { x: 0.5, y: 0.6, z: 0 };  // nose tip
    landmarks[152] = { x: 0.5, y: 0.9, z: 0 }; // chin
    landmarks[234] = { x: 0.2, y: 0.5, z: 0 }; // left ear
    landmarks[454] = { x: 0.8, y: 0.5, z: 0 }; // right ear
    landmarks[10] = { x: 0.5, y: 0.2, z: 0 }; // forehead
    landmarks[4] = { x: 0.5, y: 0.65, z: 0 }; // nose bottom
    landmarks[473] = { x: 0.4, y: 0.5, z: 0 }; // left eye center
    landmarks[468] = { x: 0.6, y: 0.5, z: 0 }; // right eye center
    
    const pose = calculateHeadPose(landmarks);
    
    expect(pose).toHaveProperty('yaw');
    expect(pose).toHaveProperty('pitch');
    expect(pose).toHaveProperty('roll');
    expect(pose).toHaveProperty('isLookingAway');
  });
});

describe('PERCLOS', () => {
  it('calculates percentage of closed eyes', () => {
    const eyeStates = ['open', 'closed', 'closed', 'open', 'closed'];
    const perclos = calculatePERCLOS(eyeStates);
    expect(perclos).toBe(0.6); // 3 closed / 5 total
  });

  it('returns 0 for empty states', () => {
    expect(calculatePERCLOS([])).toBe(0);
  });
});

describe('Blink Rate', () => {
  it('calculates blinks within time window', () => {
    const now = Date.now();
    const blinkHistory = [
      now - 5000,
      now - 30000,
      now - 45000,
      now - 90000
    ];
    const rate = calculateBlinkRate(blinkHistory, 60000); // 1 minute window
    expect(rate).toBe(3); // 3 blinks in last minute
  });

  it('returns 0 for empty history', () => {
    expect(calculateBlinkRate([], 60000)).toBe(0);
  });
});