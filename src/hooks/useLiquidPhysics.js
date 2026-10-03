import { useRef, useCallback } from 'react';

/**
 * useLiquidPhysics manages the fluid height-field, spring-mass wave equations,
 * slosh inertia, and multi-harmonic fluid motion.
 */
export function useLiquidPhysics({
  numPoints = 160,
  baseFillRatio = 0.38,
  tension = 0.024,
  damping = 0.045,
  spread = 0.28,
} = {}) {
  const pointsRef = useRef(
    Array.from({ length: numPoints }, () => ({
      x: 0,
      y: 0,
      targetY: 0,
      vy: 0,
      midY: 0,
      backY: 0,
    }))
  );

  const sloshStateRef = useRef({
    angle: 0,
    angularVelocity: 0,
    targetAngle: 0,
  });

  const timeRef = useRef(0);
  const dimensionsRef = useRef({ width: 1000, height: 800 });

  const setDimensions = useCallback((width, height) => {
    dimensionsRef.current = { width, height };
    const points = pointsRef.current;
    const len = points.length;
    const step = width / (len - 1);

    for (let i = 0; i < len; i++) {
      points[i].x = i * step;
    }
  }, []);

  const splash = useCallback((normX, force, radiusPoints = 8) => {
    const points = pointsRef.current;
    const len = points.length;
    const centerIdx = Math.floor(Math.max(0, Math.min(1, normX)) * (len - 1));

    for (let i = -radiusPoints; i <= radiusPoints; i++) {
      const idx = centerIdx + i;
      if (idx >= 0 && idx < len) {
        const falloff = Math.cos((i / radiusPoints) * (Math.PI * 0.5));
        points[idx].vy += force * falloff * 15;
      }
    }
  }, []);

  const updatePhysics = useCallback(
    (
      dt,
      {
        bassIntensity = 0.3,
        midIntensity = 0.3,
        trebleIntensity = 0.2,
        volume = 0.8,
        beatIntensity = 0.0,
        tiltX = 0,
        tiltY = 0,
        shakeImpulse = 0,
        isStarted = false,
      } = {}
    ) => {
      const { width, height } = dimensionsRef.current;
      const points = pointsRef.current;
      const len = points.length;
      timeRef.current += dt;
      const t = timeRef.current;

      // Handle Shake impulse
      if (shakeImpulse > 0.05) {
        const randomX = Math.random();
        splash(randomX, (Math.random() - 0.5) * shakeImpulse * 35, 14);
      }

      // Handle Beat impulse
      if (beatIntensity > 0.15) {
        const rippleX = 0.45 + (Math.sin(t * 3) * 0.2);
        splash(rippleX, beatIntensity * (18 + bassIntensity * 12), 12);
      }

      // Slosh angle physics (momentum & pendulum restoration)
      const slosh = sloshStateRef.current;
      slosh.targetAngle = tiltX * 0.22;
      const angleDiff = slosh.targetAngle - slosh.angle;
      const angularAcc = angleDiff * 6.5 - slosh.angularVelocity * 3.8;
      slosh.angularVelocity += angularAcc * dt;
      slosh.angle += slosh.angularVelocity * dt;

      // Forward/backward tilt alters the visual surface baseline (tiltY)
      const tiltYOffset = tiltY * 30;

      // Base liquid height from screen bottom
      const targetFillRatio = isStarted ? (baseFillRatio + bassIntensity * 0.08) : baseFillRatio;
      const liquidDepth = height * targetFillRatio;
      const restBaseY = height - liquidDepth + tiltYOffset;

      // Multi-harmonic natural fluid waves
      const speedMult = 0.9 + midIntensity * 0.7;
      const swellAmp = (12 + bassIntensity * 28) * (volume * 0.8 + 0.2);
      const rippleAmp = 3 + trebleIntensity * 8;

      // Update baseline targetY and run spring-mass equations
      for (let i = 0; i < len; i++) {
        const normI = i / (len - 1);
        const centeredNorm = normI - 0.5;

        // Slosh height offset (momentum slosh left/right)
        const sloshOffset = centeredNorm * width * Math.tan(slosh.angle);

        // Organic continuous non-repeating waves
        const wave1 = Math.sin(normI * 5.2 + t * 1.4 * speedMult) * swellAmp * 0.55;
        const wave2 = Math.cos(normI * 9.8 - t * 2.1 * speedMult) * (swellAmp * 0.3);
        const wave3 = Math.sin(normI * 17.5 + t * 3.8 * speedMult) * rippleAmp;
        const wave4 = Math.sin(normI * 31.0 - t * 6.2 * speedMult) * (trebleIntensity * 2.5);

        points[i].targetY = restBaseY + sloshOffset + wave1 + wave2 + wave3 + wave4;

        // Hooke's Law restoring force & damping
        const displacement = points[i].y - points[i].targetY;
        const springForce = -tension * displacement;
        const dampingForce = -damping * points[i].vy;

        points[i].vy += (springForce + dampingForce) * (dt * 60);
        points[i].y += points[i].vy * (dt * 60);
      }

      // Propagate waves to neighbors (simulate surface tension / fluid continuum)
      const leftDeltas = new Float32Array(len);
      const rightDeltas = new Float32Array(len);

      for (let sub = 0; sub < 4; sub++) {
        for (let i = 0; i < len; i++) {
          if (i > 0) {
            leftDeltas[i] = spread * (points[i].y - points[i - 1].y);
            points[i - 1].vy += leftDeltas[i];
          }
          if (i < len - 1) {
            rightDeltas[i] = spread * (points[i].y - points[i + 1].y);
            points[i + 1].vy += rightDeltas[i];
          }
        }

        for (let i = 0; i < len; i++) {
          if (i > 0) points[i - 1].y += leftDeltas[i];
          if (i < len - 1) points[i + 1].y += rightDeltas[i];
        }
      }

      // Calculate secondary volumetric layers (mid and back waves)
      for (let i = 0; i < len; i++) {
        const normI = i / (len - 1);
        const midWaveOffset =
          Math.sin(normI * 4.5 - t * 1.1 * speedMult + 1.2) * (swellAmp * 0.45) +
          Math.cos(normI * 11.2 + t * 1.8 * speedMult) * (rippleAmp * 0.6);

        const backWaveOffset =
          Math.cos(normI * 3.8 + t * 0.85 * speedMult + 2.5) * (swellAmp * 0.35) +
          Math.sin(normI * 8.4 - t * 1.4 * speedMult) * (rippleAmp * 0.4);

        points[i].midY = points[i].y + midWaveOffset + 14 + bassIntensity * 6;
        points[i].backY = points[i].y + backWaveOffset + 28 + bassIntensity * 12;
      }

      return points;
    },
    [baseFillRatio, tension, damping, spread, splash]
  );

  return {
    setDimensions,
    splash,
    updatePhysics,
  };
}
