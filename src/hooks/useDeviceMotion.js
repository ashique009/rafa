import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useDeviceMotion provides standardized orientation and motion metrics.
 * Prepared for DeviceOrientation API and DeviceMotion API with desktop simulation support.
 */
export function useDeviceMotion() {
  const [motionData, setMotionData] = useState({
    tiltX: 0,           // -1.0 (left) to 1.0 (right)
    tiltY: 0,           // -1.0 (forward) to 1.0 (backward)
    shakeImpulse: 0,    // 0.0 to 1.0 momentary acceleration impulse
    isDeviceMotionActive: false,
    permissionNeeded: false,
  });

  const lastAccelRef = useRef({ x: 0, y: 0, z: 0 });
  const smoothedTiltRef = useRef({ x: 0, y: 0 });
  const shakeTimeoutRef = useRef(null);

  // Request permission (e.g. for iOS 13+ devices)
  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined') return false;

    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      try {
        const response = await DeviceOrientationEvent.requestPermission();
        if (response === 'granted') {
          setMotionData((prev) => ({ ...prev, permissionNeeded: false, isDeviceMotionActive: true }));
          return true;
        }
      } catch (err) {
        console.warn('Device orientation permission denied:', err);
      }
      return false;
    }
    return true;
  }, []);

  // Listen for orientation & motion if supported
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOrientation = (e) => {
      if (e.gamma === null && e.beta === null) return;

      // gamma is left/right tilt [-90 to 90]
      // beta is front/back tilt [-180 to 180]
      const rawX = Math.max(-45, Math.min(45, e.gamma || 0)) / 45;
      const rawY = Math.max(-30, Math.min(30, (e.beta || 0) - 45)) / 30;

      // Smooth interpolation
      smoothedTiltRef.current.x += (rawX - smoothedTiltRef.current.x) * 0.15;
      smoothedTiltRef.current.y += (rawY - smoothedTiltRef.current.y) * 0.15;

      setMotionData((prev) => ({
        ...prev,
        tiltX: smoothedTiltRef.current.x,
        tiltY: smoothedTiltRef.current.y,
        isDeviceMotionActive: true,
      }));
    };

    const handleMotion = (e) => {
      const acc = e.accelerationIncludingGravity || e.acceleration;
      if (!acc) return;

      const deltaX = Math.abs((acc.x || 0) - lastAccelRef.current.x);
      const deltaY = Math.abs((acc.y || 0) - lastAccelRef.current.y);
      const deltaZ = Math.abs((acc.z || 0) - lastAccelRef.current.z);

      lastAccelRef.current = { x: acc.x || 0, y: acc.y || 0, z: acc.z || 0 };

      const totalDelta = deltaX + deltaY + deltaZ;
      if (totalDelta > 15) {
        const impulse = Math.min(1.0, (totalDelta - 15) / 25);
        setMotionData((prev) => ({
          ...prev,
          shakeImpulse: impulse,
        }));

        if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
        shakeTimeoutRef.current = setTimeout(() => {
          setMotionData((prev) => ({ ...prev, shakeImpulse: 0 }));
        }, 300);
      }
    };

    const checkPermissionNeeded = () => {
      if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function'
      ) {
        setMotionData((prev) => ({ ...prev, permissionNeeded: true }));
      }
    };

    checkPermissionNeeded();

    window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    window.addEventListener('devicemotion', handleMotion, { passive: true });

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, []);

  // Desktop / Mouse interactive simulation helpers
  const simulateTilt = useCallback((x, y) => {
    setMotionData((prev) => ({
      ...prev,
      tiltX: Math.max(-1, Math.min(1, x)),
      tiltY: Math.max(-1, Math.min(1, y)),
    }));
  }, []);

  const simulateShake = useCallback((strength = 0.8) => {
    setMotionData((prev) => ({
      ...prev,
      shakeImpulse: strength,
    }));
    setTimeout(() => {
      setMotionData((prev) => ({ ...prev, shakeImpulse: 0 }));
    }, 400);
  }, []);

  return {
    ...motionData,
    requestPermission,
    simulateTilt,
    simulateShake,
  };
}
