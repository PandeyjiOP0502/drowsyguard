/**
 * draw.js
 * DrowsyGuard — Canvas 2D rendering of face landmark overlays.
 * Draws eyes, mouth, nose bridge, metrics text.
 */

import { LANDMARKS } from './config.js';

// ── Helper: draw a closed polygon through landmark indices ────────────────────
function polyPath(ctx, landmarks, indices, W, H) {
  ctx.beginPath();
  indices.forEach((idx, i) => {
    const p = landmarks[idx];
    if (!p) return;
    i === 0 ? ctx.moveTo(p.x * W, p.y * H) : ctx.lineTo(p.x * W, p.y * H);
  });
  ctx.closePath();
}

// ── Draw glowing region ───────────────────────────────────────────────────────
function glowRegion(ctx, color, fillAlpha) {
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1.8;
  ctx.shadowColor = color;
  ctx.shadowBlur  = 9;
  ctx.stroke();
  ctx.fillStyle = color + Math.round(fillAlpha * 255).toString(16).padStart(2, '0');
  ctx.fill();
  ctx.shadowBlur = 0;
}

// ── Eyes ──────────────────────────────────────────────────────────────────────
function drawEyes(ctx, landmarks, W, H, ear, earThreshold) {
  let color;
  if (ear < earThreshold)            color = '#ff2055';        // closed
  else if (ear < earThreshold + 0.05) color = '#ffd700';       // borderline
  else                                color = '#39ff14';        // open

  [LANDMARKS.LEFT_EYE, LANDMARKS.RIGHT_EYE].forEach(eye => {
    polyPath(ctx, landmarks, eye, W, H);
    glowRegion(ctx, color, 0.13);
  });
}

// ── Mouth ─────────────────────────────────────────────────────────────────────
function drawMouth(ctx, landmarks, W, H, mar, marThreshold) {
  const color = mar > marThreshold ? '#ffd700' : 'rgba(0,212,255,0.8)';
  polyPath(ctx, landmarks, LANDMARKS.MOUTH_RING, W, H);
  glowRegion(ctx, color, 0.09);
}

// ── Nose bridge line ──────────────────────────────────────────────────────────
function drawNose(ctx, landmarks, W, H) {
  const [a, b] = LANDMARKS.NOSE_BRIDGE.map(i => landmarks[i]);
  ctx.beginPath();
  ctx.moveTo(a.x * W, a.y * H);
  ctx.lineTo(b.x * W, b.y * H);
  ctx.strokeStyle = 'rgba(0,212,255,0.2)';
  ctx.lineWidth   = 1;
  ctx.shadowBlur  = 0;
  ctx.stroke();
}

// ── Forehead center dot ───────────────────────────────────────────────────────
function drawForehead(ctx, landmarks, W, H) {
  const p = landmarks[LANDMARKS.FOREHEAD];
  ctx.beginPath();
  ctx.arc(p.x * W, p.y * H, 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,212,255,0.55)';
  ctx.fill();
}

// ── On-canvas metric readout ──────────────────────────────────────────────────
function drawMetrics(ctx, W, H, ear, mar, headPose = null) {
  ctx.font      = 'bold 11px "JetBrains Mono", monospace';
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(0,212,255,0.85)';
  ctx.fillText(`EAR ${ear.toFixed(3)}`, 8, H - 28);

  ctx.fillStyle = 'rgba(57,255,20,0.85)';
  ctx.fillText(`MAR ${mar.toFixed(3)}`, 8, H - 12);

  if (headPose) {
    const poseText = `YAW:${headPose.yaw.toFixed(0)}° PITCH:${headPose.pitch.toFixed(0)}°`;
    ctx.fillStyle = 'rgba(255,200,100,0.75)';
    ctx.fillText(poseText, 8, H - 44);
  }
}

// ── Frame counter label ───────────────────────────────────────────────────────
function drawDrowsyProgress(ctx, W, drowsyFrames, alertFrames) {
  if (drowsyFrames <= 0) return;
  const pct    = Math.min(drowsyFrames / alertFrames, 1);
  const barW   = 120;
  const x      = W - barW - 8;
  const y      = 10;

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x, y, barW, 5);

  const color = pct > 0.7 ? '#ff2055' : pct > 0.4 ? '#ffd700' : '#39ff14';
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur  = 6;
  ctx.fillRect(x, y, barW * pct, 5);
  ctx.shadowBlur = 0;

  ctx.fillStyle   = 'rgba(255,255,255,0.45)';
  ctx.font        = '9px "JetBrains Mono", monospace';
  ctx.fillText('DROWSY RISK', x, y + 16);
}

// ── Main export ───────────────────────────────────────────────────────────────
/**
 * Draw everything on the overlay canvas.
 */
export function renderOverlay(
  ctx2d, landmarks, W, H,
  ear, mar,
  drowsyFrames, alertFrames,
  earThreshold, marThreshold,
  headPose = null
) {
  ctx2d.clearRect(0, 0, W, H);
  if (!landmarks) return;

  drawEyes(ctx2d, landmarks, W, H, ear, earThreshold);
  drawMouth(ctx2d, landmarks, W, H, mar, marThreshold);
  drawNose(ctx2d, landmarks, W, H);
  drawForehead(ctx2d, landmarks, W, H);
  drawMetrics(ctx2d, W, H, ear, mar, headPose);
  drawDrowsyProgress(ctx2d, W, drowsyFrames, alertFrames);
}

/**
 * Clear the overlay canvas (no face detected).
 */
export function clearOverlay(ctx2d, W, H) {
  ctx2d.clearRect(0, 0, W, H);
}
