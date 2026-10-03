/**
 * AudioEngine
 * Captures browser tab/screen audio via Web Audio API,
 * extracts low-latency normalized spectral metrics (volume, bass, mid, treble, energy, transient),
 * uses asymmetric attack/release dynamics and adaptive dynamic range normalization.
 */
export class AudioEngine {
  constructor() {
    this.status = 'idle'; // 'idle' | 'connecting' | 'connected' | 'error'
    this.errorMessage = '';
    this.statusListeners = new Set();

    this.audioContext = null;
    this.mediaStream = null;
    this.sourceNode = null;
    this.analyser = null;

    this.fftSize = 512; // 256 frequency bins
    this.frequencyData = null;
    this.timeData = null;

    // Stable normalized metrics (0.0 -> 1.0)
    this.metrics = {
      volume: 0.1,
      bass: 0.1,
      mid: 0.1,
      treble: 0.1,
      energy: 0.1,
      transient: 0.0,
      bassIntensity: 0.1,
      midIntensity: 0.1,
      trebleIntensity: 0.1,
      beatIntensity: 0.0,
      isConnected: false,
    };

    // Smoothed internal metrics for attack/release dynamics
    this.smoothed = {
      volume: 0.1,
      bass: 0.1,
      mid: 0.1,
      treble: 0.1,
      energy: 0.1,
      transient: 0.0,
    };

    // Adaptive peak tracking for dynamic range normalization
    this.peakBass = 0.25;
    this.peakMid = 0.25;
    this.peakTreble = 0.2;
    this.peakVolume = 0.2;

    // Beat and bass onset history
    this.energyHistory = new Float32Array(32);
    this.bassHistory = new Float32Array(32);
    this.historyIdx = 0;

    this.idlePhase = 0;
    this.lastDebugLog = 0;
  }

  onStatusChange(fn) {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  setStatus(status, errorMsg = '') {
    this.status = status;
    this.errorMessage = errorMsg;
    this.metrics.isConnected = status === 'connected';
    for (const listener of this.statusListeners) {
      listener(status, errorMsg);
    }
  }

  /**
   * Request tab/window audio capture via getDisplayMedia
   */
  async captureAudio() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      this.setStatus('error', 'Browser tab audio capture is not supported on this browser.');
      return false;
    }

    this.setStatus('connecting');

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const audioTracks = stream.getAudioTracks();
      if (!audioTracks || audioTracks.length === 0) {
        stream.getTracks().forEach((track) => track.stop());
        this.setStatus(
          'error',
          'No audio track detected. When choosing a tab, make sure "Also share tab audio" is enabled.'
        );
        return false;
      }

      // Stop video track immediately to conserve CPU & GPU
      stream.getVideoTracks().forEach((track) => track.stop());

      // Initialize Web Audio Graph
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.mediaStream = stream;
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = 0.5; // Fast response for punchier transients
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;

      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeData = new Uint8Array(this.analyser.fftSize);

      this.sourceNode.connect(this.analyser);

      audioTracks[0].addEventListener('ended', () => {
        this.disconnect();
      });

      console.log('[RAFA AudioEngine] Audio stream connected. Sample rate:', this.audioContext.sampleRate);
      this.setStatus('connected');
      return true;
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
        this.setStatus('idle');
      } else {
        this.setStatus('error', err.message || 'Failed to capture browser audio.');
      }
      return false;
    }
  }

  /**
   * Helper: Asymmetric attack/release filter
   * Fast attack for punchy surges, slow release for smooth liquid return
   */
  smoothVal(current, target, dt, attackRate = 0.6, releaseRate = 0.07) {
    const rate = target > current ? attackRate : releaseRate;
    return current + (target - current) * Math.min(1.0, rate * (dt * 60));
  }

  /**
   * Called once per frame in the main animation loop.
   */
  analyzeAudio(dt) {
    if (this.status === 'connected' && this.analyser) {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      this.analyser.getByteFrequencyData(this.frequencyData);
      this.analyser.getByteTimeDomainData(this.timeData);

      // 1. Calculate true RMS volume from time domain
      let sumSquares = 0;
      const tLen = this.timeData.length;
      for (let i = 0; i < tLen; i++) {
        const norm = (this.timeData[i] - 128) / 128;
        sumSquares += norm * norm;
      }
      const rawRms = Math.sqrt(sumSquares / tLen);

      // 2. Frequency bands (at 44.1/48kHz: bin ~93Hz)
      // Low / Bass: 20Hz - 280Hz (bins 0 to 4)
      let bassSum = 0;
      for (let i = 0; i < 5; i++) {
        bassSum += this.frequencyData[i];
      }
      const rawBass = (bassSum / (5 * 255));

      // Mid: 280Hz - 2500Hz (bins 5 to 26)
      let midSum = 0;
      for (let i = 5; i < 27; i++) {
        midSum += this.frequencyData[i];
      }
      const rawMid = (midSum / (22 * 255));

      // High / Treble: 2500Hz - 12000Hz (bins 27 to 128)
      let trebleSum = 0;
      for (let i = 27; i < 129; i++) {
        trebleSum += this.frequencyData[i];
      }
      const rawTreble = (trebleSum / (102 * 255));

      // Composite instantaneous energy
      const rawEnergy = rawBass * 0.6 + rawMid * 0.28 + rawTreble * 0.12;

      // 3. Adaptive Dynamic Range Normalization
      const decay = Math.pow(0.998, dt * 60);
      this.peakBass = Math.max(0.18, this.peakBass * decay, rawBass);
      this.peakMid = Math.max(0.15, this.peakMid * decay, rawMid);
      this.peakTreble = Math.max(0.12, this.peakTreble * decay, rawTreble);
      this.peakVolume = Math.max(0.12, this.peakVolume * decay, rawRms * 2.2);

      // Enhanced contrast curves for dramatic visual distinction between quiet and loud
      const normBass = Math.min(1.0, Math.pow(rawBass / this.peakBass, 1.3));
      const normMid = Math.min(1.0, Math.pow(rawMid / this.peakMid, 1.1));
      const normTreble = Math.min(1.0, Math.pow(rawTreble / this.peakTreble, 1.15));
      const normVol = Math.min(1.0, Math.pow((rawRms * 2.2) / this.peakVolume, 1.25));
      const normEnergy = Math.min(1.0, normBass * 0.65 + normMid * 0.23 + normTreble * 0.12);

      // 4. Beat and Bass Onset Detection
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

      // Detect onset spike on either energy or sudden bass impact
      let rawTransient = 0;
      const energySpike = rawEnergy > avgEnergy * 1.22 && rawEnergy > 0.14;
      const bassSpike = rawBass > avgBass * 1.25 && rawBass > 0.18;

      if (energySpike || bassSpike) {
        const deltaE = Math.max(0, rawEnergy - avgEnergy * 1.22) * 3.8;
        const deltaB = Math.max(0, rawBass - avgBass * 1.25) * 4.2;
        rawTransient = Math.min(1.0, Math.max(deltaE, deltaB));
      }

      // 5. Asymmetric Dynamics (Fast Attack, Smooth Physical Release)
      this.smoothed.volume = this.smoothVal(this.smoothed.volume, normVol, dt, 0.5, 0.05);
      this.smoothed.bass = this.smoothVal(this.smoothed.bass, normBass, dt, 0.65, 0.06);
      this.smoothed.mid = this.smoothVal(this.smoothed.mid, normMid, dt, 0.35, 0.06);
      this.smoothed.treble = this.smoothVal(this.smoothed.treble, normTreble, dt, 0.5, 0.08);
      this.smoothed.energy = this.smoothVal(this.smoothed.energy, normEnergy, dt, 0.55, 0.06);

      // Transient bloom decay (smooth physical decay over ~0.8s)
      if (rawTransient > this.smoothed.transient) {
        this.smoothed.transient = rawTransient;
      } else {
        this.smoothed.transient *= Math.pow(0.91, dt * 60);
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

      // Diagnostic logging every 2.5s
      const now = performance.now();
      if (now - this.lastDebugLog > 2500) {
        this.lastDebugLog = now;
        console.log(
          `[RAFA Audio] Vol: ${this.metrics.volume.toFixed(2)} | Bass: ${this.metrics.bass.toFixed(2)} | Mid: ${this.metrics.mid.toFixed(2)} | Treble: ${this.metrics.treble.toFixed(2)} | Beat: ${this.metrics.transient.toFixed(2)}`
        );
      }
    } else {
      // Gentle idle breathing when no audio is streaming
      this.idlePhase += dt * 0.65;
      const breath = (Math.sin(this.idlePhase) + 1) * 0.5;

      this.metrics.volume = 0.14 + breath * 0.08;
      this.metrics.bass = 0.1 + breath * 0.1;
      this.metrics.mid = 0.15 + Math.cos(this.idlePhase * 1.2) * 0.08;
      this.metrics.treble = 0.1;
      this.metrics.energy = 0.14;
      this.metrics.transient *= 0.9;

      this.metrics.bassIntensity = this.metrics.bass;
      this.metrics.midIntensity = this.metrics.mid;
      this.metrics.trebleIntensity = this.metrics.treble;
      this.metrics.beatIntensity = this.metrics.transient;
    }

    return this.metrics;
  }

  getAudioMetrics() {
    return this.metrics;
  }

  disconnect() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    this.setStatus('idle');
  }

  destroy() {
    this.disconnect();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.statusListeners.clear();
  }
}
