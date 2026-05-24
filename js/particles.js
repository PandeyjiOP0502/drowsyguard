/**
 * particles.js
 * DrowsyGuard — Lightweight particle canvas system.
 * Floating dots that connect with thin lines when close.
 * Particles respond subtly to mouse movement.
 * Performance-optimized with requestAnimationFrame.
 */

const PARTICLE_COUNT = 45;
const CONNECTION_DIST = 120;
const PARTICLE_SPEED = 0.3;
const MOUSE_INFLUENCE = 80;

let canvas = null;
let ctx = null;
let particles = [];
let mouse = { x: -1000, y: -1000 };
let animId = null;
let isRunning = false;

class Particle {
  constructor(w, h) {
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.vx = (Math.random() - 0.5) * PARTICLE_SPEED;
    this.vy = (Math.random() - 0.5) * PARTICLE_SPEED;
    this.radius = Math.random() * 1.5 + 0.5;
    this.opacity = Math.random() * 0.4 + 0.1;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.w = w;
    this.h = h;
  }

  update(time) {
    // Mouse influence (subtle repulsion)
    const dx = this.x - mouse.x;
    const dy = this.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < MOUSE_INFLUENCE && dist > 0) {
      const force = (MOUSE_INFLUENCE - dist) / MOUSE_INFLUENCE * 0.02;
      this.vx += (dx / dist) * force;
      this.vy += (dy / dist) * force;
    }

    // Damping
    this.vx *= 0.998;
    this.vy *= 0.998;

    this.x += this.vx;
    this.y += this.vy;

    // Wrap edges
    if (this.x < 0) this.x = this.w;
    if (this.x > this.w) this.x = 0;
    if (this.y < 0) this.y = this.h;
    if (this.y > this.h) this.y = 0;

    // Pulse opacity
    this.currentOpacity = this.opacity + Math.sin(time * 0.001 + this.pulsePhase) * 0.08;
  }

  draw(drawCtx) {
    drawCtx.beginPath();
    drawCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    drawCtx.fillStyle = `rgba(0, 212, 255, ${this.currentOpacity})`;
    drawCtx.fill();
  }
}

function drawConnections(drawCtx) {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < CONNECTION_DIST) {
        const opacity = (1 - dist / CONNECTION_DIST) * 0.12;
        drawCtx.beginPath();
        drawCtx.moveTo(particles[i].x, particles[i].y);
        drawCtx.lineTo(particles[j].x, particles[j].y);
        drawCtx.strokeStyle = `rgba(0, 212, 255, ${opacity})`;
        drawCtx.lineWidth = 0.5;
        drawCtx.stroke();
      }
    }
  }
}

function animate(time) {
  if (!isRunning || !canvas || !ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const p of particles) {
    p.update(time);
    p.draw(ctx);
  }

  drawConnections(ctx);
  animId = requestAnimationFrame(animate);
}

function resize() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Update particle bounds
  for (const p of particles) {
    p.w = canvas.width;
    p.h = canvas.height;
  }
}

function createParticles() {
  particles = [];
  const count = Math.min(PARTICLE_COUNT, Math.floor(canvas.width * canvas.height / 20000));
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(canvas.width, canvas.height));
  }
}

/**
 * Initialize the particle canvas system.
 * Call this once after DOMContentLoaded.
 */
export function initParticleSystem() {
  canvas = document.getElementById('particleCanvas');
  if (!canvas) return;

  ctx = canvas.getContext('2d');
  if (!ctx) return;

  resize();
  createParticles();

  window.addEventListener('resize', resize);

  // Track mouse position for influence
  document.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  document.addEventListener('mouseleave', () => {
    mouse.x = -1000;
    mouse.y = -1000;
  });

  isRunning = true;
  animId = requestAnimationFrame(animate);
}

/**
 * Stop particle animation (for performance when not needed).
 */
export function stopParticles() {
  isRunning = false;
  if (animId) {
    cancelAnimationFrame(animId);
    animId = null;
  }
}
