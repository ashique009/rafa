/**
 * LiquidEngine
 * Physics-driven 3D floating liquid body.
 * Real floating volume with top undulating surface, curved bottom hull,
 * multi-layer depth parallax (surface, back layer, internal layer, bottom hull),
 * organic multi-harmonic deformation, and localized musical bass ripples.
 */
export class LiquidEngine {
  constructor(numPoints = 38) {
    this.numPoints = numPoints;
    this.width = 1000;
    this.height = 800;
    this.margin = 32;

    // Top surface fluid arrays
    this.x = new Float32Array(numPoints);
    this.y = new Float32Array(numPoints);
    this.targetY = new Float32Array(numPoints);
    this.vy = new Float32Array(numPoints);

    // Deep back layer surface
    this.backY = new Float32Array(numPoints);

    // Internal luminous caustic layer
    this.internalY = new Float32Array(numPoints);

    // Bottom hull floating boundary (gives the liquid a real thick 3D body)
    this.bottomY = new Float32Array(numPoints);
    this.backBottomY = new Float32Array(numPoints);

    // Fluid physics parameters
    this.tension = 0.018;
    this.damping = 0.040;
    this.spread = 0.24;

    // Inertial slosh dynamics
    this.sloshAngle = 0;
    this.sloshVelocity = 0;
    this.targetSloshAngle = 0;
    this.tiltYOffset = 0;

    this.time = 0;
    this.baseFillRatio = 0.34; // Liquid occupies lower ~34% of viewport
    this.lastBeatTime = 0;
    this.beatIndex = 0;

    // Musical dynamics state
    this.quietTime = 0;
    this.dropSurge = 0;
    this.sustainedEnergy = 0.2;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;

    // Responsive lateral margins for floating pod appearance
    this.margin = Math.min(40, Math.max(18, width * 0.032));
    const usableWidth = width - this.margin * 2;
    const step = usableWidth / (this.numPoints - 1);

    const initialSurfaceY = height * (1 - this.baseFillRatio);
    const initialBottomY = height * 0.94;

    for (let i = 0; i < this.numPoints; i++) {
      const normI = i / (this.numPoints - 1);
      const hullCurve = Math.sin(normI * Math.PI) * (height * 0.035);

      this.x[i] = this.margin + i * step;
      this.y[i] = initialSurfaceY;
      this.targetY[i] = initialSurfaceY;
      this.vy[i] = 0;

      this.backY[i] = initialSurfaceY + 20;
      this.internalY[i] = initialSurfaceY + 40;

      this.bottomY[i] = initialBottomY + hullCurve;
      this.backBottomY[i] = initialBottomY + hullCurve + 14;
    }
  }

  // Get surface height at normalized screen X (0.0 to 1.0)
  getSurfaceY(normX) {
    const screenX = normX * this.width;
    const clampedX = Math.max(this.margin, Math.min(this.width - this.margin, screenX));
    const usableWidth = this.width - this.margin * 2;
    const localNorm = (clampedX - this.margin) / usableWidth;

    const rawIdx = localNorm * (this.numPoints - 1);
    const i = Math.floor(rawIdx);
    const frac = rawIdx - i;
    if (i >= this.numPoints - 1) return this.y[this.numPoints - 1];
    return this.y[i] * (1 - frac) + this.y[i + 1] * frac;
  }

  // Get bottom hull height at normalized screen X (0.0 to 1.0)
  getBottomY(normX) {
    const screenX = normX * this.width;
    const clampedX = Math.max(this.margin, Math.min(this.width - this.margin, screenX));
    const usableWidth = this.width - this.margin * 2;
    const localNorm = (clampedX - this.margin) / usableWidth;

    const rawIdx = localNorm * (this.numPoints - 1);
    const i = Math.floor(rawIdx);
    const frac = rawIdx - i;
    if (i >= this.numPoints - 1) return this.bottomY[this.numPoints - 1];
    return this.bottomY[i] * (1 - frac) + this.bottomY[i + 1] * frac;
  }

  // Check if a point is physically inside the floating liquid body
  isInsideBody(screenX, screenY) {
    const normX = screenX / this.width;
    const surfY = this.getSurfaceY(normX);
    const botY = this.getBottomY(normX);
    return screenY >= surfY && screenY <= botY && screenX >= this.margin && screenX <= (this.width - this.margin);
  }

  splash(normX, force, radius = 5) {
    const centerIdx = Math.floor(Math.max(0, Math.min(1, normX)) * (this.numPoints - 1));
    for (let i = -radius; i <= radius; i++) {
      const idx = centerIdx + i;
      if (idx >= 0 && idx < this.numPoints) {
        const falloff = Math.cos((i / radius) * (Math.PI * 0.5));
        this.vy[idx] += force * falloff * 5.2;
      }
    }
  }

  applyMotion({ tiltX = 0, tiltY = 0, shakeImpulse = 0 }) {
    this.targetSloshAngle = tiltX * 0.12;
    if (shakeImpulse > 0.2) {
      this.splash(Math.random(), (Math.random() - 0.5) * shakeImpulse * 8, 6);
    }
    this.tiltYOffset = tiltY * 18;
  }

  update(dt, audioMetrics = {}) {
    this.time += dt;
    const t = this.time;

    const volume = audioMetrics.volume ?? 0.2;
    const bass = audioMetrics.bass ?? 0.2;
    const mid = audioMetrics.mid ?? 0.2;
    const treble = audioMetrics.treble ?? 0.15;
    const energy = audioMetrics.energy ?? 0.2;
    const transient = audioMetrics.transient ?? 0.0;

    // 1. Slosh pendulum momentum
    const angleDiff = this.targetSloshAngle - this.sloshAngle;
    const angularAcc = angleDiff * 3.5 - this.sloshVelocity * 2.8;
    this.sloshVelocity += angularAcc * dt;
    this.sloshAngle += this.sloshVelocity * dt;

    // 2. Localized beat ripples from alternating musical origins (Section 11)
    if (transient > 0.20 && t - this.lastBeatTime > 0.11) {
      this.lastBeatTime = t;
      const beatOrigins = [0.36, 0.64, 0.48, 0.28, 0.72];
      this.beatIndex = (this.beatIndex + 1) % beatOrigins.length;
      const beatX = beatOrigins[this.beatIndex] + (Math.sin(t * 2.1) * 0.06);
      const splashForce = transient * (4.2 + bass * 4.6);
      this.splash(beatX, splashForce, 6);
    }

    // 3. Bass Drop detection
    if (bass < 0.32 && energy < 0.3) {
      this.quietTime += dt;
    } else if (transient > 0.24 && bass > 0.58 && this.quietTime > 1.0) {
      this.dropSurge = 1.0;
      this.quietTime = 0;
      this.splash(0.5, 4.2 + bass * 3.6, 7);
    }
    this.dropSurge *= Math.pow(0.92, dt * 60);

    // 4. Chorus mode tracking
    this.sustainedEnergy = this.sustainedEnergy * 0.985 + energy * 0.015;
    const chorusFactor = Math.max(0, Math.min(1, (this.sustainedEnergy - 0.38) / 0.35));

    // 5. Audio-driven vertical floating dynamics (Section 10)
    // Weak bass: subtle float (+/- 6px)
    // Medium bass: clearly visible (+/- 25px)
    // Strong bass: noticeable rise/deformation (+/- 60px to 80px)
    const floatAmplitude = 6.0 + volume * 34.0 + (bass * bass) * 46.0 + chorusFactor * 15.0;
    const floatSpeed = 0.5 + energy * 0.7 + chorusFactor * 0.25;
    const verticalFloat =
      Math.sin(t * floatSpeed) * (floatAmplitude * 0.7) +
      Math.cos(t * floatSpeed * 1.5 + 1.2) * (floatAmplitude * 0.3);

    // Liquid rises organically with bass, transients, and drop surge
    const bassElevation = (bass * 42.0 * volume) + (transient * 16.0) + (this.dropSurge * 28.0);
    const restY = this.height * (1 - this.baseFillRatio) - verticalFloat - bassElevation + this.tiltYOffset;

    // 6. Wave swell amplitudes
    const swellAmp = 5.0 + (volume * 28.0) + (bass * 48.0) + (chorusFactor * 14.0);
    const waveSpeed = 0.5 + (mid * 0.8) + (energy * 0.55) + (chorusFactor * 0.28);
    const rippleAmp = 1.0 + (treble * 7.5);

    const tanSlosh = Math.tan(this.sloshAngle);
    const halfWidth = this.width * 0.5;

    // 7. Update spring-mass targets with irregular multi-harmonic fluid dynamics
    for (let i = 0; i < this.numPoints; i++) {
      const normI = i / (this.numPoints - 1);
      const sloshOffset = (this.x[i] - halfWidth) * tanSlosh;

      const phi1 = normI * 2.1 + t * 0.72 * waveSpeed;
      const phi2 = normI * 3.9 - t * 0.94 * waveSpeed + 1.3;
      const phi3 = normI * 5.7 + t * 1.35 * waveSpeed + 2.4;
      const phi4 = normI * 11.4 - t * 2.1 * waveSpeed;

      // Trochoidal wave profile
      const swell1 = (Math.sin(phi1) + 0.22 * Math.sin(phi1 * 2)) * (swellAmp * 0.52);
      const swell2 = (Math.cos(phi2) + 0.18 * Math.cos(phi2 * 2)) * (swellAmp * 0.32);
      const swell3 = Math.sin(phi3) * (swellAmp * 0.16);
      const microRipple = Math.cos(phi4) * rippleAmp;

      // Asymmetric localized bass body deformation
      const centerDome = Math.sin(normI * Math.PI);
      const asymDome = Math.sin(normI * Math.PI * 2.0) * 0.35;
      const bassSurge = (centerDome + asymDome) * (bass * 38.0 * (0.7 + 0.3 * Math.sin(t * 1.4 * waveSpeed)));

      this.targetY[i] = restY + sloshOffset + swell1 + swell2 + swell3 + microRipple - bassSurge;

      // Hooke's law restoration + damping
      const displacement = this.y[i] - this.targetY[i];
      const force = -this.tension * displacement - this.damping * this.vy[i];

      this.vy[i] += force * (dt * 60);
      this.y[i] += this.vy[i] * (dt * 60);
    }

    // 8. Neighbor wave spread
    for (let i = 0; i < this.numPoints - 1; i++) {
      const delta = this.spread * (this.y[i] - this.y[i + 1]);
      this.vy[i] -= delta * 0.5;
      this.vy[i + 1] += delta * 0.5;
    }

    // 9. Multi-layer depth parallax: Back surface & Internal caustic layer
    for (let i = 0; i < this.numPoints; i++) {
      const normI = i / (this.numPoints - 1);

      const backOffset = Math.sin(normI * 2.4 - t * 0.62 * waveSpeed + 1.8) * (swellAmp * 0.42);
      this.backY[i] = this.y[i] + backOffset + 22.0 + (bass * 16.0);

      const currentOffset = Math.cos(normI * 3.8 + t * 0.88 * waveSpeed + 0.6) * (swellAmp * 0.36);
      this.internalY[i] = this.y[i] + currentOffset + 44.0 + (bass * 18.0);
    }

    // 10. Dynamic Floating Bottom Hull (Section 1: Thick Floating Body)
    // Curvature gives an organic suspended vessel hull that floats above the bottom
    const bottomRestBase = this.height * 0.94 - verticalFloat * 0.35 - (bassElevation * 0.3);
    for (let i = 0; i < this.numPoints; i++) {
      const normI = i / (this.numPoints - 1);
      // Gentle rounded hull sag in center
      const hullCurve = Math.sin(normI * Math.PI) * (this.height * 0.038);
      // Subtle lagging bottom wave
      const botWave = Math.sin(normI * 2.6 - t * 0.45 * waveSpeed + 1.2) * (swellAmp * 0.16);

      this.bottomY[i] = bottomRestBase + hullCurve + botWave;
      this.backBottomY[i] = bottomRestBase + hullCurve + botWave + 12.0 + (bass * 6.0);
    }
  }
}
