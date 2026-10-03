/**
 * VisualRenderer
 * 3D Physical Luminous Liquid Body in an Atmospheric Dark Space.
 * Features:
 * - Thick, floating 3D liquid volume with top surface and curved bottom hull
 * - 4 distinct liquid depth layers (deep water, main RGB fluid, internal light currents, soft surface meniscus)
 * - Internal light pools that drift, stretch, blend, and travel through depths
 * - 3D particle z-layering (behind liquid, inside liquid, and in foreground)
 * - 70/20/10 particle distribution with natural fluid interactions
 * - Cinematic beat light event (wave of light traveling through water)
 * - Real background lighting with dancing lights reflecting into the fluid
 */

// 4 Cinematic Luxurious Color Combinations
const COMBOS = [
  // Combo 0: Deep Blue + Cyan + Violet (Calm / Deep Atmospheric)
  {
    primary: [20, 110, 255],     // Electric Blue
    cyan: [0, 235, 245],        // Luminous Pure Cyan
    violet: [135, 65, 255],      // Royal Violet
    magenta: [225, 55, 205],     // Orchid Accent
    deep: [4, 25, 75],           // Midnight Sapphire
    ray: [0, 215, 245],          // Cyan Ray
  },
  // Combo 1: Purple + Magenta + Blue (Rich / Expressive / Melodic)
  {
    primary: [140, 50, 255],     // Deep Purple
    cyan: [25, 140, 255],        // Electric Azure
    violet: [180, 60, 255],      // Soft Royal Iris
    magenta: [238, 48, 195],     // Vivid Luminous Magenta
    deep: [25, 10, 65],          // Velvet Plum
    ray: [215, 55, 215],         // Magenta Ray
  },
  // Combo 2: Electric Blue + Violet + Pink (High Energy Chorus / Drop)
  {
    primary: [0, 165, 255],      // Electric Blue
    cyan: [0, 240, 240],         // Pure Cyan
    violet: [155, 70, 255],      // Vivid Violet
    magenta: [250, 60, 165],     // Cinematic Pink
    deep: [8, 28, 90],           // Oceanic Cobalt
    ray: [245, 75, 185],         // Hot Pink Ray
  },
  // Combo 3: Deep Indigo + Cyan + Soft Magenta (Atmospheric / Introspective)
  {
    primary: [55, 95, 255],      // Royal Indigo
    cyan: [0, 220, 230],         // Luminous Cyan
    violet: [120, 60, 240],      // Deep Violet
    magenta: [215, 65, 180],     // Soft Warm Magenta
    deep: [18, 8, 55],           // Midnight Indigo
    ray: [0, 195, 225],          // Teal Ray
  },
];

export class VisualRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.width = 1000;
    this.height = 800;
    this.dpr = 1;

    // Active interpolated colors (zero per-frame allocation)
    this.colors = {
      primary: [20, 110, 255],
      cyan: [0, 235, 245],
      violet: [135, 65, 255],
      magenta: [225, 55, 205],
      deep: [4, 25, 75],
      ray: [0, 215, 245],
    };

    // 4 Musical Dancing Lights behind the liquid
    this.lights = [
      { id: 'blue', colorKey: 'primary', baseXNorm: 0.50, baseYNorm: 0.62, x: 500, y: 500, prevX: 500, prevY: 500, baseRadiusNorm: 0.76, radius: 760, intensity: 0.20 },
      { id: 'cyan', colorKey: 'cyan', baseXNorm: 0.32, baseYNorm: 0.52, x: 320, y: 420, prevX: 320, prevY: 420, baseRadiusNorm: 0.66, radius: 660, intensity: 0.22 },
      { id: 'violet', colorKey: 'violet', baseXNorm: 0.70, baseYNorm: 0.40, x: 700, y: 320, prevX: 700, prevY: 320, baseRadiusNorm: 0.68, radius: 680, intensity: 0.20 },
      { id: 'magenta', colorKey: 'magenta', baseXNorm: 0.52, baseYNorm: 0.36, x: 520, y: 290, prevX: 520, prevY: 290, baseRadiusNorm: 0.58, radius: 580, intensity: 0.18 },
    ];

    // Volumetric concert light rays
    this.rays = [
      { baseAngle: -0.16, swingSpeed: 0.12, width: 200, xNorm: 0.28 },
      { baseAngle: 0.04,  swingSpeed: 0.09, width: 250, xNorm: 0.50 },
      { baseAngle: 0.20,  swingSpeed: 0.14, width: 220, xNorm: 0.72 },
    ];

    // Expanding bass light wave state
    this.waveActive = false;
    this.waveRadius = 0;
    this.waveAlpha = 0;

    // Cinematic beat event state (Section 9: wave of light traveling through water)
    this.beatEventActive = false;
    this.beatEventPhase = 1.0;
    this.beatEventStrength = 0;
    this.beatEventX = 500;

    // Cinematic state dynamics
    this.beatPulse = 0;
    this.dropBloom = 0;
    this.quietTime = 0;
    this.sustainedEnergy = 0.2;
    this.chorusMode = 0;

    this.palettePhase = 0;
    this.time = 0;

    // 60 Atmospheric Particles across 3 Z-layers and 3 size tiers (Section 6 & 7)
    // - Z-Layers: 18 behind liquid, 26 inside liquid, 16 in front of liquid
    // - Tiers: ~70% tiny dust (tier 1), ~20% medium motes (tier 2), ~10% bright orbs (tier 3)
    this.particles = Array.from({ length: 60 }, (_, idx) => {
      const zLayer = idx < 18 ? 'behind' : idx < 44 ? 'inside' : 'front';
      const tier = idx % 10 < 7 ? 1 : idx % 10 < 9 ? 2 : 3;

      const radius =
        tier === 1
          ? 0.5 + Math.random() * 0.6
          : tier === 2
          ? 1.4 + Math.random() * 0.8
          : 3.2 + Math.random() * 1.6;

      const baseAlpha =
        tier === 1
          ? 0.06 + Math.random() * 0.08
          : tier === 2
          ? 0.18 + Math.random() * 0.14
          : 0.35 + Math.random() * 0.25;

      return {
        zLayer,
        tier,
        x: Math.random() * 1000,
        y: Math.random() * 800,
        radius,
        baseAlpha,
        currentAlpha: baseAlpha,
        vx: (Math.random() - 0.5) * (tier === 1 ? 2.2 : 3.6),
        vy: -3.0 - Math.random() * (tier === 1 ? 4.5 : tier === 2 ? 7.0 : 5.5),
        phase: Math.random() * Math.PI * 2,
        fadeSpeed: 0.35 + Math.random() * 0.7,
      };
    });
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    this.canvas.width = Math.floor(width * this.dpr);
    this.canvas.height = Math.floor(height * this.dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    for (let i = 0; i < this.lights.length; i++) {
      const l = this.lights[i];
      l.x = width * l.baseXNorm;
      l.y = height * l.baseYNorm;
      l.prevX = l.x;
      l.prevY = l.y;
      l.radius = width * l.baseRadiusNorm;
    }

    const approxSurf = height * (1 - 0.34);
    const approxBot = height * 0.94;

    for (const p of this.particles) {
      p.x = Math.random() * width;
      if (p.zLayer === 'inside') {
        p.y = approxSurf + 15 + Math.random() * (approxBot - approxSurf - 30);
      } else if (Math.random() < 0.65) {
        p.y = approxSurf + (Math.random() - 0.45) * (height * 0.4);
      } else {
        p.y = Math.random() * approxSurf;
      }
    }
  }

  // Smooth color flow through combinations
  updatePalette(dt, mid, energy, bass, treble) {
    const cycleSpeed = 0.012 + energy * 0.022 + mid * 0.015;
    const len = COMBOS.length;
    this.palettePhase = ((this.palettePhase || 0) + dt * cycleSpeed) % len;
    if (this.palettePhase < 0) this.palettePhase += len;

    const fromIdx = Math.floor(this.palettePhase) % len;
    const toIdx = (fromIdx + 1) % len;
    let mix = this.palettePhase - Math.floor(this.palettePhase);

    let pFrom = COMBOS[fromIdx];
    let pTo = COMBOS[toIdx];

    if (this.chorusMode > 0.4 || this.dropBloom > 0.3) {
      const energeticMix = Math.min(1.0, this.chorusMode * 0.7 + this.dropBloom * 0.9);
      pTo = COMBOS[2];
      mix = mix * (1 - energeticMix) + energeticMix;
    }

    const satMultiplier = 0.88 + energy * 0.32 + this.chorusMode * 0.28 + this.dropBloom * 0.35;

    const keys = ['primary', 'cyan', 'violet', 'magenta', 'deep', 'ray'];
    for (let k = 0; k < keys.length; k++) {
      const key = keys[k];
      const fromC = pFrom[key];
      const toC = pTo[key];
      const targetC = this.colors[key];

      let r = fromC[0] + (toC[0] - fromC[0]) * mix;
      let g = fromC[1] + (toC[1] - fromC[1]) * mix;
      let b = fromC[2] + (toC[2] - fromC[2]) * mix;

      if (bass > 0.35 && (key === 'deep' || key === 'primary')) {
        r = Math.min(255, r * (0.85 + bass * 0.25));
        b = Math.min(255, b * (0.90 + bass * 0.32));
      }

      if (treble > 0.25 && (key === 'cyan' || key === 'magenta')) {
        r = Math.min(255, r * (1.0 + treble * 0.22));
        g = Math.min(255, g * (1.0 + treble * 0.25));
        b = Math.min(255, b * (1.0 + treble * 0.25));
      }

      r = Math.min(255, r * satMultiplier);
      g = Math.min(255, g * satMultiplier);
      b = Math.min(255, b * satMultiplier);

      targetC[0] = Math.round(r);
      targetC[1] = Math.round(g);
      targetC[2] = Math.round(b);
    }
  }

  // Draw open spline across top surface
  drawSpline(xArr, yArr, count) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(xArr[0], yArr[0]);

    for (let i = 0; i < count - 1; i++) {
      const mx = (xArr[i] + xArr[i + 1]) * 0.5;
      const my = (yArr[i] + yArr[i + 1]) * 0.5;
      ctx.quadraticCurveTo(xArr[i], yArr[i], mx, my);
    }
    ctx.lineTo(xArr[count - 1], yArr[count - 1]);
  }

  // Draw enclosed 3D physical liquid volume (top surface -> right flank -> bottom hull -> left flank)
  drawLiquidBody(xArr, topYArr, botYArr, count) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(xArr[0], topYArr[0]);

    // 1. Top surface spline
    for (let i = 0; i < count - 1; i++) {
      const mx = (xArr[i] + xArr[i + 1]) * 0.5;
      const my = (topYArr[i] + topYArr[i + 1]) * 0.5;
      ctx.quadraticCurveTo(xArr[i], topYArr[i], mx, my);
    }
    ctx.lineTo(xArr[count - 1], topYArr[count - 1]);

    // 2. Right flank smooth curvature
    const rightMidX = xArr[count - 1] + 8;
    const rightMidY = (topYArr[count - 1] + botYArr[count - 1]) * 0.5;
    ctx.quadraticCurveTo(rightMidX, rightMidY, xArr[count - 1], botYArr[count - 1]);

    // 3. Bottom hull spline running in reverse
    for (let i = count - 1; i > 0; i--) {
      const mx = (xArr[i] + xArr[i - 1]) * 0.5;
      const my = (botYArr[i] + botYArr[i - 1]) * 0.5;
      ctx.quadraticCurveTo(xArr[i], botYArr[i], mx, my);
    }
    ctx.lineTo(xArr[0], botYArr[0]);

    // 4. Left flank smooth curvature
    const leftMidX = xArr[0] - 8;
    const leftMidY = (botYArr[0] + topYArr[0]) * 0.5;
    ctx.quadraticCurveTo(leftMidX, leftMidY, xArr[0], topYArr[0]);

    ctx.closePath();
  }

  // Draw an individual particle with audio & light response
  renderParticle(p, ctx, envLightEnergy, treble, beatPulse, cPrim, cViol, cCyan, isInside) {
    ctx.save();
    ctx.globalAlpha = p.currentAlpha;

    if (isInside) {
      ctx.globalCompositeOperation = 'screen';
    }

    if (p.tier === 1) {
      // Tiny atmospheric dust (soft, subtle motes)
      ctx.fillStyle = `rgb(${cCyan[0]}, ${cCyan[1]}, ${cCyan[2]})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.tier === 2) {
      // Medium soft-glow motes with light halo
      ctx.fillStyle = `rgb(${cPrim[0]}, ${cPrim[1]}, ${cPrim[2]})`;
      ctx.shadowColor = `rgba(${cCyan[0]}, ${cCyan[1]}, ${cCyan[2]}, ${0.55 + envLightEnergy * 0.4})`;
      ctx.shadowBlur = 6 + treble * 8 + beatPulse * 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * (1.0 + treble * 0.35), 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Brighter special orbs with diffused radial glow
      const orbGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2.4);
      orbGrad.addColorStop(0, `rgba(${cPrim[0]}, ${cPrim[1]}, ${cPrim[2]}, ${0.7 + envLightEnergy * 0.25})`);
      orbGrad.addColorStop(0.48, `rgba(${cViol[0]}, ${cViol[1]}, ${cViol[2]}, 0.3)`);
      orbGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  render(liquidEngine, audioMetrics, dt = 0.016) {
    this.time += dt;
    const t = this.time;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const pts = liquidEngine.numPoints;
    const x = liquidEngine.x;
    const y = liquidEngine.y;
    const backY = liquidEngine.backY;
    const internalY = liquidEngine.internalY;
    const bottomY = liquidEngine.bottomY;
    const backBottomY = liquidEngine.backBottomY;

    // Audio metrics (0.0 to 1.0)
    const volume = audioMetrics.volume ?? 0.2;
    const bass = audioMetrics.bass ?? 0.2;
    const mid = audioMetrics.mid ?? 0.2;
    const treble = audioMetrics.treble ?? 0.15;
    const energy = audioMetrics.energy ?? 0.2;
    const transient = audioMetrics.transient ?? 0.0;

    // 1. CHORUS MODE TRACKING
    this.sustainedEnergy = this.sustainedEnergy * 0.985 + energy * 0.015;
    this.chorusMode = Math.max(0, Math.min(1, (this.sustainedEnergy - 0.38) / 0.35));

    // 2. BEAT PULSE DYNAMICS
    if (transient > 0.20) {
      this.beatPulse = Math.max(this.beatPulse, transient);
    }
    this.beatPulse *= Math.pow(0.88, dt * 60);

    // 3. BEAT LIGHT EVENT STATE MACHINE (Section 9: wave of light traveling through water)
    if (transient > 0.22 && this.beatEventPhase >= 1.0) {
      this.beatEventActive = true;
      this.beatEventStrength = Math.min(1.0, transient * 1.5 + bass * 0.4);
      this.beatEventPhase = 0.0;
      this.beatEventX = x[Math.floor(pts * (0.32 + Math.random() * 0.36))];
    }

    if (this.beatEventActive) {
      const eventDuration = 0.65 + bass * 0.35; // 0.65s to 1.0s
      this.beatEventPhase += dt / eventDuration;
      if (this.beatEventPhase >= 1.0) {
        this.beatEventActive = false;
        this.beatEventPhase = 1.0;
      }
    }

    // 4. BASS DROP MOMENT
    if (energy < 0.28 && bass < 0.32) {
      this.quietTime += dt;
    } else if (transient > 0.24 && bass > 0.58 && this.quietTime > 1.0) {
      this.dropBloom = 1.0;
      this.quietTime = 0;
    }
    this.dropBloom *= Math.pow(0.92, dt * 60);

    // 5. NATURAL LIGHT BREATHING
    const breath1 = Math.sin(t * 0.45) * 0.07;
    const breath2 = Math.cos(t * 0.28) * 0.05;
    const breathAmp = 1.0 + volume * 1.4 + energy * 1.0;
    const breathing = 1.0 + (breath1 + breath2) * breathAmp;

    // Integrated Environmental Light Energy
    const bassEnergy = bass * bass;
    const beatBloom = this.beatPulse * this.beatPulse;
    const envLightEnergy =
      volume * 0.28 +
      bassEnergy * 0.52 +
      beatBloom * 0.55 +
      energy * 0.2 +
      this.chorusMode * 0.3 +
      this.dropBloom * 0.5;

    // Update active color palette
    this.updatePalette(dt, mid, energy, bass, treble);

    const cPrim = this.colors.primary;
    const cCyan = this.colors.cyan;
    const cViol = this.colors.violet;
    const cMage = this.colors.magenta;
    const cDeep = this.colors.deep;
    const cRay = this.colors.ray;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // ZONE 1: FAR BACKGROUND (Very dark velvet navy/black space)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#020206');
    bgGrad.addColorStop(0.5, '#04040d');
    bgGrad.addColorStop(1, '#010104');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const midY = y[Math.floor(pts * 0.5)] || h * 0.64;
    const midBottomY = bottomY[Math.floor(pts * 0.5)] || h * 0.94;
    const bodyCenterY = (midY + midBottomY) * 0.5;
    const bodyDepth = midBottomY - midY;

    // ZONE 2: ATMOSPHERE (Large soft dancing light fields behind the liquid)
    const motionSpeed = 1.0 + energy * 1.8 + mid * 1.1 + this.chorusMode * 0.8;
    const lightSpread = 1.0 + envLightEnergy * 0.75 + this.dropBloom * 0.5;

    // Update dancing lights positions
    const lBlue = this.lights[0];
    lBlue.prevX += (lBlue.x - lBlue.prevX) * (dt * 2.8);
    lBlue.prevY += (lBlue.y - lBlue.prevY) * (dt * 2.8);
    lBlue.x = w * (0.50 + Math.sin(t * 0.22 * motionSpeed) * 0.08);
    lBlue.y = bodyCenterY + bass * 20 + Math.cos(t * 0.25 * motionSpeed) * 15;
    lBlue.radius = w * lBlue.baseRadiusNorm * lightSpread;
    lBlue.intensity = (0.16 + bass * 0.44 + this.dropBloom * 0.42) * breathing;

    const lCyan = this.lights[1];
    lCyan.prevX += (lCyan.x - lCyan.prevX) * (dt * 2.8);
    lCyan.prevY += (lCyan.y - lCyan.prevY) * (dt * 2.8);
    const cyanShift = energy * 0.12 + this.chorusMode * 0.08;
    lCyan.x = w * (0.34 - cyanShift + Math.sin(t * 0.38 * motionSpeed) * 0.14);
    lCyan.y = midY - 20 + Math.cos(t * 0.32 * motionSpeed) * 20;
    lCyan.radius = w * lCyan.baseRadiusNorm * lightSpread;
    lCyan.intensity = (0.18 + mid * 0.36 + treble * 0.28 + this.beatPulse * 0.32) * breathing;

    const lViol = this.lights[2];
    lViol.prevX += (lViol.x - lViol.prevX) * (dt * 2.8);
    lViol.prevY += (lViol.y - lViol.prevY) * (dt * 2.8);
    const violRise = energy * 0.14 + this.chorusMode * 0.12;
    lViol.x = w * (0.70 + Math.cos(t * 0.35 * motionSpeed) * 0.12);
    lViol.y = h * (0.42 - violRise + Math.sin(t * 0.3 * motionSpeed) * 0.08);
    lViol.radius = w * lViol.baseRadiusNorm * lightSpread;
    lViol.intensity = (0.17 + mid * 0.32 + this.chorusMode * 0.36 + this.beatPulse * 0.26) * breathing;

    const lMage = this.lights[3];
    lMage.prevX += (lMage.x - lMage.prevX) * (dt * 2.8);
    lMage.prevY += (lMage.y - lMage.prevY) * (dt * 2.8);
    lMage.x = w * (0.52 + Math.sin(t * 0.26 * motionSpeed) * 0.16);
    lMage.y = h * (0.38 - this.chorusMode * 0.1 + Math.cos(t * 0.34 * motionSpeed) * 0.08);
    lMage.radius = w * lMage.baseRadiusNorm * (1.0 + envLightEnergy * 0.85);
    lMage.intensity = (0.12 + energy * 0.38 + this.dropBloom * 0.55 + this.beatPulse * 0.25) * breathing;

    // Render soft lingering atmospheric trails
    for (let i = 0; i < this.lights.length; i++) {
      const l = this.lights[i];
      const col = this.colors[l.colorKey];
      const trailAlpha = l.intensity * 0.20;
      if (trailAlpha > 0.02) {
        ctx.save();
        ctx.translate(l.prevX, l.prevY);
        ctx.scale(1.2, 0.75);
        const trailGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, l.radius * 0.7);
        trailGrad.addColorStop(0, `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${trailAlpha})`);
        trailGrad.addColorStop(0.5, `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${trailAlpha * 0.25})`);
        trailGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = trailGrad;
        ctx.fillRect(-l.radius, -l.radius, l.radius * 2, l.radius * 2);
        ctx.restore();
      }
    }

    // Render large atmospheric light fields (volumetric & soft)
    for (let i = 0; i < this.lights.length; i++) {
      const l = this.lights[i];
      const col = this.colors[l.colorKey];
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.scale(i === 0 ? 1.3 : i === 1 ? 1.25 : i === 2 ? 1.15 : 1.35, 0.75);
      const rad = l.radius;
      const grad = ctx.createRadialGradient(0, 0, 8, 0, 0, rad);
      grad.addColorStop(0, `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${l.intensity})`);
      grad.addColorStop(0.28, `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${l.intensity * 0.58})`);
      grad.addColorStop(0.60, `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${l.intensity * 0.22})`);
      grad.addColorStop(0.85, `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${l.intensity * 0.05})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(-rad, -rad, rad * 2, rad * 2);
      ctx.restore();
    }

    // Volumetric concert light rays
    const rayVisibility = 0.02 + energy * 0.05 + this.chorusMode * 0.06 + this.dropBloom * 0.08;
    if (rayVisibility > 0.025) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < this.rays.length; i++) {
        const r = this.rays[i];
        const rayAngle = r.baseAngle + Math.sin(t * r.swingSpeed + i) * 0.1;
        const rx = w * r.xNorm;

        ctx.save();
        ctx.translate(rx, -40);
        ctx.rotate(rayAngle);

        const rayGrad = ctx.createLinearGradient(0, 0, 0, h * 0.95);
        rayGrad.addColorStop(0, `rgba(${cRay[0]}, ${cRay[1]}, ${cRay[2]}, ${rayVisibility * 0.8})`);
        rayGrad.addColorStop(0.35, `rgba(${cRay[0]}, ${cRay[1]}, ${cRay[2]}, ${rayVisibility * 0.45})`);
        rayGrad.addColorStop(0.75, `rgba(${cRay[0]}, ${cRay[1]}, ${cRay[2]}, ${rayVisibility * 0.12})`);
        rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.moveTo(-r.width * 0.25, 0);
        ctx.lineTo(r.width * 0.25, 0);
        ctx.lineTo(r.width * 1.1, h * 0.95);
        ctx.lineTo(-r.width * 1.1, h * 0.95);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    // Update particle physics and properties
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const normX = Math.max(0, Math.min(1, p.x / w));
      const surfY = liquidEngine.getSurfaceY(normX);
      const botY = liquidEngine.getBottomY(normX);

      p.phase += dt * (p.fadeSpeed + treble * 0.55);
      const turbulence = Math.sin(p.phase) * (p.tier === 1 ? 2.0 : 1.5);
      p.x += (p.vx + turbulence) * dt;

      if (p.zLayer === 'inside') {
        // Inside particles: constrained within the physical liquid body
        p.y += (p.vy * 0.4) * dt;
        if (p.y < surfY + 10) p.y = surfY + 12;
        if (p.y > botY - 10) p.y = botY - 12;
        if (p.x < liquidEngine.margin + 10) p.x = liquidEngine.margin + 12;
        if (p.x > w - liquidEngine.margin - 10) p.x = w - liquidEngine.margin - 12;
      } else {
        // External particles (behind & front)
        if (transient > 0.20) {
          p.vx += (normX > 0.5 ? 1 : -1) * (transient * 2.5) * dt;
          p.y -= (transient * 20.0 + bass * 8.0) * dt; // Buoyant upward lift on beats
        }
        const speedMult = 1.0 + energy * 0.65 + this.chorusMode * 0.4;
        p.y += (p.vy - bass * 10.0) * dt * speedMult;

        // Screen wrapping for external particles
        if (p.x < -10) p.x += w + 20;
        if (p.x > w + 10) p.x -= w + 20;
        if (p.y < 20 || p.y > h + 15) {
          p.x = Math.random() * w;
          p.y = Math.random() < 0.65 ? surfY + (Math.random() - 0.45) * 160 : Math.random() * surfY;
          p.phase = Math.random() * Math.PI * 2;
        }
      }

      // Proximity to dancing lights (particles illuminate inside light fields)
      let lightProximity = 0;
      for (let j = 0; j < this.lights.length; j++) {
        const l = this.lights[j];
        const dist = Math.hypot(p.x - l.x, p.y - l.y);
        if (dist < l.radius) {
          lightProximity += (1 - dist / l.radius) * l.intensity;
        }
      }

      const alphaBreath = 0.5 + Math.sin(p.phase) * 0.5;
      const audioAlphaBoost = envLightEnergy * 0.48 + treble * 0.32 + this.beatPulse * 0.35;
      p.currentAlpha = Math.min(
        0.95,
        p.baseAlpha * alphaBreath * (0.65 + audioAlphaBoost + lightProximity * 2.2)
      );
    }

    // 6. DRAW Z-LAYER: PARTICLES BEHIND LIQUID (Section 6)
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.zLayer === 'behind') {
        this.renderParticle(p, ctx, envLightEnergy, treble, this.beatPulse, cPrim, cViol, cCyan, false);
      }
    }

    // 7. LIQUID AS MAIN LIGHT SOURCE: SOFT ATMOSPHERIC VOLUMETRIC HALO (Section 5)
    // Upward volumetric scattering into the dark room
    const bloomHeight = 220 + envLightEnergy * 460;
    const bloomGrad = ctx.createRadialGradient(
      w * 0.5,
      bodyCenterY,
      20,
      w * 0.5,
      midY - bloomHeight * 0.45,
      w * (0.62 + envLightEnergy * 0.35)
    );
    const bloomAlpha = 0.15 + envLightEnergy * 0.46;
    bloomGrad.addColorStop(0, `rgba(${cPrim[0]}, ${cPrim[1]}, ${cPrim[2]}, ${bloomAlpha})`);
    bloomGrad.addColorStop(0.32, `rgba(${cCyan[0]}, ${cCyan[1]}, ${cCyan[2]}, ${bloomAlpha * 0.52})`);
    bloomGrad.addColorStop(0.68, `rgba(${cDeep[0]}, ${cDeep[1]}, ${cDeep[2]}, ${bloomAlpha * 0.16})`);
    bloomGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bloomGrad;
    ctx.fillRect(0, 0, w, h);

    // Lateral ambient glow wrapping the flanks
    const flankGrad = ctx.createRadialGradient(w * 0.5, bodyCenterY, w * 0.3, w * 0.5, bodyCenterY, w * 0.58);
    flankGrad.addColorStop(0, `rgba(${cCyan[0]}, ${cCyan[1]}, ${cCyan[2]}, ${0.08 + envLightEnergy * 0.18})`);
    flankGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = flankGrad;
    ctx.fillRect(0, 0, w, h);

    // 8. LIQUID DEPTH LAYER 1: DEEP LIQUID (Section 2)
    // Rendered with back surface and back bottom hull
    this.drawLiquidBody(x, backY, backBottomY, pts);
    const deepGrad = ctx.createLinearGradient(0, midY - 40, 0, midBottomY + 20);
    deepGrad.addColorStop(0, `rgba(${cDeep[0]}, ${cDeep[1]}, ${cDeep[2]}, ${0.34 + envLightEnergy * 0.32})`);
    deepGrad.addColorStop(0.45, `rgba(${cViol[0]}, ${cViol[1]}, ${cViol[2]}, ${0.24 + envLightEnergy * 0.26})`);
    deepGrad.addColorStop(0.85, `rgba(${cDeep[0]}, ${cDeep[1]}, ${cDeep[2]}, 0.55)`);
    deepGrad.addColorStop(1, 'rgba(1, 1, 4, 0.95)');
    ctx.fillStyle = deepGrad;
    ctx.fill();

    // 9. LIQUID DEPTH LAYER 2: MAIN LIQUID BODY (Section 1 & 2: Thick 3D Body)
    this.drawLiquidBody(x, y, bottomY, pts);
    const mainGrad = ctx.createLinearGradient(
      w * 0.32 + Math.sin(t * 0.16) * 55,
      midY - 30,
      w * 0.68,
      midBottomY + 15
    );

    const baseAlpha1 = 0.34 + envLightEnergy * 0.52;
    const baseAlpha2 = 0.26 + envLightEnergy * 0.44;
    const baseAlpha3 = 0.19 + envLightEnergy * 0.34;

    mainGrad.addColorStop(0, `rgba(${cPrim[0]}, ${cPrim[1]}, ${cPrim[2]}, ${baseAlpha1})`);
    mainGrad.addColorStop(0.28, `rgba(${cCyan[0]}, ${cCyan[1]}, ${cCyan[2]}, ${baseAlpha2})`);
    mainGrad.addColorStop(0.65, `rgba(${cMage[0]}, ${cMage[1]}, ${cMage[2]}, ${baseAlpha3})`);
    mainGrad.addColorStop(0.90, `rgba(${cDeep[0]}, ${cDeep[1]}, ${cDeep[2]}, 0.75)`);
    mainGrad.addColorStop(1, 'rgba(1, 1, 4, 0.92)');
    ctx.fillStyle = mainGrad;
    ctx.fill();

    // 10. LIQUID DEPTH LAYER 3: INTERNAL ILLUMINATION & INSIDE PARTICLES (Section 3 & 4)
    // Clipped strictly inside the main 3D liquid body
    ctx.save();
    this.drawLiquidBody(x, y, bottomY, pts);
    ctx.clip();

    // A. 4 Soft Internal Light Pools (Drift, stretch, blend, and travel through depths - Section 14)
    const internalIntensity = (0.22 + bass * 0.45 + volume * 0.35 + this.dropBloom * 0.4) * breathing;

    // Pool 1: Deep Blue / Sapphire (lower-mid depth)
    const p1Y = midY + bodyDepth * (0.55 + Math.sin(t * 0.1) * 0.1);
    const p1X = w * (0.48 + Math.sin(t * 0.2 * motionSpeed) * 0.12);
    ctx.save();
    ctx.translate(p1X, p1Y);
    ctx.scale(1.8, 0.65);
    const g1 = ctx.createRadialGradient(0, 0, 4, 0, 0, w * 0.36);
    g1.addColorStop(0, `rgba(${cPrim[0]}, ${cPrim[1]}, ${cPrim[2]}, ${internalIntensity * 0.85})`);
    g1.addColorStop(0.5, `rgba(${cDeep[0]}, ${cDeep[1]}, ${cDeep[2]}, ${internalIntensity * 0.35})`);
    g1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g1;
    ctx.fillRect(-w * 0.4, -w * 0.4, w * 0.8, w * 0.8);
    ctx.restore();

    // Pool 2: Luminous Cyan (upper-mid depth, shifts with treble)
    const p2Y = midY + bodyDepth * (0.35 + Math.cos(t * 0.08) * 0.12);
    const p2X = w * (0.32 + Math.cos(t * 0.26 * motionSpeed) * 0.16);
    ctx.save();
    ctx.translate(p2X, p2Y);
    ctx.scale(1.6, 0.7);
    const g2 = ctx.createRadialGradient(0, 0, 4, 0, 0, w * 0.32);
    g2.addColorStop(0, `rgba(${cCyan[0]}, ${cCyan[1]}, ${cCyan[2]}, ${internalIntensity * 0.95})`);
    g2.addColorStop(0.5, `rgba(${cPrim[0]}, ${cPrim[1]}, ${cPrim[2]}, ${internalIntensity * 0.38})`);
    g2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g2;
    ctx.fillRect(-w * 0.35, -w * 0.35, w * 0.7, w * 0.7);
    ctx.restore();

    // Pool 3: Royal Violet (mid-depth, rises with chorus)
    const p3Y = midY + bodyDepth * (0.45 + Math.sin(t * 0.09) * 0.12);
    const p3X = w * (0.68 + Math.sin(t * 0.24 * motionSpeed) * 0.15);
    ctx.save();
    ctx.translate(p3X, p3Y);
    ctx.scale(1.5, 0.75);
    const g3 = ctx.createRadialGradient(0, 0, 4, 0, 0, w * 0.34);
    g3.addColorStop(0, `rgba(${cViol[0]}, ${cViol[1]}, ${cViol[2]}, ${internalIntensity * 0.9})`);
    g3.addColorStop(0.5, `rgba(${cMage[0]}, ${cMage[1]}, ${cMage[2]}, ${internalIntensity * 0.35})`);
    g3.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g3;
    ctx.fillRect(-w * 0.35, -w * 0.35, w * 0.7, w * 0.7);
    ctx.restore();

    // Pool 4: Warm Magenta / Orchid (pulses on drop & beats)
    const p4Y = midY + bodyDepth * (0.58 + Math.cos(t * 0.11) * 0.1);
    const p4X = w * (0.52 + Math.cos(t * 0.22 * motionSpeed) * 0.14);
    ctx.save();
    ctx.translate(p4X, p4Y);
    ctx.scale(1.6, 0.7);
    const g4 = ctx.createRadialGradient(0, 0, 4, 0, 0, w * 0.3);
    g4.addColorStop(0, `rgba(${cMage[0]}, ${cMage[1]}, ${cMage[2]}, ${internalIntensity * 0.85})`);
    g4.addColorStop(0.52, `rgba(${cViol[0]}, ${cViol[1]}, ${cViol[2]}, ${internalIntensity * 0.3})`);
    g4.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g4;
    ctx.fillRect(-w * 0.32, -w * 0.32, w * 0.64, w * 0.64);
    ctx.restore();

    // B. Physical Reflection of Background Dancing Lights into the Fluid (Section 13)
    for (let i = 0; i < this.lights.length; i++) {
      const l = this.lights[i];
      const col = this.colors[l.colorKey];
      const normLx = Math.max(0, Math.min(1, l.x / w));
      const surfY = liquidEngine.getSurfaceY(normLx);

      ctx.save();
      ctx.translate(l.x, surfY + bodyDepth * 0.25);
      ctx.scale(1.6, 0.72);
      const refRad = l.radius * 0.38;
      const refGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, refRad);
      const refIntensity = l.intensity * (0.22 + envLightEnergy * 0.38 + this.dropBloom * 0.3);
      refGrad.addColorStop(0, `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${refIntensity})`);
      refGrad.addColorStop(0.5, `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${refIntensity * 0.32})`);
      refGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = refGrad;
      ctx.fillRect(-refRad, -refRad, refRad * 2, refRad * 2);
      ctx.restore();
    }

    // C. Beat Light Event Wave through Water (Section 9)
    if (this.beatEventActive && this.beatEventPhase < 1.0) {
      const p = this.beatEventPhase;
      const eventRadius = p * w * 0.85;
      const eventAlpha = Math.sin(p * Math.PI) * this.beatEventStrength * 0.45;
      const waveGrad = ctx.createRadialGradient(
        this.beatEventX, bodyCenterY, Math.max(0, eventRadius - 80),
        this.beatEventX, bodyCenterY, eventRadius
      );
      waveGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      waveGrad.addColorStop(0.5, `rgba(${cCyan[0]}, ${cCyan[1]}, ${cCyan[2]}, ${eventAlpha})`);
      waveGrad.addColorStop(0.8, `rgba(${cViol[0]}, ${cViol[1]}, ${cViol[2]}, ${eventAlpha * 0.4})`);
      waveGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = waveGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // D. Moving Caustic Light Ribbon
    ctx.globalCompositeOperation = 'screen';
    ctx.beginPath();
    ctx.moveTo(x[0], internalY[0]);
    for (let i = 0; i < pts - 1; i++) {
      const mx = (x[i] + x[i + 1]) * 0.5;
      const my = (internalY[i] + internalY[i + 1]) * 0.5;
      ctx.quadraticCurveTo(x[i], internalY[i], mx, my);
    }
    ctx.lineTo(x[pts - 1], internalY[pts - 1]);
    ctx.strokeStyle = `rgba(${cCyan[0]}, ${cCyan[1]}, ${cCyan[2]}, ${0.14 + envLightEnergy * 0.38})`;
    ctx.lineWidth = 14 + bass * 16 + this.beatPulse * 12;
    ctx.stroke();

    // E. DRAW Z-LAYER: PARTICLES INSIDE THE LIQUID (Section 6 & 8)
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.zLayer === 'inside') {
        this.renderParticle(p, ctx, envLightEnergy, treble, this.beatPulse, cPrim, cViol, cCyan, true);
      }
    }

    ctx.restore(); // End clipping inside fluid body

    // 11. LIQUID DEPTH LAYER 4: SOFT SURFACE MENISCUS & HIGHLIGHTS (Section 12: Softer Surface)
    // No harsh neon line; soft water gleam and subtle reflections
    this.drawSpline(x, y, pts);
    // Soft illuminated water meniscus
    ctx.strokeStyle = `rgba(${cCyan[0]}, ${cCyan[1]}, ${cCyan[2]}, ${0.18 + envLightEnergy * 0.28})`;
    ctx.lineWidth = 3.6 + envLightEnergy * 1.2;
    ctx.stroke();

    // Delicate fine specular water highlight
    const highlightAlpha = Math.min(0.68, 0.18 + treble * 0.32 + this.beatPulse * 0.25);
    ctx.strokeStyle = `rgba(255, 255, 255, ${highlightAlpha})`;
    ctx.lineWidth = 1.2;
    ctx.shadowColor = `rgba(${cCyan[0]}, ${cCyan[1]}, ${cCyan[2]}, 0.45)`;
    ctx.shadowBlur = 8 + treble * 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Subtle bottom hull soft shadow/cushion
    this.drawSpline(x, bottomY, pts);
    ctx.strokeStyle = `rgba(2, 2, 8, 0.45)`;
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // 12. DRAW Z-LAYER: PARTICLES IN FRONT OF LIQUID (Section 6)
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.zLayer === 'front') {
        this.renderParticle(p, ctx, envLightEnergy, treble, this.beatPulse, cPrim, cViol, cCyan, false);
      }
    }

    // 13. BASS LIGHT IMPULSE (Expanding wave through atmospheric mist)
    if (transient > 0.24 || (bass > 0.68 && !this.waveActive)) {
      this.waveActive = true;
      this.waveRadius = 25;
      this.waveAlpha = 0.36 + bass * 0.32 + this.dropBloom * 0.3;
    }

    if (this.waveActive) {
      this.waveRadius += dt * (290 + bass * 270);
      this.waveAlpha *= Math.pow(0.91, dt * 60);
      if (this.waveAlpha < 0.012 || this.waveRadius > w * 1.4) {
        this.waveActive = false;
      } else {
        const rOuter = this.waveRadius;
        const rInner = Math.max(0, this.waveRadius - 130);
        const waveGrad = ctx.createRadialGradient(w * 0.5, bodyCenterY, rInner, w * 0.5, bodyCenterY, rOuter);
        waveGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        waveGrad.addColorStop(0.3, `rgba(${cPrim[0]}, ${cPrim[1]}, ${cPrim[2]}, ${this.waveAlpha * 0.22})`);
        waveGrad.addColorStop(0.6, `rgba(${cCyan[0]}, ${cCyan[1]}, ${cCyan[2]}, ${this.waveAlpha * 0.52})`);
        waveGrad.addColorStop(0.85, `rgba(${cViol[0]}, ${cViol[1]}, ${cViol[2]}, ${this.waveAlpha * 0.20})`);
        waveGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = waveGrad;
        ctx.fillRect(0, 0, w, h);
      }
    }

    // 14. SUBTLE EDGE PERIMETER LIGHTING
    const edgeAlpha = Math.min(
      0.22,
      0.02 + bassEnergy * 0.12 + this.chorusMode * 0.12 + this.dropBloom * 0.16
    );
    if (edgeAlpha > 0.025) {
      const topGrad = ctx.createLinearGradient(0, 0, 0, 75);
      topGrad.addColorStop(0, `rgba(${cViol[0]}, ${cViol[1]}, ${cViol[2]}, ${edgeAlpha * 0.65})`);
      topGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, w, 75);

      const leftGrad = ctx.createLinearGradient(0, 0, 85, 0);
      leftGrad.addColorStop(0, `rgba(${cCyan[0]}, ${cCyan[1]}, ${cCyan[2]}, ${edgeAlpha * 0.55})`);
      leftGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = leftGrad;
      ctx.fillRect(0, 0, 85, h);

      const rightGrad = ctx.createLinearGradient(w, 0, w - 85, 0);
      rightGrad.addColorStop(0, `rgba(${cMage[0]}, ${cMage[1]}, ${cMage[2]}, ${edgeAlpha * 0.55})`);
      rightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = rightGrad;
      ctx.fillRect(w - 85, 0, 85, h);
    }

    // 15. SUBTLE DARK VIGNETTE
    const vigGrad = ctx.createRadialGradient(
      w * 0.5,
      h * 0.5,
      w * 0.38,
      w * 0.5,
      h * 0.5,
      w * 0.88
    );
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vigGrad.addColorStop(0.65, 'rgba(2, 2, 5, 0.22)');
    vigGrad.addColorStop(1, 'rgba(1, 1, 3, 0.65)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  }
}
