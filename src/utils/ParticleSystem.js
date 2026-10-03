/**
 * ParticleSystem manages dual-zone fluid particles:
 * 1. Subsurface bioluminescent bubbles drifting inside the liquid
 * 2. Atmospheric luminous micro-motes floating in the upper dark chamber
 */
export class ParticleSystem {
  constructor(width = 1000, height = 800) {
    this.width = width;
    this.height = height;
    this.subsurfaceParticles = [];
    this.atmosphericParticles = [];
    this.init();
  }

  init() {
    this.subsurfaceParticles = [];
    this.atmosphericParticles = [];

    // Subsurface particles (inside glowing fluid)
    const subCount = 75;
    for (let i = 0; i < subCount; i++) {
      this.subsurfaceParticles.push({
        x: Math.random() * this.width,
        yNorm: 0.65 + Math.random() * 0.3, // lower region
        radius: 1.2 + Math.random() * 3.5,
        alpha: 0.2 + Math.random() * 0.6,
        vx: (Math.random() - 0.5) * 12,
        vy: -8 - Math.random() * 16,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 1 + Math.random() * 2,
        colorType: Math.random() > 0.4 ? 'primary' : 'secondary',
      });
    }

    // Atmospheric embers/mist (above fluid surface)
    const atmosCount = 50;
    for (let i = 0; i < atmosCount; i++) {
      this.atmosphericParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * (this.height * 0.65),
        radius: 0.8 + Math.random() * 2.2,
        alpha: 0.15 + Math.random() * 0.5,
        baseAlpha: 0.15 + Math.random() * 0.4,
        vx: (Math.random() - 0.5) * 8,
        vy: -4 - Math.random() * 12,
        life: Math.random() * 10,
        maxLife: 6 + Math.random() * 8,
        twinkleSpeed: 2 + Math.random() * 4,
      });
    }
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
  }

  update(dt, audioData = {}, liquidPoints = []) {
    const {
      bassIntensity = 0.3,
      midIntensity = 0.3,
      trebleIntensity = 0.2,
      beatIntensity = 0.0,
    } = audioData;

    const len = liquidPoints.length;

    // Helper to get liquid surface Y at any x
    const getSurfaceY = (x) => {
      if (!len) return this.height * 0.65;
      const normX = Math.max(0, Math.min(1, x / this.width));
      const idx = Math.min(len - 1, Math.floor(normX * (len - 1)));
      return liquidPoints[idx]?.y ?? this.height * 0.65;
    };

    // Update Subsurface particles
    for (const p of this.subsurfaceParticles) {
      p.wobblePhase += dt * p.wobbleSpeed * (1 + midIntensity * 1.5);
      p.x += (p.vx + Math.sin(p.wobblePhase) * 15) * dt;

      // Wrap horizontally
      if (p.x < 0) p.x += this.width;
      if (p.x > this.width) p.x -= this.width;

      const surfaceY = getSurfaceY(p.x);
      let currentY = p.yNorm * this.height;
      currentY += (p.vy - bassIntensity * 25) * dt;

      // Keep inside liquid: if it reaches liquid surface, wrap to bottom
      if (currentY < surfaceY + 8) {
        currentY = this.height + 5;
        p.x = Math.random() * this.width;
      }
      if (currentY > this.height + 15) {
        currentY = surfaceY + 20;
      }

      p.yNorm = currentY / this.height;
      p.currentY = currentY;
    }

    // Update Atmospheric particles
    for (const p of this.atmosphericParticles) {
      p.life += dt;
      p.y += (p.vy - beatIntensity * 20) * dt;
      p.x += (p.vx + Math.sin(p.life * 1.5) * 6) * dt;

      // Twinkle with treble
      const twinkle = Math.sin(p.life * p.twinkleSpeed) * 0.3;
      p.alpha = Math.max(
        0.05,
        Math.min(1, p.baseAlpha + twinkle + trebleIntensity * 0.4)
      );

      // Reset when particle floats too high or expires
      if (p.y < -20 || p.life > p.maxLife) {
        p.life = 0;
        p.x = Math.random() * this.width;
        const surfY = getSurfaceY(p.x);
        p.y = surfY - 5 - Math.random() * 30; // spawn just above surface
      }
    }
  }

  draw(ctx, palette = {}) {
    const primary = palette.primary || '#00f3ff';
    const secondary = palette.secondary || '#ff007f';
    const tertiary = palette.tertiary || '#9d00ff';

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Draw subsurface glowing bubbles
    for (const p of this.subsurfaceParticles) {
      const color = p.colorType === 'primary' ? primary : secondary;
      ctx.beginPath();
      ctx.arc(p.x, p.currentY || p.yNorm * this.height, p.radius, 0, Math.PI * 2);

      const grad = ctx.createRadialGradient(
        p.x,
        p.currentY || p.yNorm * this.height,
        0,
        p.x,
        p.currentY || p.yNorm * this.height,
        p.radius * 2.8
      );
      grad.addColorStop(0, color);
      grad.addColorStop(0.5, `${color}88`);
      grad.addColorStop(1, 'transparent');

      ctx.fillStyle = grad;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
    }

    // Draw atmospheric floating embers
    for (const p of this.atmosphericParticles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

      ctx.fillStyle = tertiary;
      ctx.globalAlpha = p.alpha;
      ctx.shadowColor = primary;
      ctx.shadowBlur = 8;
      ctx.fill();
    }

    ctx.restore();
  }
}
