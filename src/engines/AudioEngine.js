import { LocalAudioSource } from './sources/LocalAudioSource';
import { TabAudioSource } from './sources/TabAudioSource';
import { SpotifySource } from './sources/SpotifySource';
import { YouTubeSource } from './sources/YouTubeSource';

/**
 * AudioEngine
 * Core audio routing, analysis, and multi-source management for RAFA.
 * Supports:
 * 1. Local Music (HTML5 Audio with real playlist, loop, shuffle, seek, volume)
 * 2. Browser Tab Audio (Live System / Tab Audio capture via getDisplayMedia)
 * 3. Spotify (Official Spotify Web API & Web Playback SDK)
 * 4. YouTube (Official YouTube Music & Video playlists exploration)
 * 
 * Pipeline:
 * SOURCE -> AUDIO ENGINE -> ANALYSER -> SPECTRUM -> RAIN -> PARTICLES -> LIGHT EFFECTS
 */
export class AudioEngine {
  constructor() {
    this.status = 'idle'; // 'idle' | 'connecting' | 'connected' | 'error'
    this.errorMessage = '';
    this.statusListeners = new Set();
    this.trackListeners = new Set();

    this.audioContext = null;
    this.analyser = null;
    this.fftSize = 512;
    this.frequencyData = null;
    this.timeData = null;
    this.gainNode = null;

    // Master volume
    this.masterVolume = 0.8;
    this.isMutedState = false;

    // Sources registry
    this.sources = {
      local: new LocalAudioSource(this),
      tab: new TabAudioSource(this),
      spotify: new SpotifySource(this),
      youtube: new YouTubeSource(this),
    };
    this.activeSourceType = 'local';
    this.activeSource = this.sources.local;

    // Current track metadata representation
    this.currentTrack = {
      title: 'Midnight Drive',
      artist: 'Sickick',
      artwork: null,
      duration: 238,
      currentTime: 84,
      isPlaying: false,
      volume: 0.8,
      isMuted: false,
      sourceType: 'local',
    };

    // Normalized audio metrics (0.0 -> 1.0)
    this.metrics = {
      volume: 0.12,
      bass: 0.12,
      mid: 0.12,
      treble: 0.1,
      energy: 0.12,
      transient: 0.0,
      bassIntensity: 0.12,
      midIntensity: 0.12,
      trebleIntensity: 0.1,
      beatIntensity: 0.0,
      isConnected: false,
    };

    // Smoothed metrics for attack/release dynamics
    this.smoothed = {
      volume: 0.1,
      bass: 0.1,
      mid: 0.1,
      treble: 0.1,
      energy: 0.1,
      transient: 0.0,
    };

    // Frequency bars for player graph (32 bars)
    this.numBars = 32;
    this.frequencyBars = new Float32Array(this.numBars);
    this.barVelocities = new Float32Array(this.numBars);

    // Peak tracking for dynamic normalization
    this.peakBass = 0.25;
    this.peakMid = 0.25;
    this.peakTreble = 0.2;
    this.peakVolume = 0.2;

    // Beat detection history
    this.energyHistory = new Float32Array(32);
    this.bassHistory = new Float32Array(32);
    this.historyIdx = 0;

    // Forward active source track events
    this.setupSourceListeners();
  }

  ensureAudioContext() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
    }

    if (!this.analyser) {
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = 0.65;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;

      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeData = new Uint8Array(this.analyser.fftSize);
    }

    if (!this.gainNode) {
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.setValueAtTime(
        this.isMutedState ? 0 : this.masterVolume,
        this.audioContext.currentTime
      );
      this.gainNode.connect(this.audioContext.destination);
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
  }

  setupSourceListeners() {
    Object.values(this.sources).forEach((src) => {
      src.onTrackChange((trackInfo) => {
        if (this.activeSource === src) {
          this.currentTrack = { ...this.currentTrack, ...trackInfo };
          this.notifyTrackChange();
        }
      });
    });
  }

  // --- SOURCE SWITCHING ---
  async setSource(sourceType) {
    if (!this.sources[sourceType]) {
      console.warn(`[AudioEngine] Unknown source type: ${sourceType}`);
      return;
    }

    if (this.activeSource === this.sources[sourceType]) {
      return;
    }

    // 1. Cleanly disconnect previous source
    if (this.activeSource) {
      this.activeSource.disconnect();
    }

    // 2. Activate new source
    this.activeSourceType = sourceType;
    this.activeSource = this.sources[sourceType];

    // 3. Connect to AudioContext
    this.ensureAudioContext();

    if (sourceType === 'tab') {
      const connected = await this.activeSource.connect();
      if (!connected) {
        // Fall back to local source if user cancels tab sharing
        this.setSource('local');
        return;
      }
    } else if (sourceType === 'local') {
      this.activeSource.notifyTrackUpdate();
    } else if (sourceType === 'spotify') {
      this.activeSource.notifyTrackUpdate();
    } else if (sourceType === 'youtube') {
      this.activeSource.notifyTrackUpdate();
    }

    this.notifyTrackChange();
  }

  getSource(type) {
    return this.sources[type] || null;
  }

  getActiveSource() {
    return this.activeSource;
  }

  // --- STATUS & TRACK LISTENERS ---
  setStatus(status, errorMsg = '') {
    this.status = status;
    this.errorMessage = errorMsg;
    this.metrics.isConnected = status === 'connected';
    for (const listener of this.statusListeners) {
      listener(status, errorMsg);
    }
  }

  onStatusChange(fn) {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  onTrackChange(fn) {
    this.trackListeners.add(fn);
    fn({ ...this.currentTrack });
    return () => this.trackListeners.delete(fn);
  }

  notifyTrackChange() {
    const track = { ...this.currentTrack };
    for (const listener of this.trackListeners) {
      listener(track);
    }
  }

  // --- PLAYBACK CONTROLS (DELEGATED TO ACTIVE SOURCE) ---
  play() {
    this.ensureAudioContext();
    this.activeSource?.play();
  }

  pause() {
    this.activeSource?.pause();
  }

  togglePlayPause() {
    this.ensureAudioContext();
    this.activeSource?.togglePlayPause();
  }

  seek(timeInSeconds) {
    this.activeSource?.seek(timeInSeconds);
  }

  next() {
    this.activeSource?.next();
  }

  previous() {
    this.activeSource?.previous();
  }

  setShuffle(bool) {
    this.activeSource?.setShuffle(bool);
  }

  setRepeat(mode) {
    this.activeSource?.setRepeat(mode);
  }

  toggleRepeat() {
    if (this.activeSource?.toggleRepeat) {
      this.activeSource.toggleRepeat();
    }
  }

  // --- VOLUME MANAGEMENT ---
  getVolume() {
    return this.masterVolume;
  }

  isMuted() {
    return this.isMutedState;
  }

  setVolume(fraction) {
    const clamped = Math.max(0, Math.min(1, fraction));
    this.masterVolume = clamped;
    this.isMutedState = clamped === 0;

    if (this.gainNode && this.audioContext) {
      this.gainNode.gain.setValueAtTime(
        this.isMutedState ? 0 : clamped,
        this.audioContext.currentTime
      );
    }

    if (this.activeSource?.setVolume) {
      this.activeSource.setVolume(clamped);
    }

    this.currentTrack.volume = clamped;
    this.currentTrack.isMuted = this.isMutedState;
    this.notifyTrackChange();
  }

  setMasterVolume(fraction) {
    this.setVolume(fraction);
  }

  toggleMute() {
    if (this.isMutedState) {
      this.setVolume(this.masterVolume || 0.8);
    } else {
      this.setVolume(0);
    }
  }

  // --- LOCAL FILE LOADING SHORTCUTS ---
  loadLocalFile(file) {
    if (this.activeSourceType !== 'local') {
      this.setSource('local');
    }
    this.sources.local.addFiles([file]);
  }

  addLocalFiles(files) {
    if (this.activeSourceType !== 'local') {
      this.setSource('local');
    }
    this.sources.local.addFiles(files);
  }

  // --- TAB AUDIO SHORTCUTS ---
  async captureAudio() {
    await this.setSource('tab');
    return this.status === 'connected';
  }

  disconnectTabAudio() {
    if (this.activeSourceType === 'tab') {
      this.activeSource.disconnect();
      this.setStatus('idle');
      this.setSource('local');
    }
  }

  disconnect() {
    if (this.activeSource) {
      this.activeSource.disconnect();
    }
    this.currentTrack.isPlaying = false;
    this.setStatus('idle');
    this.notifyTrackChange();
  }

  // --- AUDIO METRICS ANALYSIS ---
  smoothVal(current, target, dt, attackRate = 0.6, releaseRate = 0.07) {
    const rate = target > current ? attackRate : releaseRate;
    return current + (target - current) * Math.min(1.0, rate * (dt * 60));
  }

  analyzeAudio(dt) {
    if (this.status === 'connected' && this.analyser) {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      this.analyser.getByteFrequencyData(this.frequencyData);
      this.analyser.getByteTimeDomainData(this.timeData);

      // 1. RMS volume
      let sumSquares = 0;
      const tLen = this.timeData.length;
      for (let i = 0; i < tLen; i++) {
        const norm = (this.timeData[i] - 128) / 128;
        sumSquares += norm * norm;
      }
      const rawRms = Math.sqrt(sumSquares / tLen);

      // 2. Frequency bands extraction
      // Bass: 40Hz - 260Hz (bins 1 to 6)
      let bassSum = 0;
      for (let i = 1; i <= 6; i++) {
        bassSum += this.frequencyData[i];
      }
      const rawBass = bassSum / (6 * 255);

      // Mid: 260Hz - 2600Hz (bins 7 to 30)
      let midSum = 0;
      for (let i = 7; i <= 30; i++) {
        midSum += this.frequencyData[i];
      }
      const rawMid = midSum / (24 * 255);

      // Treble: 2600Hz - 11000Hz (bins 31 to 128)
      let trebleSum = 0;
      for (let i = 31; i <= 128; i++) {
        trebleSum += this.frequencyData[i];
      }
      const rawTreble = trebleSum / (98 * 255);

      const rawEnergy = rawBass * 0.62 + rawMid * 0.26 + rawTreble * 0.12;

      // 3. Dynamic peak tracking
      const decay = Math.pow(0.997, dt * 60);
      this.peakBass = Math.max(0.12, Math.max(this.peakBass * decay, rawBass));
      this.peakMid = Math.max(0.10, Math.max(this.peakMid * decay, rawMid));
      this.peakTreble = Math.max(0.08, Math.max(this.peakTreble * decay, rawTreble));
      this.peakVolume = Math.max(0.08, Math.max(this.peakVolume * decay, rawRms * 2.0));

      const normBass = Math.min(1.0, Math.pow(rawBass / this.peakBass, 1.25));
      const normMid = Math.min(1.0, Math.pow(rawMid / this.peakMid, 1.15));
      const normTreble = Math.min(1.0, Math.pow(rawTreble / this.peakTreble, 1.15));
      const normVol = Math.min(1.0, Math.pow((rawRms * 2.0) / this.peakVolume, 1.2));
      const normEnergy = Math.min(1.0, normBass * 0.65 + normMid * 0.23 + normTreble * 0.12);

      // 4. Beat / Transient Detection
      this.energyHistory[this.historyIdx] = rawEnergy;
      this.bassHistory[this.historyIdx] = rawBass;
      this.historyIdx = (this.historyIdx + 1) % this.energyHistory.length;

      let avgEnergy = 0;
      let avgBass = 0;
      for (let i = 0; i < this.energyHistory.length; i++) {
        avgEnergy += this.energyHistory[i];
        avgBass += this.bassHistory[i];
      }
      avgEnergy /= this.energyHistory.length;
      avgBass /= this.bassHistory.length;

      let rawTransient = 0;
      const energySpike = rawEnergy > avgEnergy * 1.20 && rawEnergy > 0.12;
      const bassSpike = rawBass > avgBass * 1.22 && rawBass > 0.14;

      if (energySpike || bassSpike) {
        const deltaE = Math.max(0, rawEnergy - avgEnergy * 1.20) * 3.8;
        const deltaB = Math.max(0, rawBass - avgBass * 1.22) * 4.2;
        rawTransient = Math.min(1.0, Math.max(deltaE, deltaB));
      }

      // 5. Asymmetric dynamics
      this.smoothed.volume = this.smoothVal(this.smoothed.volume, normVol, dt, 0.70, 0.08);
      this.smoothed.bass = this.smoothVal(this.smoothed.bass, normBass, dt, 0.85, 0.09);
      this.smoothed.mid = this.smoothVal(this.smoothed.mid, normMid, dt, 0.50, 0.08);
      this.smoothed.treble = this.smoothVal(this.smoothed.treble, normTreble, dt, 0.60, 0.10);
      this.smoothed.energy = this.smoothVal(this.smoothed.energy, normEnergy, dt, 0.70, 0.08);

      if (rawTransient > this.smoothed.transient) {
        this.smoothed.transient = rawTransient;
      } else {
        this.smoothed.transient *= Math.pow(0.88, dt * 60);
      }

      this.metrics.volume = this.smoothed.volume;
      this.metrics.bass = this.smoothed.bass;
      this.metrics.mid = this.smoothed.mid;
      this.metrics.treble = this.smoothed.treble;
      this.metrics.energy = this.smoothed.energy;
      this.metrics.transient = this.smoothed.transient;
      this.metrics.bassIntensity = this.smoothed.bass;
      this.metrics.midIntensity = this.smoothed.mid;
      this.metrics.trebleIntensity = this.smoothed.treble;
      this.metrics.beatIntensity = this.smoothed.transient;

      // Update 32-Bar player graph
      this.updateFrequencyBars(dt);
    } else {
      // Idle / paused: smooth decay
      this.smoothed.volume *= Math.pow(0.85, dt * 60);
      this.smoothed.bass *= Math.pow(0.82, dt * 60);
      this.smoothed.mid *= Math.pow(0.85, dt * 60);
      this.smoothed.treble *= Math.pow(0.85, dt * 60);
      this.smoothed.energy *= Math.pow(0.85, dt * 60);
      this.smoothed.transient *= Math.pow(0.80, dt * 60);

      this.metrics.volume = Math.max(0.0, this.smoothed.volume);
      this.metrics.bass = Math.max(0.0, this.smoothed.bass);
      this.metrics.mid = Math.max(0.0, this.smoothed.mid);
      this.metrics.treble = Math.max(0.0, this.smoothed.treble);
      this.metrics.energy = Math.max(0.0, this.smoothed.energy);
      this.metrics.transient = Math.max(0.0, this.smoothed.transient);

      for (let b = 0; b < this.numBars; b++) {
        this.frequencyBars[b] *= Math.pow(0.88, dt * 60);
        this.frequencyBars[b] = Math.max(0.04, this.frequencyBars[b]);
      }
    }

    return this.metrics;
  }

  updateFrequencyBars(dt) {
    if (!this.frequencyData) return;
    const binCount = this.analyser.frequencyBinCount;
    const totalBars = this.numBars;

    for (let b = 0; b < totalBars; b++) {
      const norm = b / (totalBars - 1);
      const startBin = Math.floor(Math.pow(norm, 2.0) * 115);
      const endBin = Math.min(
        binCount - 1,
        Math.max(startBin + 1, Math.floor(Math.pow((b + 1) / totalBars, 2.0) * 115))
      );

      let sum = 0;
      let count = 0;
      for (let bin = startBin; bin <= endBin; bin++) {
        sum += this.frequencyData[bin] || 0;
        count++;
      }
      const rawVal = count > 0 ? sum / (count * 255) : 0;
      const boost = b < 6 ? 1.35 : b < 16 ? 1.15 : 1.45;
      const targetVal = Math.min(1.0, Math.pow(rawVal * boost, 1.15));

      if (targetVal > this.frequencyBars[b]) {
        this.frequencyBars[b] +=
          (targetVal - this.frequencyBars[b]) * Math.min(1.0, 0.7 * (dt * 60));
      } else {
        this.frequencyBars[b] +=
          (targetVal - this.frequencyBars[b]) * Math.min(1.0, 0.16 * (dt * 60));
      }
      this.frequencyBars[b] = Math.max(0.04, this.frequencyBars[b]);
    }
  }

  getFrequencyBars() {
    return this.frequencyBars;
  }

  getRawFrequencyData() {
    return this.frequencyData;
  }

  getAudioMetrics() {
    return this.metrics;
  }

  destroy() {
    this.disconnect();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.statusListeners.clear();
    this.trackListeners.clear();
  }
}
