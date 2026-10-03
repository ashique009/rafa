import { useState, useEffect, useRef, useCallback } from 'react';

export const AUDIO_PRESETS = {
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Pulse',
    bpm: 124,
    bassBase: 0.65,
    midBase: 0.5,
    trebleBase: 0.7,
    beatDecay: 0.88,
    palette: {
      primary: '#00f3ff',   // Cyan
      secondary: '#ff007f', // Neon Magenta
      tertiary: '#9d00ff',  // Electric Purple
      deep: '#06041a',      // Dark Void
    },
    description: 'High-energy rhythmic drive with vibrant sub-bass and crisp neon transients.',
  },
  nebula: {
    id: 'nebula',
    name: 'Nebula Drift',
    bpm: 92,
    bassBase: 0.45,
    midBase: 0.65,
    trebleBase: 0.55,
    beatDecay: 0.94,
    palette: {
      primary: '#bf5af2',   // Lilac Violet
      secondary: '#5e5ce6', // Indigo
      tertiary: '#0a84ff',  // Electric Blue
      deep: '#070318',      // Space Black
    },
    description: 'Deep celestial swells and floating harmonic textures.',
  },
  abyss: {
    id: 'abyss',
    name: 'Deep Abyss',
    bpm: 80,
    bassBase: 0.8,
    midBase: 0.35,
    trebleBase: 0.4,
    beatDecay: 0.96,
    palette: {
      primary: '#00d2be',   // Bioluminescent Teal
      secondary: '#0051ff', // Royal Deep Blue
      tertiary: '#4b0082',  // Indigo Night
      deep: '#020b14',      // Oceanic Trench
    },
    description: 'Massive low-frequency resonance and bioluminescent depth.',
  },
  solar: {
    id: 'solar',
    name: 'Solar Flare',
    bpm: 118,
    bassBase: 0.55,
    midBase: 0.6,
    trebleBase: 0.8,
    beatDecay: 0.9,
    palette: {
      primary: '#ff375f',   // Neon Coral
      secondary: '#ff9f0a', // Amber Flame
      tertiary: '#ff007f',  // Magenta Core
      deep: '#150308',      // Thermal Void
    },
    description: 'Warm energetic radiance with sparkling surface turbulence.',
  },
};

/**
 * useMockAudio provides real-time music-reactive audio parameters.
 * Designed to seamlessly swap with Web Audio API AnalyzerNode in the future.
 */
export function useMockAudio(isActive = true) {
  const [presetKey, setPresetKey] = useState('cyberpunk');
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Core audio-reactive parameter state
  const [audioData, setAudioData] = useState({
    bassIntensity: 0.3,
    midIntensity: 0.25,
    trebleIntensity: 0.2,
    volume: 0.6,
    beatIntensity: 0.0,
  });

  // Manual sliders override values
  const [manualValues, setManualValues] = useState({
    bassIntensity: 0.6,
    midIntensity: 0.5,
    trebleIntensity: 0.5,
    volume: 0.8,
    beatIntensity: 0.0,
  });

  const preset = AUDIO_PRESETS[presetKey] || AUDIO_PRESETS.cyberpunk;
  const synthRef = useRef(null);
  const animFrameRef = useRef(null);
  const beatTransientRef = useRef(0.0);

  // Initialize optional generative Web Audio synth for when user wants to hear the sound
  const initSynth = useCallback(() => {
    if (synthRef.current || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.25;
      masterGain.connect(ctx.destination);

      synthRef.current = {
        ctx,
        masterGain,
        lastTriggerTime: 0,
      };
    } catch (e) {
      console.warn('Web Audio not initialized:', e);
    }
  }, []);

  const triggerSynthSound = useCallback((intensity) => {
    if (!synthRef.current || isMuted) return;
    const { ctx, masterGain } = synthRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    try {
      // Sub-bass kick oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(32, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(intensity * 0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.36);

      // Ethereal chord shimmer
      const chordOsc = ctx.createOscillator();
      const chordGain = ctx.createGain();
      chordOsc.type = 'triangle';
      const frequencies = [220, 277.18, 329.63, 440];
      const freq = frequencies[Math.floor(Math.random() * frequencies.length)];
      chordOsc.frequency.setValueAtTime(freq, ctx.currentTime);
      chordGain.gain.setValueAtTime(intensity * 0.08, ctx.currentTime);
      chordGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);

      chordOsc.connect(chordGain);
      chordGain.connect(masterGain);
      chordOsc.start(ctx.currentTime);
      chordOsc.stop(ctx.currentTime + 0.85);
    } catch {
      // ignore synth glitches
    }
  }, [isMuted]);

  // Audio simulation loop
  useEffect(() => {
    let lastTime = performance.now();
    let phase = 0;
    const beatInterval = (60 / preset.bpm) * 1000;
    let nextBeatTime = performance.now() + beatInterval;

    const tick = (now) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      phase += dt;

      if (isManualOverride) {
        setAudioData({ ...manualValues });
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      // Check if beat pulse triggers
      if (now >= nextBeatTime) {
        beatTransientRef.current = 0.85 + Math.random() * 0.15;
        nextBeatTime = now + beatInterval;

        if (!isMuted) {
          triggerSynthSound(beatTransientRef.current);
        }
      } else {
        beatTransientRef.current *= Math.pow(preset.beatDecay, dt * 60);
        if (beatTransientRef.current < 0.001) beatTransientRef.current = 0;
      }

      // Sub-bass intensity with slow rhythmic swells and musical phrase waves
      const subSwell = Math.sin(phase * 0.8) * 0.15 + Math.cos(phase * 1.7) * 0.1;
      const bassValue = Math.min(
        1.0,
        Math.max(
          0.1,
          preset.bassBase + subSwell + beatTransientRef.current * 0.35
        )
      );

      // Mid-frequency harmonics
      const midWave = Math.sin(phase * 2.2 + 1.2) * 0.18 + Math.sin(phase * 0.5) * 0.12;
      const midValue = Math.min(1.0, Math.max(0.1, preset.midBase + midWave));

      // Treble intensity
      const trebleFlicker = Math.sin(phase * 4.8) * 0.15 + (Math.random() - 0.5) * 0.08;
      const trebleValue = Math.min(
        1.0,
        Math.max(
          0.05,
          preset.trebleBase + trebleFlicker + beatTransientRef.current * 0.2
        )
      );

      // Overall volume
      const baseVol = isActive ? 0.85 : 0.45;
      const volJitter = Math.sin(phase * 0.4) * 0.08;
      const volValue = Math.min(1.0, Math.max(0.2, baseVol + volJitter + beatTransientRef.current * 0.15));

      setAudioData({
        bassIntensity: bassValue,
        midIntensity: midValue,
        trebleIntensity: trebleValue,
        volume: volValue,
        beatIntensity: beatTransientRef.current,
      });

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [preset, isManualOverride, manualValues, isActive, isMuted, triggerSynthSound]);

  const toggleMute = () => {
    if (isMuted) {
      initSynth();
      setIsMuted(false);
    } else {
      setIsMuted(true);
    }
  };

  const triggerBeatImpulse = (intensity = 0.95) => {
    beatTransientRef.current = Math.min(1.0, intensity);
    if (!isMuted) {
      triggerSynthSound(intensity);
    }
  };

  return {
    audioData,
    preset,
    presetKey,
    setPresetKey,
    isManualOverride,
    setIsManualOverride,
    manualValues,
    setManualValues,
    isMuted,
    toggleMute,
    triggerBeatImpulse,
  };
}
