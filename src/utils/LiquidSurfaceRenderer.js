/**
 * LiquidSurfaceRenderer provides the advanced canvas rendering methods
 * for the multi-layer fluid, caustics, chromatic meniscus, and glass tank optics.
 */
export class LiquidSurfaceRenderer {
  constructor() {
    this.causticPhase = 0;
  }

  // Draw smooth cubic spline through height points
  drawSpline(ctx, points, key = 'y', closeToBottom = true, width, height) {
    if (!points || points.length === 0) return;
    const len = points.length;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0][key]);

    for (let i = 0; i < len - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const midX = (p0.x + p1.x) * 0.5;
      const midY = (p0[key] + p1[key]) * 0.5;
      ctx.quadraticCurveTo(p0.x, p0[key], midX, midY);
    }

    ctx.lineTo(points[len - 1].x, points[len - 1][key]);

    if (closeToBottom) {
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
    }
  }

  render(ctx, { width, height, points, audioData, palette, isStarted }) {
    if (!points || points.length === 0) return;

    const {
      bassIntensity = 0.3,
      midIntensity = 0.3,
      trebleIntensity = 0.2,
      volume = 0.8,
      beatIntensity = 0.0,
    } = audioData;

    this.causticPhase += 0.02 * (1 + midIntensity);

    const primaryColor = palette.primary || '#00f3ff';
    const secondaryColor = palette.secondary || '#ff007f';
    const tertiaryColor = palette.tertiary || '#9d00ff';
    const deepColor = palette.deep || '#03030c';

    // 1. Upward Volumetric Bloom into the atmospheric void
    const glowY = points[Math.floor(points.length / 2)]?.y ?? height * 0.65;
    const ambientGrad = ctx.createRadialGradient(
      width * 0.5,
      glowY + 40,
      10,
      width * 0.5,
      glowY - (100 + bassIntensity * 40),
      width * (isStarted ? 0.85 : 0.65)
    );
    ambientGrad.addColorStop(0, `${primaryColor}22`);
    ambientGrad.addColorStop(0.3, `${tertiaryColor}15`);
    ambientGrad.addColorStop(0.7, `${secondaryColor}08`);
    ambientGrad.addColorStop(1, 'transparent');

    ctx.save();
    ctx.globalAlpha = Math.max(0.3, volume);
    ctx.fillStyle = ambientGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // 2. BACK WAVE LAYER (Deep background fluid mass)
    ctx.save();
    this.drawSpline(ctx, points, 'backY', true, width, height);
    const backGrad = ctx.createLinearGradient(0, glowY - 50, 0, height);
    backGrad.addColorStop(0, `${tertiaryColor}44`);
    backGrad.addColorStop(0.4, `${deepColor}cc`);
    backGrad.addColorStop(1, '#020108');
    ctx.fillStyle = backGrad;
    ctx.fill();
    ctx.restore();

    // 3. MID WAVE LAYER (Secondary fluid body with dynamic neon blend)
    ctx.save();
    this.drawSpline(ctx, points, 'midY', true, width, height);
    const midGrad = ctx.createLinearGradient(0, glowY - 30, width, height);
    midGrad.addColorStop(0, `${secondaryColor}77`);
    midGrad.addColorStop(0.5, `${tertiaryColor}66`);
    midGrad.addColorStop(1, `${deepColor}ee`);
    ctx.fillStyle = midGrad;
    ctx.fill();
    ctx.restore();

    // 4. FRONT WAVE LAYER (Primary Fluid Volume)
    ctx.save();
    this.drawSpline(ctx, points, 'y', true, width, height);

    // Dynamic RGB liquid gradient based on audio
    const frontGrad = ctx.createLinearGradient(
      width * 0.2 + Math.sin(this.causticPhase) * 60,
      glowY - 20,
      width * 0.8,
      height
    );
    frontGrad.addColorStop(0, `${primaryColor}dd`);
    frontGrad.addColorStop(0.25, `${secondaryColor}bb`);
    frontGrad.addColorStop(0.65, `${tertiaryColor}cc`);
    frontGrad.addColorStop(1, '#020206fa');

    ctx.fillStyle = frontGrad;
    ctx.fill();

    // 5. CAUSTIC REFRACTIONS INSIDE LIQUID (Simulating light dancing in water)
    ctx.save();
    ctx.clip(); // Clip caustics strictly within the liquid body
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = `${primaryColor}28`;
    ctx.lineWidth = 2.5;

    for (let c = 0; c < 3; c++) {
      ctx.beginPath();
      const cOffset = c * 35;
      const cPhase = this.causticPhase * (1.2 + c * 0.4);
      for (let i = 0; i < points.length; i += 3) {
        const pt = points[i];
        const cy = pt.y + 25 + cOffset + Math.sin(i * 0.15 + cPhase) * (10 + bassIntensity * 8);
        if (i === 0) ctx.moveTo(pt.x, cy);
        else ctx.lineTo(pt.x, cy);
      }
      ctx.stroke();
    }
    ctx.restore(); // Restore clipping

    // 6. SPECULAR MENISCUS RIBBON (Surface light boundary & chromatic dispersion)
    // Pass A: Soft Neon Glow Aura
    ctx.save();
    this.drawSpline(ctx, points, 'y', false, width, height);
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 4 + beatIntensity * 4;
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = 24 + beatIntensity * 20;
    ctx.globalAlpha = 0.75 + beatIntensity * 0.25;
    ctx.stroke();
    ctx.restore();

    // Pass B: Chromatic Aberration Fringe (Cyan / Magenta offset)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Cyan displacement
    ctx.beginPath();
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const mx = (p0.x + p1.x) * 0.5 - 1.5;
      const my = (p0.y + p1.y) * 0.5 - 1.5;
      if (i === 0) ctx.moveTo(p0.x - 1.5, p0.y - 1.5);
      ctx.quadraticCurveTo(p0.x - 1.5, p0.y - 1.5, mx, my);
    }
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.6;
    ctx.stroke();

    // Magenta displacement
    ctx.beginPath();
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const mx = (p0.x + p1.x) * 0.5 + 1.5;
      const my = (p0.y + p1.y) * 0.5 + 1.5;
      if (i === 0) ctx.moveTo(p0.x + 1.5, p0.y + 1.5);
      ctx.quadraticCurveTo(p0.x + 1.5, p0.y + 1.5, mx, my);
    }
    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.restore();

    // Pass C: Ultra-bright Specular Highlights
    ctx.save();
    this.drawSpline(ctx, points, 'y', false, width, height);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2 + trebleIntensity * 0.5;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8 + trebleIntensity * 6;
    ctx.globalAlpha = 0.85;
    ctx.stroke();
    ctx.restore();

    // 7. GLASS CONTAINER REFLECTIONS & TANK EDGES
    ctx.save();
    const leftSheen = ctx.createLinearGradient(0, 0, 16, 0);
    leftSheen.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
    leftSheen.addColorStop(0.5, 'rgba(0, 243, 255, 0.08)');
    leftSheen.addColorStop(1, 'transparent');
    ctx.fillStyle = leftSheen;
    ctx.fillRect(0, 0, 16, height);

    const rightSheen = ctx.createLinearGradient(width, 0, width - 16, 0);
    rightSheen.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
    rightSheen.addColorStop(0.5, 'rgba(255, 0, 127, 0.08)');
    rightSheen.addColorStop(1, 'transparent');
    ctx.fillStyle = rightSheen;
    ctx.fillRect(width - 16, 0, 16, height);

    const bottomSheen = ctx.createLinearGradient(0, height, 0, height - 24);
    bottomSheen.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    bottomSheen.addColorStop(1, 'transparent');
    ctx.fillStyle = bottomSheen;
    ctx.fillRect(0, height - 24, width, 24);
    ctx.restore();
  }
}
