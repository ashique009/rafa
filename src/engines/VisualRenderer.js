/**
 * VisualRenderer
 * Full-screen premium audio visualizer:
 * Layer Order:
 * 1. Deep Dark Background (Black + Deep Navy)
 * 2. Atmospheric Lighting (soft ambient glows + 4–6 soft vertical light columns + bass glow)
 * 3. Digital Rain (clean glowing vertical streaks falling across background, colors matching spectrum)
 * 4. Particles (35–50 particles, dual drift: down with rain & slow float up)
 * 5. Bass Impact Rings (subtle radial ripples behind spectrum on heavy bass)
 * 6. Hero Audio Spectrum (upward light trails on tall bars, downward reflection, crisp rounded bars, glowing baseline)
 * 
 * 60 FPS hardware-accelerated Canvas 2D engine.
 */

// Continuous 8-stop color progression across the spectrum:
// Green -> Cyan -> Blue -> Violet -> Magenta -> Pink -> Yellow
const SPECTRUM_STOPS = [
  { pos: 0.00, r: 0,   g: 230, b: 118 }, // Emerald Green
  { pos: 0.16, r: 0,   g: 245, b: 212 }, // Mint / Cyan-Green
  { pos: 0.32, r: 0,   g: 190, b: 255 }, // Electric Cyan-Blue
  { pos: 0.48, r: 45,  g: 115, b: 255 }, // Sapphire Blue
  { pos: 0.64, r: 147, g: 75,  b: 255 }, // Luminous Violet
  { pos: 0.78, r: 225, g: 50,  b: 220 }, // Magenta
  { pos: 0.90, r: 255, g: 45,  b: 135 }, // Hot Pink
  { pos: 1.00, r: 255, g: 215, b: 50  }, // Amber / Luminous Yellow
];

function getSpectrumRGB(u) {
  const norm = Math.max(0, Math.min(1, u));
  for (let i = 0; i < SPECTRUM_STOPS.length - 1; i++) {
    const s0 = SPECTRUM_STOPS[i];
    const s1 = SPECTRUM_STOPS[i + 1];
    if (norm >= s0.pos && norm <= s1.pos) {
      const f = (norm - s0.pos) / (s1.pos - s0.pos);
      return {
        r: Math.round(s0.r + (s1.r - s0.r) * f),
        g: Math.round(s0.g + (s1.g - s0.g) * f),
        b: Math.round(s0.b + (s1.b - s0.b) * f),
      };
    }
  }
  const last = SPECTRUM_STOPS[SPECTRUM_STOPS.length - 1];
  return { r: last.r, g: last.g, b: last.b };
}

export class VisualRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.width = 1000;
    this.height = 800;
    this.dpr = 1;
    this.time = 0;

    // Spectrum configuration
    this.isMobile = false;
    this.numBars = 112; // Desktop: 112 bars (within 80–140 range)
    this.barHeights = new Float32Array(140);
    this.barVelocities = new Float32Array(140);

    // Digital Rain Streaks (Desktop: ~75, Mobile: ~45)
    this.maxRain = 80;
    this.rainX = new Float32Array(this.maxRain);
    this.rainY = new Float32Array(this.maxRain);
    this.rainSpeed = new Float32Array(this.maxRain);
    this.rainBaseLen = new Float32Array(this.maxRain);
    this.rainBaseAlpha = new Float32Array(this.maxRain);
    this.rainWidth = new Float32Array(this.maxRain);
    this.isBrightStreak = new Uint8Array(this.maxRain);

    // Bass Impact Ripples (max 2 active)
    this.ripples = [
      { active: false, x: 0, y: 0, radius: 0, maxRadius: 260, alpha: 0 },
      { active: false, x: 0, y: 0, radius: 0, maxRadius: 260, alpha: 0 },
    ];
    this.lastRippleTime = 0;

    this.initRain();
  }

  initRain() {
    for (let i = 0; i < this.maxRain; i++) {
      this.resetStreak(i, true);
    }
  }

  resetStreak(i, randomizeY = false) {
    this.rainX[i] = Math.random() * (this.width || 1000);
    this.rainY[i] = randomizeY
      ? Math.random() * (this.height || 800)
      : -30 - Math.random() * 80;

    this.rainSpeed[i] = 70 + Math.random() * 180; // px/sec
    this.rainBaseLen[i] = 22 + Math.random() * 42; // px
    this.rainWidth[i] = 1.2 + Math.random() * 0.5;

    // Most streaks are subtle (0.08 - 0.20), ~15% are crisp brighter streaks (0.35 - 0.55)
    const isBright = Math.random() < 0.15;
    this.isBrightStreak[i] = isBright ? 1 : 0;
    this.rainBaseAlpha[i] = isBright
      ? 0.35 + Math.random() * 0.20
      : 0.08 + Math.random() * 0.12;
  }

  resize(width, height) {
    const oldW = this.width || width;
    this.width = width;
    this.height = height;
    this.isMobile = width < 860;
    this.numBars = this.isMobile ? 64 : 112; // Mobile: 64 bars, Desktop: 112 bars
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.floor(width * this.dpr);
    this.canvas.height = Math.floor(height * this.dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    if (this.ctx) {
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    // Scale rain positions
    for (let i = 0; i < this.maxRain; i++) {
      this.rainX[i] = (this.rainX[i] / oldW) * width;
    }
  }

  render(ambientField, audioMetrics = {}, dt = 0.016, audioEngine = null) {
    this.time += dt;
    const ctx = this.ctx;
    if (!ctx) return;

    const w = this.width;
    const h = this.height;
    const isMobile = this.isMobile;
    const numBars = this.numBars;

    const bass = audioMetrics.bass ?? 0.0;
    const mid = audioMetrics.mid ?? 0.0;
    const treble = audioMetrics.treble ?? 0.0;
    const transient = audioMetrics.transient ?? 0.0;

    // ==============================================================
    // LAYER 1: BASE BACKGROUND (BLACK + DEEP NAVY)
    // ==============================================================
    ctx.fillStyle = '#010206';
    ctx.fillRect(0, 0, w, h);

    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#010207');
    bgGrad.addColorStop(0.5, '#02040d');
    bgGrad.addColorStop(1, '#000104');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // ==============================================================
    // LAYER 2: ATMOSPHERIC LIGHTING & 4–6 VERTICAL LIGHT COLUMNS
    // Soft colored lights behind the rain (deep cyan, electric blue, violet, magenta)
    // ==============================================================
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const bgGlowY = h * (isMobile ? 0.72 : 0.68);
    const bgRadius = Math.min(w * 0.35, h * 0.45);

    // Soft Ambient Radial Light Fields
    // Green (left)
    {
      const gX = w * 0.10;
      const gGrad = ctx.createRadialGradient(gX, bgGlowY, 0, gX, bgGlowY, bgRadius * 0.9);
      gGrad.addColorStop(0, `rgba(0, 230, 118, ${0.040 + bass * 0.030})`);
      gGrad.addColorStop(1, 'rgba(0, 230, 118, 0)');
      ctx.fillStyle = gGrad;
      ctx.beginPath();
      ctx.arc(gX, bgGlowY, bgRadius * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cyan (center-left)
    {
      const cX = w * 0.30;
      const cGrad = ctx.createRadialGradient(cX, bgGlowY, 0, cX, bgGlowY, bgRadius);
      cGrad.addColorStop(0, `rgba(0, 220, 255, ${0.050 + bass * 0.040})`);
      cGrad.addColorStop(1, 'rgba(0, 220, 255, 0)');
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.arc(cX, bgGlowY, bgRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Electric Blue (center)
    {
      const bX = w * 0.50;
      const bGrad = ctx.createRadialGradient(bX, bgGlowY, 0, bX, bgGlowY, bgRadius * 1.1);
      bGrad.addColorStop(0, `rgba(40, 120, 255, ${0.048 + mid * 0.035})`);
      bGrad.addColorStop(1, 'rgba(40, 120, 255, 0)');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.arc(bX, bgGlowY, bgRadius * 1.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Violet (center-right)
    {
      const vX = w * 0.72;
      const vGrad = ctx.createRadialGradient(vX, bgGlowY, 0, vX, bgGlowY, bgRadius);
      vGrad.addColorStop(0, `rgba(150, 70, 255, ${0.042 + mid * 0.030})`);
      vGrad.addColorStop(1, 'rgba(150, 70, 255, 0)');
      ctx.fillStyle = vGrad;
      ctx.beginPath();
      ctx.arc(vX, bgGlowY, bgRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Magenta (right)
    {
      const mX = w * 0.90;
      const mGrad = ctx.createRadialGradient(mX, bgGlowY, 0, mX, bgGlowY, bgRadius * 0.9);
      mGrad.addColorStop(0, `rgba(230, 50, 180, ${0.038 + bass * 0.028})`);
      mGrad.addColorStop(1, 'rgba(230, 50, 180, 0)');
      ctx.fillStyle = mGrad;
      ctx.beginPath();
      ctx.arc(mX, bgGlowY, bgRadius * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4–6 Soft Vertical Atmospheric Light Columns extending from top toward spectrum
    const colPositions = [0.18, 0.34, 0.50, 0.68, 0.84];
    for (let c = 0; c < colPositions.length; c++) {
      const colX = w * colPositions[c];
      const colU = colPositions[c];
      const rgb = getSpectrumRGB(colU);
      const colW = isMobile ? 22 : 36;
      const colAlpha = (0.020 + (c % 2 === 0 ? bass : mid) * 0.022);

      const colGrad = ctx.createLinearGradient(0, 0, 0, bgGlowY);
      colGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${colAlpha * 0.7})`);
      colGrad.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${colAlpha})`);
      colGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

      ctx.fillStyle = colGrad;
      ctx.fillRect(colX - colW * 0.5, 0, colW, bgGlowY);
    }

    ctx.restore();

    // Baseline layout
    const baselineY = Math.floor(h * (isMobile ? 0.76 : 0.72));
    const padX = isMobile ? w * 0.035 : w * 0.045;
    const totalSpectrumWidth = w - padX * 2;
    const startX = padX;
    const endX = w - padX;

    // Heavy Bass Soft Cyan/Blue Glow behind the bass region
    if (bass > 0.14) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const bassX = startX + totalSpectrumWidth * 0.12;
      const bassRad = Math.min(w * 0.32, 220);
      const bassGlow = ctx.createRadialGradient(bassX, baselineY - 20, 0, bassX, baselineY - 20, bassRad);
      bassGlow.addColorStop(0, `rgba(0, 230, 255, ${bass * 0.09})`);
      bassGlow.addColorStop(0.5, `rgba(0, 130, 255, ${bass * 0.035})`);
      bassGlow.addColorStop(1, 'rgba(0, 100, 255, 0)');
      ctx.fillStyle = bassGlow;
      ctx.beginPath();
      ctx.arc(bassX, baselineY - 20, bassRad, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ==============================================================
    // LAYER 3: DIGITAL RAIN (CLEAN GLOWING LIGHT STREAKS)
    // Thin, soft, semi-transparent, different speeds/lengths/brightness
    // Colors follow RAFA spectrum
    // ==============================================================
    const activeRainCount = isMobile ? 45 : 75;
    const speedMultiplier = 1.0 + bass * 0.55 + transient * 0.35;
    const lenMultiplier = 1.0 + bass * 0.75;

    ctx.save();
    for (let i = 0; i < activeRainCount; i++) {
      // Advance rain streak
      this.rainY[i] += this.rainSpeed[i] * speedMultiplier * dt;

      const streakLen = this.rainBaseLen[i] * lenMultiplier;
      const rx = this.rainX[i];
      const ry = this.rainY[i];

      // Respawn when off screen
      if (ry - streakLen > h + 20) {
        this.resetStreak(i, false);
        continue;
      }

      // Streak color based on horizontal position in RAFA spectrum
      const u = rx / w;
      const c = getSpectrumRGB(u);

      // Brightness modulation with audio (quiet = low, bass/transient = brighter)
      let streakAlpha = this.rainBaseAlpha[i];
      if (this.isBrightStreak[i] === 1) {
        streakAlpha *= (1.0 + bass * 0.85 + transient * 0.55);
      } else {
        streakAlpha *= (0.75 + bass * 0.45 + transient * 0.35);
      }
      streakAlpha = Math.min(0.92, streakAlpha);

      // Vertical fading gradient (tail is transparent, head is bright)
      const streakGrad = ctx.createLinearGradient(0, ry - streakLen, 0, ry);
      streakGrad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
      streakGrad.addColorStop(0.65, `rgba(${c.r}, ${c.g}, ${c.b}, ${streakAlpha * 0.45})`);
      streakGrad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, ${streakAlpha})`);

      ctx.fillStyle = streakGrad;
      const sw = this.rainWidth[i];
      ctx.fillRect(rx - sw * 0.5, ry - streakLen, sw, streakLen);

      // Subtle pinpoint glint at head for brighter streaks
      if (this.isBrightStreak[i] === 1 && ry > 0 && ry < h) {
        ctx.fillStyle = `rgba(${Math.min(255, c.r + 50)}, ${Math.min(255, c.g + 50)}, ${Math.min(255, c.b + 50)}, ${streakAlpha * 0.85})`;
        ctx.beginPath();
        ctx.arc(rx, ry, sw * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // ==============================================================
    // LAYER 4: PARTICLES (35–50 PARTICLES, DUAL DRIFT: DOWN & UP)
    // ==============================================================
    if (ambientField) {
      ctx.save();
      const pCount = Math.min(45, ambientField.numParticles);
      for (let i = 0; i < pCount; i++) {
        const px = ambientField.x[i];
        const py = ambientField.y[i];
        const pSize = ambientField.size[i];
        const pHue = ambientField.hueType[i];
        const pAlpha = ambientField.alpha[i] * 0.65;

        let colStr;
        if (pHue === 0) colStr = `rgba(0, 240, 255, ${pAlpha})`;
        else if (pHue === 1) colStr = `rgba(50, 140, 255, ${pAlpha})`;
        else if (pHue === 2) colStr = `rgba(160, 80, 255, ${pAlpha})`;
        else colStr = `rgba(255, 60, 180, ${pAlpha})`;

        ctx.fillStyle = colStr;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.8, pSize * 0.7), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // ==============================================================
    // LAYER 5: BASS IMPACT RINGS (RADIAL LIGHT RIPPLES ON STRONG BASS)
    // Very transparent, cyan/blue, soft, expanding & fading (max 2 at a time)
    // ==============================================================
    if ((bass > 0.40 || transient > 0.42) && (this.time - this.lastRippleTime > 0.35)) {
      const inactiveRipple = this.ripples.find((r) => !r.active);
      if (inactiveRipple) {
        inactiveRipple.active = true;
        inactiveRipple.x = startX + totalSpectrumWidth * 0.12;
        inactiveRipple.y = baselineY - 8;
        inactiveRipple.radius = 12;
        inactiveRipple.maxRadius = Math.min(w * 0.36, 260);
        inactiveRipple.alpha = 0.28 + transient * 0.14;
        this.lastRippleTime = this.time;
      }
    }

    ctx.save();
    for (let r = 0; r < this.ripples.length; r++) {
      const rip = this.ripples[r];
      if (!rip.active) continue;

      rip.radius += dt * 300;
      rip.alpha *= Math.pow(0.88, dt * 60);

      if (rip.radius > rip.maxRadius || rip.alpha < 0.01) {
        rip.active = false;
      } else {
        ctx.strokeStyle = `rgba(0, 230, 255, ${rip.alpha})`;
        ctx.lineWidth = 1.4;
        ctx.shadowColor = `rgba(0, 230, 255, ${rip.alpha * 0.75})`;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.ellipse(rip.x, rip.y, rip.radius, rip.radius * 0.58, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();

    // ==============================================================
    // LAYER 6: HERO AUDIO SPECTRUM (UPWARD TRAILS, DOWNWARD REFLECTION, BARS, BASELINE)
    // Driven live by real AnalyserNode FFT data
    // ==============================================================
    const rawFreq = audioEngine?.getRawFrequencyData?.();
    const binCount = rawFreq ? rawFreq.length : 256;
    const isPlaying = audioEngine?.currentTrack?.isPlaying;

    const barSlot = totalSpectrumWidth / numBars;
    const barWidth = Math.max(1.8, barSlot * (isMobile ? 0.68 : 0.58));
    const gap = (totalSpectrumWidth - barWidth * numBars) / Math.max(1, numBars - 1);
    const maxHeight = Math.min(h * 0.52, isMobile ? 220 : 340);

    // Compute target heights from real FFT data
    for (let i = 0; i < numBars; i++) {
      const u = i / (numBars - 1);

      let targetHeight = 4.0;

      if (rawFreq && isPlaying) {
        let binStart, binEnd;
        if (u < 0.22) {
          // Bass range (spread out over first ~25% of bars)
          const bassU = u / 0.22;
          binStart = Math.max(1, Math.floor(Math.pow(bassU, 1.4) * 8));
          binEnd = Math.min(binCount - 1, binStart + 1);
        } else if (u < 0.65) {
          // Mid range
          const midU = (u - 0.22) / (0.65 - 0.22);
          binStart = Math.floor(8 + Math.pow(midU, 1.3) * 44);
          binEnd = Math.min(binCount - 1, binStart + 2);
        } else {
          // High range
          const highU = (u - 0.65) / (1.0 - 0.65);
          binStart = Math.floor(52 + Math.pow(highU, 1.5) * 115);
          binEnd = Math.min(binCount - 1, binStart + 3);
        }

        let sum = 0;
        let count = 0;
        for (let b = binStart; b <= binEnd; b++) {
          sum += rawFreq[b] || 0;
          count++;
        }
        const rawVal = count > 0 ? (sum / (count * 255.0)) : 0.0;

        let weight = 1.0;
        if (u < 0.22) {
          weight = 1.55 + (1.0 - u / 0.22) * 0.45;
        } else if (u < 0.65) {
          weight = 1.15;
        } else {
          weight = 1.35;
        }

        let energy = Math.pow(rawVal * weight, 1.18);

        // Bass resonance coupling for nearby bars
        if (u < 0.25 && bass > 0.15) {
          energy += bass * 0.35 * Math.exp(-Math.pow((u - 0.07) / 0.10, 2.0));
        }

        // Strong beat pop
        if (transient > 0.15) {
          energy *= (1.0 + transient * 0.25);
        }

        targetHeight = Math.max(3.5, Math.min(maxHeight, energy * maxHeight));
      } else {
        const idleWave = Math.sin(this.time * 1.5 + u * 6.28) * 2.0;
        targetHeight = Math.max(3.0, 5.0 + idleWave);
      }

      // Spring-like smoothing: snappy rise, smooth gravity decay
      if (targetHeight > this.barHeights[i]) {
        this.barHeights[i] += (targetHeight - this.barHeights[i]) * Math.min(1.0, 0.72 * (dt * 60));
      } else {
        this.barHeights[i] += (targetHeight - this.barHeights[i]) * Math.min(1.0, 0.15 * (dt * 60));
      }
    }

    // 6A. Vertical Light Trails Extending Upward from Tall Bars
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < numBars; i++) {
      const bh = this.barHeights[i];
      if (bh < 28) continue;

      const u = i / (numBars - 1);
      const c = getSpectrumRGB(u);
      const bx = startX + i * (barWidth + gap);
      const barTop = baselineY - bh;

      const heightRatio = Math.min(1.0, (bh - 28) / (maxHeight - 28));

      // Strong bass peaks create longer & brighter trails
      const trailLength = Math.min(barTop - 10, bh * (1.6 + bass * 1.6 + transient * 0.8));
      const trailTop = Math.max(15, barTop - trailLength);
      const trailAlpha = Math.pow(heightRatio, 1.5) * (0.24 + bass * 0.20 + transient * 0.18);

      const trailGrad = ctx.createLinearGradient(0, barTop, 0, trailTop);
      trailGrad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, ${trailAlpha})`);
      trailGrad.addColorStop(0.25, `rgba(${c.r}, ${c.g}, ${c.b}, ${trailAlpha * 0.55})`);
      trailGrad.addColorStop(0.70, `rgba(${c.r}, ${c.g}, ${c.b}, ${trailAlpha * 0.15})`);
      trailGrad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);

      ctx.fillStyle = trailGrad;
      const trailWidth = barWidth * 2.0;
      ctx.fillRect(bx - (trailWidth - barWidth) * 0.5, trailTop, trailWidth, barTop - trailTop);
    }
    ctx.restore();

    // 6B. Subtle Downward Reflection Below Baseline
    ctx.save();
    for (let i = 0; i < numBars; i++) {
      const bh = this.barHeights[i];
      if (bh < 8) continue;

      const u = i / (numBars - 1);
      const c = getSpectrumRGB(u);
      const bx = startX + i * (barWidth + gap);

      const reflectLen = Math.min(65, bh * 0.36);
      const reflectAlpha = (0.14 + bass * 0.08) * Math.min(1.0, bh / 60);

      const reflectGrad = ctx.createLinearGradient(0, baselineY, 0, baselineY + reflectLen);
      reflectGrad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, ${reflectAlpha})`);
      reflectGrad.addColorStop(0.4, `rgba(${c.r}, ${c.g}, ${c.b}, ${reflectAlpha * 0.35})`);
      reflectGrad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);

      ctx.fillStyle = reflectGrad;
      ctx.fillRect(bx, baselineY, barWidth, reflectLen);
    }
    ctx.restore();

    // 6C. Crisp Spectrum Bars with Soft Neon Glow
    for (let i = 0; i < numBars; i++) {
      const bh = this.barHeights[i];
      const u = i / (numBars - 1);
      const c = getSpectrumRGB(u);
      const bx = startX + i * (barWidth + gap);
      const barTop = baselineY - bh;

      const barGrad = ctx.createLinearGradient(0, barTop, 0, baselineY);
      const brightR = Math.min(255, c.r + 35);
      const brightG = Math.min(255, c.g + 35);
      const brightB = Math.min(255, c.b + 35);
      const alpha = Math.min(1.0, 0.90 + transient * 0.10);

      barGrad.addColorStop(0, `rgba(${brightR}, ${brightG}, ${brightB}, ${alpha})`);
      barGrad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha * 0.85})`);

      ctx.save();

      // Soft blurred glow behind active bars
      if (bh > 16) {
        ctx.shadowColor = `rgba(${c.r}, ${c.g}, ${c.b}, ${0.35 + bass * 0.25})`;
        ctx.shadowBlur = Math.min(18, 4 + bh * 0.07);
      }

      ctx.fillStyle = barGrad;
      const cornerR = Math.min(barWidth * 0.5, 2.0);

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(bx, barTop, barWidth, bh, [cornerR, cornerR, 0, 0]);
      } else {
        ctx.rect(bx, barTop, barWidth, bh);
      }
      ctx.fill();

      ctx.restore();
    }

    // 6D. Glowing Horizontal Baseline
    const baselineGrad = ctx.createLinearGradient(startX, 0, endX, 0);
    for (const s of SPECTRUM_STOPS) {
      baselineGrad.addColorStop(s.pos, `rgba(${s.r}, ${s.g}, ${s.b}, ${0.65 + bass * 0.30})`);
    }

    ctx.save();
    ctx.strokeStyle = baselineGrad;
    ctx.lineWidth = isMobile ? 1.4 : 1.8;

    ctx.shadowColor = `rgba(0, 210, 255, ${0.40 + bass * 0.35 + transient * 0.20})`;
    ctx.shadowBlur = 10 + bass * 14 + transient * 8;

    ctx.beginPath();
    ctx.moveTo(startX, baselineY);
    ctx.lineTo(endX, baselineY);
    ctx.stroke();

    ctx.restore();
  }
}
