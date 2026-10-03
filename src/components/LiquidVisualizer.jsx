import { useRef, useEffect, useState, useCallback } from 'react';
import { AudioEngine } from '../engines/AudioEngine';
import { LiquidEngine } from '../engines/LiquidEngine';
import { VisualRenderer } from '../engines/VisualRenderer';
import { InteractionController } from '../engines/InteractionController';
import StartExperience from './StartExperience';
import VisualizerOverlay from './VisualizerOverlay';

export default function LiquidVisualizer() {
  const [isStarted, setIsStarted] = useState(false);
  const [audioStatus, setAudioStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const canvasRef = useRef(null);

  // Engine references kept outside React render cycle for 60 FPS
  const audioEngineRef = useRef(null);
  const liquidEngineRef = useRef(null);
  const rendererRef = useRef(null);
  const controllerRef = useRef(null);

  // Initialize engines on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const audio = new AudioEngine();
    const liquid = new LiquidEngine(38);
    const renderer = new VisualRenderer(canvas);
    const controller = new InteractionController(canvas, liquid);

    audioEngineRef.current = audio;
    liquidEngineRef.current = liquid;
    rendererRef.current = renderer;
    controllerRef.current = controller;

    // Listen to audio connection state changes
    const unsubStatus = audio.onStatusChange((status, err) => {
      setAudioStatus(status);
      setErrorMessage(err || '');
    });

    // Resize handler
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      liquid.resize(width, height);
      renderer.resize(width, height);
    };

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });

    // Single unified 60 FPS animation loop with zero heap allocation
    let animId;
    let lastTime = performance.now();

    const loop = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.033);
      lastTime = now;

      // 1. Analyze real audio (or idle procedural breathing)
      const metrics = audio.analyzeAudio(dt);

      // 2. Advance fluid wave equations
      liquid.update(dt, metrics);

      // 3. Render ambient illuminated liquid environment
      renderer.render(liquid, metrics, dt);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      unsubStatus();
      controller.detach();
      audio.destroy();
    };
  }, []);

  // START EXPERIENCE: Prompts browser tab audio capture
  const handleStart = useCallback(async () => {
    const audio = audioEngineRef.current;
    if (!audio) return;

    const success = await audio.captureAudio();
    if (success) {
      setIsStarted(true);
      // Impart gentle start ripple
      if (liquidEngineRef.current) {
        liquidEngineRef.current.splash(0.5, 1.2, 5);
      }
    }
  }, []);

  const handleRetryAudio = useCallback(async () => {
    const audio = audioEngineRef.current;
    if (!audio) return;
    const success = await audio.captureAudio();
    if (success) {
      setIsStarted(true);
    }
  }, []);

  const handleContinueAmbient = useCallback(() => {
    setIsStarted(true);
    if (liquidEngineRef.current) {
      liquidEngineRef.current.splash(0.5, 0.8, 4);
    }
  }, []);

  const handleDisconnectAudio = useCallback(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.disconnect();
    }
  }, []);

  const handleReconnectAudio = useCallback(async () => {
    if (audioEngineRef.current) {
      await audioEngineRef.current.captureAudio();
    }
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#020206',
      }}
    >
      {/* Primary High-Performance 60 FPS Fluid Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: 'default',
        }}
      />

      {/* RAFA Landing Screen */}
      <StartExperience
        onStart={handleStart}
        isStarted={isStarted}
        audioStatus={audioStatus}
        errorMessage={errorMessage}
        onRetryAudio={handleRetryAudio}
        onContinueAmbient={handleContinueAmbient}
      />

      {/* Minimal Overlay & Status */}
      <VisualizerOverlay
        isStarted={isStarted}
        audioStatus={audioStatus}
        onDisconnectAudio={handleDisconnectAudio}
        onReconnectAudio={handleReconnectAudio}
      />
    </div>
  );
}
