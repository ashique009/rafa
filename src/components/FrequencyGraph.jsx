import { useEffect, useRef } from 'react';

/**
 * FrequencyGraph
 * Real-time 60 FPS neon audio spectrum analyzer matching the reference design.
 * Features:
 * - 32 vertical bars reacting directly to AudioEngine frequency data
 * - Logarithmic distribution: Bass (left) -> Mid (center) -> Treble (right)
 * - Gradient from Electric Cyan (#00f0ff) -> Sapphire Blue (#0088ff) -> Violet (#8b5cf6) -> Hot Magenta (#f72585)
 * - Rounded capsule caps and luminous neon glow
 */
export default function FrequencyGraph({ audioEngine, height = 48, numBars = 32 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId;
    const smoothedBars = new Float32Array(numBars).fill(0.12);

    let logicalWidth = 260;
    let logicalHeight = height;

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      logicalWidth = rect.width || 260;
      logicalHeight = rect.height || height;
      canvas.width = Math.floor(logicalWidth * dpr);
      canvas.height = Math.floor(logicalHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const render = () => {
      const w = logicalWidth;
      const h = logicalHeight;
      ctx.clearRect(0, 0, w, h);

      // Read real frequency bars from AudioEngine
      const rawBars = audioEngine?.getFrequencyBars?.() || smoothedBars;

      const totalBars = numBars;
      const barWidth = Math.max(2.2, (w / totalBars) * 0.52);
      const gap = (w - barWidth * totalBars) / Math.max(1, totalBars - 1);

      for (let i = 0; i < totalBars; i++) {
        // Sample corresponding band from AudioEngine's bars
        const sampleIdx = Math.floor((i / totalBars) * (rawBars.length || totalBars));
        const target = Math.max(0.06, Math.min(1.0, (rawBars[sampleIdx] || 0.08) * 1.05));

        // Smooth snappy physics: instantaneous attack, organic decay
        if (target > smoothedBars[i]) {
          smoothedBars[i] += (target - smoothedBars[i]) * 0.45;
        } else {
          smoothedBars[i] += (target - smoothedBars[i]) * 0.16;
        }

        const barHeight = Math.max(3.0, smoothedBars[i] * (h - 4));
        const x = i * (barWidth + gap);
        const y = h - barHeight;

        // Reference gradient:
        // Left (0.0 to 0.35): Electric Cyan (#00f3ff) -> Bright Azure (#0088ff)
        // Mid (0.35 to 0.70): Sapphire Blue (#0066ff) -> Orchid Violet (#9d4edd)
        // Right (0.70 to 1.0): Violet (#9d4edd) -> Hot Magenta / Pink (#f72585)
        const normX = i / Math.max(1, totalBars - 1);
        const barGrad = ctx.createLinearGradient(0, h, 0, y);

        if (normX < 0.35) {
          barGrad.addColorStop(0, '#00b4ff');
          barGrad.addColorStop(1, '#00f3ff');
        } else if (normX < 0.70) {
          barGrad.addColorStop(0, '#0066ff');
          barGrad.addColorStop(1, '#a855f7');
        } else {
          barGrad.addColorStop(0, '#a855f7');
          barGrad.addColorStop(1, '#ff2a85');
        }

        ctx.save();
        ctx.fillStyle = barGrad;

        // Luminous neon glow
        if (normX < 0.40) {
          ctx.shadowColor = 'rgba(0, 243, 255, 0.40)';
        } else if (normX < 0.75) {
          ctx.shadowColor = 'rgba(168, 85, 247, 0.40)';
        } else {
          ctx.shadowColor = 'rgba(255, 42, 133, 0.45)';
        }
        ctx.shadowBlur = 6;

        // Rounded capsule bar
        const r = Math.min(barWidth * 0.5, barHeight * 0.5);
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, barHeight, [r, r, 1.2, 1.2]);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', updateSize);
    };
  }, [audioEngine, numBars, height]);

  return (
    <div
      style={{
        width: '100%',
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: `${height}px`,
          display: 'block',
        }}
      />
    </div>
  );
}
