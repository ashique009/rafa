/**
 * AmbientFieldEngine
 * Procedural particle field for RAFA:
 * - 35–50 particles (cyan, blue, violet, magenta)
 * - Dual drift: ~50% drift downward with the rain, ~50% slowly float upward
 * - Bass slightly increases brightness
 * - Strong beat creates a tiny upward particle response
 * - Calm, elegant, no explosions
 */
export class AmbientFieldEngine {
  constructor(numParticles = 45) {
    this.numParticles = numParticles;
    this.width = 1000;
    this.height = 800;

    // Particle arrays
    this.x = new Float32Array(numParticles);
    this.y = new Float32Array(numParticles);
    this.vx = new Float32Array(numParticles);
    this.vy = new Float32Array(numParticles);
    this.baseSize = new Float32Array(numParticles);
    this.size = new Float32Array(numParticles);
    this.baseAlpha = new Float32Array(numParticles);
    this.alpha = new Float32Array(numParticles);
    this.dir = new Int8Array(numParticles); // 1 = down with rain, -1 = float up
    this.hueType = new Uint8Array(numParticles); // 0: cyan, 1: blue, 2: violet, 3: magenta

    // Center offset drift
    this.lightOffsetX = 0;
    this.lightOffsetY = 0;
    this.targetLightX = 0;
    this.targetLightY = 0;

    // Device motion
    this.tiltX = 0;
    this.tiltY = 0;
    this.shakeImpulse = 0;

    this.time = 0;
    this.initParticles();
  }

  initParticles() {
    for (let i = 0; i < this.numParticles; i++) {
      this.resetParticle(i, true);
    }
  }

  resetParticle(i, randomizeY = false) {
    this.x[i] = Math.random() * this.width;
    // ~50% drift downward, ~50% float upward
    this.dir[i] = i % 2 === 0 ? 1 : -1;

    if (randomizeY) {
      this.y[i] = Math.random() * this.height;
    } else {
      this.y[i] = this.dir[i] === 1 ? -10 : this.height + 10;
    }

    // Slow drift velocity
    this.vx[i] = (Math.random() - 0.5) * 4.0;
    this.vy[i] = this.dir[i] * (2.0 + Math.random() * 5.0);

    const r = Math.random();
    if (r < 0.65) {
      // 65% Tiny points
      this.baseSize[i] = 1.0 + Math.random() * 1.1;
      this.baseAlpha[i] = 0.16 + Math.random() * 0.25;
    } else if (r < 0.90) {
      // 25% Small glowing dots
      this.baseSize[i] = 2.0 + Math.random() * 1.2;
      this.baseAlpha[i] = 0.28 + Math.random() * 0.25;
    } else {
      // 10% Soft bokeh particles
      this.baseSize[i] = 4.0 + Math.random() * 2.2;
      this.baseAlpha[i] = 0.10 + Math.random() * 0.15;
    }

    this.size[i] = this.baseSize[i];
    this.alpha[i] = this.baseAlpha[i];

    // Colors: cyan (35%), blue (35%), violet (18%), magenta (12%)
    const hueRand = Math.random();
    this.hueType[i] = hueRand < 0.35 ? 0 : hueRand < 0.70 ? 1 : hueRand < 0.88 ? 2 : 3;
  }

  resize(width, height) {
    const oldW = this.width || width;
    const oldH = this.height || height;
    this.width = width;
    this.height = height;

    for (let i = 0; i < this.numParticles; i++) {
      this.x[i] = (this.x[i] / oldW) * width;
      this.y[i] = (this.y[i] / oldH) * height;
    }
  }

  applyMotion({ tiltX = 0, tiltY = 0, shakeImpulse = 0 }) {
    this.tiltX = tiltX * 0.10;
    this.tiltY = tiltY * 0.10;
    if (shakeImpulse > 0.35) {
      this.disturb(0.5, 0.5, shakeImpulse * 8.0);
    }
  }

  disturb(normX, normY, strength = 6.0) {
    const px = normX * this.width;
    const py = normY * this.height;
    for (let i = 0; i < this.numParticles; i++) {
      const dx = this.x[i] - px;
      const dy = this.y[i] - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 180 && dist > 1) {
        const force = (1.0 - dist / 180) * strength;
        this.vx[i] += (dx / dist) * force;
        this.vy[i] += (dy / dist) * force;
      }
    }
  }

  update(dt, audioMetrics = {}) {
    this.time += dt;
    const bass = audioMetrics.bass ?? 0.0;
    const mid = audioMetrics.mid ?? 0.0;
    const treble = audioMetrics.treble ?? 0.0;
    const transient = audioMetrics.transient ?? 0.0;

    // Ambient light field center drift follows mid frequencies and device tilt
    this.targetLightX = Math.sin(this.time * 0.20) * 35.0 + (mid - 0.2) * 40.0 + this.tiltX * 35.0;
    this.targetLightY = Math.cos(this.time * 0.16) * 25.0 - bass * 20.0 + this.tiltY * 25.0;

    this.lightOffsetX += (this.targetLightX - this.lightOffsetX) * Math.min(1.0, 1.8 * dt);
    this.lightOffsetY += (this.targetLightY - this.lightOffsetY) * Math.min(1.0, 1.8 * dt);

    const speedMultiplier = 1.0 + bass * 0.35;

    for (let i = 0; i < this.numParticles; i++) {
      // Strong beat transient gives a tiny gentle upward lift
      if (transient > 0.25) {
        this.vy[i] -= transient * 4.5 * dt * 60;
      }

      // Gentle Brownian random drift
      this.vx[i] += (Math.random() - 0.5) * 0.8 * dt;
      this.vy[i] += this.dir[i] * 0.4 * dt;

      // Apply velocity with smooth physical damping
      this.x[i] += this.vx[i] * speedMultiplier * dt;
      this.y[i] += this.vy[i] * speedMultiplier * dt;
      this.vx[i] *= 0.985;
      this.vy[i] *= 0.985;

      // Wrap around bounds
      if (this.x[i] < -20) this.x[i] = this.width + 20;
      if (this.x[i] > this.width + 20) this.x[i] = -20;
      if (this.y[i] < -25 || this.y[i] > this.height + 25) {
        this.resetParticle(i, false);
      }

      // Bass slightly increases particle brightness
      const bassBoost = (i % 2 === 0) ? bass * 0.24 : bass * 0.10;
      const trebleBoost = (this.baseSize[i] < 2.0) ? treble * 0.25 : 0;
      const beatBoost = transient * 0.18;

      this.alpha[i] = Math.min(0.92, this.baseAlpha[i] + bassBoost + trebleBoost + beatBoost);
      this.size[i] = this.baseSize[i] * (1.0 + bass * 0.12);
    }
  }
}
