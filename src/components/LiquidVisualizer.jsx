import { useRef, useEffect, useState, useCallback } from 'react';
import { AudioEngine } from '../engines/AudioEngine';
import { AmbientFieldEngine } from '../engines/AmbientFieldEngine';
import { VisualRenderer } from '../engines/VisualRenderer';
import { InteractionController } from '../engines/InteractionController';
import { useDeviceMotion } from '../hooks/useDeviceMotion';
import StartExperience from './StartExperience';
import VisualizerOverlay from './VisualizerOverlay';
import MusicPlayer from './MusicPlayer';

export default function MusicVisualizer() {
  // Start Experience is shown first on fresh session
  const [isStarted, setIsStarted] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('rafa_started') === 'true';
    }
    return false;
  });

  const [audioStatus, setAudioStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 860 : false
  );
  const [audioEngine, setAudioEngine] = useState(null);

  const canvasRef = useRef(null);

  // Engine references kept outside React render cycle for 60 FPS performance
  const audioEngineRef = useRef(null);
  const ambientEngineRef = useRef(null);
  const rendererRef = useRef(null);
  const controllerRef = useRef(null);

  // Device Motion & Orientation physics hook
  const { tiltX, tiltY, shakeImpulse } = useDeviceMotion();

  // Initialize engines on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const audio = new AudioEngine();
    const particleCount = typeof window !== 'undefined' && window.innerWidth < 860 ? 30 : 45;
    const ambient = new AmbientFieldEngine(particleCount);
    const renderer = new VisualRenderer(canvas);
    const controller = new InteractionController(canvas, ambient);

    audioEngineRef.current = audio;
    ambientEngineRef.current = ambient;
    rendererRef.current = renderer;
    controllerRef.current = controller;
    setAudioEngine(audio);

    // Listen to audio connection state changes
    const unsubStatus = audio.onStatusChange((status, err) => {
      setAudioStatus(status);
      setErrorMessage(err || '');
    });

    // Resize handler
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setIsMobile(width < 860);
      ambient.resize(width, height);
      renderer.resize(width, height);
    };

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });

    // 60 FPS unified animation loop
    let animId;
    let lastTime = performance.now();

    const loop = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.033);
      lastTime = now;

      // 1. Analyze real audio metrics
      const metrics = audio.analyzeAudio(dt);

      // 2. Advance ambient particle and light field physics
      ambient.update(dt, metrics);

      // 3. Render full-screen audio spectrum visualizer
      renderer.render(ambient, metrics, dt, audio);

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

  // Apply device tilt & shake physics to ambient engine
  useEffect(() => {
    if (ambientEngineRef.current) {
      ambientEngineRef.current.applyMotion({ tiltX, tiltY, shakeImpulse });
    }
  }, [tiltX, tiltY, shakeImpulse]);

  // Handle source selection from Start Experience screen
  const handleSelectSource = useCallback(async (sourceType, files = null) => {
    const audio = audioEngineRef.current;
    if (!audio) return;

    if (sourceType === 'local') {
      await audio.setSource('local');
      if (files && files.length > 0) {
        audio.addLocalFiles(files);
      } else {
        audio.play();
      }
    } else if (sourceType === 'tab') {
      await audio.setSource('tab');
    } else if (sourceType === 'spotify') {
      await audio.setSource('spotify');
    } else if (sourceType === 'youtube') {
      await audio.setSource('youtube');
    }

    setIsStarted(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('rafa_started', 'true');
    }

    if (ambientEngineRef.current) {
      ambientEngineRef.current.disturb(0.5, 0.5, 12);
    }
  }, []);

  // Back / Change Source option inside the visualizer
  const handleChangeSource = useCallback(() => {
    const audio = audioEngineRef.current;
    if (audio) {
      audio.pause();
    }
    setIsStarted(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('rafa_started');
    }
  }, []);

  const handleDisconnectAudio = useCallback(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.disconnect();
    }
  }, []);

  const handleReconnectAudio = useCallback(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.setSource('tab');
    }
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#010206',
      }}
    >
      {/* Primary High-Performance 60 FPS Spectrum Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: 'default',
          touchAction: 'none',
        }}
      />

      {/* RAFA Start Experience Screen (shown first on fresh visit) */}
      <StartExperience
        isStarted={isStarted}
        onSelectSource={handleSelectSource}
        audioStatus={audioStatus}
        errorMessage={errorMessage}
      />

      {/* Header Overlay Branding (RAFA + Audio Badge + Change Source + Pixlune Logo) */}
      <VisualizerOverlay
        isStarted={isStarted}
        audioStatus={audioStatus}
        audioEngine={audioEngine}
        isMobile={isMobile}
        onDisconnectAudio={handleDisconnectAudio}
        onReconnectAudio={handleReconnectAudio}
        onChangeSource={handleChangeSource}
      />

      {/* Floating Dark Glass Music Player */}
      {isStarted && (
        <MusicPlayer
          audioEngine={audioEngine}
          isMobile={isMobile}
          onChangeSource={handleChangeSource}
          onOpenTabAudio={handleReconnectAudio}
        />
      )}
    </div>
  );
}
