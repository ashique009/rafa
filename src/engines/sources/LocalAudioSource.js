import { BaseAudioSource } from './BaseAudioSource';

/**
 * LocalAudioSource
 * Manages real HTMLAudioElement playback, local playlist state,
 * and audio routing to the shared AudioContext AnalyserNode.
 */
export class LocalAudioSource extends BaseAudioSource {
  constructor(audioEngine) {
    super('local', 'Local Music', audioEngine);

    this.isPlaybackControllable = true;
    this.audioElement = null;
    this.sourceNode = null;

    // Playlist structure
    this.playlist = [
      {
        id: 'default-demo',
        title: 'Midnight Drive',
        artist: 'Sickick',
        artwork: null,
        duration: 238, // 3:58
        isDemoSynth: true,
      },
    ];
    this.currentIndex = 0;
    this.repeatMode = 'all'; // 'off' | 'all' | 'track'
    this.isShuffle = false;

    // Synth generator fallback when playing default demo track
    this.synthInterval = null;
    this.synthStep = 0;
    this.synthMasterGain = null;
    this.virtualCurrentTime = 84; // 1:24 default matching reference

    this.initAudioElement();
  }

  initAudioElement() {
    if (typeof window === 'undefined') return;

    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.preload = 'auto';

    this.audioElement.addEventListener('timeupdate', () => {
      this.notifyTrackUpdate();
    });

    this.audioElement.addEventListener('loadedmetadata', () => {
      const cur = this.getCurrentTrack();
      if (cur && !cur.isDemoSynth && this.audioElement.duration) {
        cur.duration = this.audioElement.duration;
      }
      this.notifyTrackUpdate();
    });

    this.audioElement.addEventListener('play', () => {
      this.audioEngine.setStatus('connected');
      this.notifyTrackUpdate();
    });

    this.audioElement.addEventListener('pause', () => {
      this.notifyTrackUpdate();
    });

    this.audioElement.addEventListener('ended', () => {
      this.handleTrackEnded();
    });

    this.audioElement.addEventListener('error', (e) => {
      console.warn('[LocalAudioSource] Audio element error:', e);
      if (this.audioElement.src && this.audioElement.src !== window.location.href) {
        this.audioEngine.setStatus('error', 'Error playing local audio file.');
      }
    });
  }

  connectToAudioContext() {
    this.audioEngine.ensureAudioContext();
    const ctx = this.audioEngine.audioContext;
    if (!ctx || !this.audioElement) return;

    // A MediaElementAudioSourceNode can ONLY be created once per HTMLAudioElement
    if (!this.sourceNode) {
      try {
        this.sourceNode = ctx.createMediaElementSource(this.audioElement);
      } catch (err) {
        console.warn('[LocalAudioSource] MediaElementSource creation warning:', err);
      }
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (e) {}

      // Route to shared AnalyserNode for spectrum & visualizer analysis
      if (this.audioEngine.analyser) {
        this.sourceNode.connect(this.audioEngine.analyser);
      }

      // Route to master GainNode for user volume and speaker output
      if (this.audioEngine.gainNode) {
        this.sourceNode.connect(this.audioEngine.gainNode);
      }
    }
  }

  getCurrentTrack() {
    return this.playlist[this.currentIndex] || this.playlist[0];
  }

  notifyTrackUpdate() {
    const cur = this.getCurrentTrack();
    if (!cur) return;

    const isSynth = !!cur.isDemoSynth;
    const currentTime = isSynth
      ? this.virtualCurrentTime
      : (this.audioElement ? this.audioElement.currentTime : 0);
    const duration = isSynth
      ? (cur.duration || 238)
      : (this.audioElement && !isNaN(this.audioElement.duration) && this.audioElement.duration > 0
          ? this.audioElement.duration
          : cur.duration || 180);
    const isPlaying = isSynth
      ? !!this.synthInterval
      : (this.audioElement ? !this.audioElement.paused && !this.audioElement.ended : false);

    const trackInfo = {
      title: cur.title,
      artist: cur.artist,
      artwork: cur.artwork,
      duration,
      currentTime,
      isPlaying,
      volume: this.audioEngine.getVolume(),
      isMuted: this.audioEngine.isMuted(),
      sourceType: 'local',
      playlistLength: this.playlist.length,
      playlistIndex: this.currentIndex,
      repeatMode: this.repeatMode,
      isShuffle: this.isShuffle,
    };

    this.audioEngine.currentTrack = trackInfo;
    this.notifyTrackChange(trackInfo);
  }

  // --- PLAYLIST MANAGEMENT ---
  addFiles(files) {
    if (!files || files.length === 0) return;

    const newTracks = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let rawName = file.name.replace(/\.[^/.]+$/, '');
      let artist = 'Local Artist';
      let title = rawName;
      if (rawName.includes(' - ')) {
        const parts = rawName.split(' - ');
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
      }

      newTracks.push({
        id: `local-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
        title,
        artist,
        artwork: null,
        file,
        src: URL.createObjectURL(file),
        duration: 0,
        isDemoSynth: false,
      });
    }

    // If first real track added, remove default synth demo if present
    if (this.playlist.length === 1 && this.playlist[0].isDemoSynth) {
      this.playlist = newTracks;
      this.currentIndex = 0;
    } else {
      this.playlist.push(...newTracks);
    }

    // Play the newly loaded track
    this.loadTrack(this.currentIndex);
    this.play();
  }

  loadTrack(index) {
    if (index < 0 || index >= this.playlist.length) return;

    this.stopSynth();
    this.currentIndex = index;
    const track = this.playlist[index];

    if (track.isDemoSynth) {
      if (this.audioElement) {
        this.audioElement.pause();
      }
      this.virtualCurrentTime = 0;
      this.notifyTrackUpdate();
      return;
    }

    if (this.audioElement && track.src) {
      this.connectToAudioContext();
      this.audioElement.src = track.src;
      this.audioElement.load();
    }
    this.notifyTrackUpdate();
  }

  handleTrackEnded() {
    if (this.repeatMode === 'track') {
      this.seek(0);
      this.play();
    } else if (this.isShuffle) {
      const nextIdx = Math.floor(Math.random() * this.playlist.length);
      this.loadTrack(nextIdx);
      this.play();
    } else if (this.currentIndex < this.playlist.length - 1) {
      this.loadTrack(this.currentIndex + 1);
      this.play();
    } else if (this.repeatMode === 'all') {
      this.loadTrack(0);
      this.play();
    } else {
      // Repeat off and finished playlist
      this.seek(0);
      this.pause();
    }
  }

  // --- PLAYBACK CONTROLS ---
  play() {
    this.audioEngine.ensureAudioContext();
    const cur = this.getCurrentTrack();

    if (cur && cur.isDemoSynth) {
      this.startSynth();
      return;
    }

    if (this.audioElement) {
      this.connectToAudioContext();
      this.audioElement.volume = 1.0;
      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.audioEngine.setStatus('connected');
            this.notifyTrackUpdate();
          })
          .catch((err) => {
            console.warn('[LocalAudioSource] Play request blocked or pending:', err);
          });
      }
    }
  }

  pause() {
    const cur = this.getCurrentTrack();
    if (cur && cur.isDemoSynth) {
      this.stopSynth();
      this.notifyTrackUpdate();
      return;
    }

    if (this.audioElement) {
      this.audioElement.pause();
      this.notifyTrackUpdate();
    }
  }

  togglePlayPause() {
    const cur = this.getCurrentTrack();
    if (cur && cur.isDemoSynth) {
      if (this.synthInterval) {
        this.pause();
      } else {
        this.play();
      }
      return;
    }

    if (this.audioElement) {
      if (this.audioElement.paused) {
        this.play();
      } else {
        this.pause();
      }
    }
  }

  seek(timeInSeconds) {
    const cur = this.getCurrentTrack();
    if (cur && cur.isDemoSynth) {
      this.virtualCurrentTime = Math.max(0, Math.min(timeInSeconds, cur.duration || 238));
      this.notifyTrackUpdate();
      return;
    }

    if (this.audioElement) {
      const dur = this.audioElement.duration || cur.duration || 180;
      this.audioElement.currentTime = Math.max(0, Math.min(timeInSeconds, dur));
      this.notifyTrackUpdate();
    }
  }

  setVolume(_vol) {
    // Volume is controlled via AudioEngine master gainNode to prevent double attenuation
    this.notifyTrackUpdate();
  }

  next() {
    if (this.playlist.length === 0) return;

    if (this.isShuffle) {
      const nextIdx = Math.floor(Math.random() * this.playlist.length);
      this.loadTrack(nextIdx);
    } else {
      const nextIdx = (this.currentIndex + 1) % this.playlist.length;
      this.loadTrack(nextIdx);
    }
    this.play();
  }

  previous() {
    if (this.playlist.length === 0) return;

    const cur = this.getCurrentTrack();
    const curTime = cur && cur.isDemoSynth
      ? this.virtualCurrentTime
      : (this.audioElement ? this.audioElement.currentTime : 0);

    // Standard player behavior: rewind to 0 if played more than 3 seconds
    if (curTime > 3.0) {
      this.seek(0);
      return;
    }

    if (this.isShuffle) {
      const prevIdx = Math.floor(Math.random() * this.playlist.length);
      this.loadTrack(prevIdx);
    } else {
      const prevIdx = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
      this.loadTrack(prevIdx);
    }
    this.play();
  }

  setShuffle(bool) {
    this.isShuffle = !!bool;
    this.notifyTrackUpdate();
  }

  setRepeat(mode) {
    // 'off' | 'all' | 'track'
    this.repeatMode = mode;
    this.notifyTrackUpdate();
  }

  toggleRepeat() {
    if (this.repeatMode === 'off') {
      this.setRepeat('all');
    } else if (this.repeatMode === 'all') {
      this.setRepeat('track');
    } else {
      this.setRepeat('off');
    }
  }

  // --- SYNTHWAVE DEMO ENGINE (fallback when no local files uploaded yet) ---
  startSynth() {
    this.stopSynth();
    const ctx = this.audioEngine.audioContext;
    if (!ctx) return;

    if (!this.synthMasterGain) {
      this.synthMasterGain = ctx.createGain();
      this.synthMasterGain.gain.setValueAtTime(0.75, ctx.currentTime);
      this.synthMasterGain.connect(this.audioEngine.analyser);
      if (this.audioEngine.gainNode) {
        this.synthMasterGain.connect(this.audioEngine.gainNode);
      }
    }

    const stepDuration = 0.125; // 120 BPM 16th note
    const bassNotes = [36, 36, 48, 36, 41, 41, 48, 41, 43, 43, 48, 43, 39, 39, 48, 39];
    const chordFrequencies = [
      [130.81, 155.56, 196.00],
      [116.54, 146.83, 174.61],
      [103.83, 130.81, 155.56],
      [123.47, 146.83, 185.00],
    ];

    this.synthInterval = setInterval(() => {
      const c = this.audioEngine.audioContext;
      if (!c || c.state === 'closed') return;
      const t = c.currentTime;
      const s = this.synthStep % 16;
      this.synthStep++;

      this.virtualCurrentTime = (this.virtualCurrentTime + stepDuration) % 238;
      if (this.synthStep % 4 === 0) {
        this.notifyTrackUpdate();
      }

      // 1. Kick
      if (s % 4 === 0) {
        const kickOsc = c.createOscillator();
        const kickGain = c.createGain();
        kickOsc.frequency.setValueAtTime(140, t);
        kickOsc.frequency.exponentialRampToValueAtTime(38, t + 0.12);
        kickGain.gain.setValueAtTime(0.9, t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
        kickOsc.connect(kickGain);
        kickGain.connect(this.synthMasterGain);
        kickOsc.start(t);
        kickOsc.stop(t + 0.35);
      }

      // 2. Snare
      if (s === 4 || s === 12) {
        const bufferSize = c.sampleRate * 0.12;
        const noiseBuffer = c.createBuffer(1, bufferSize, c.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const whiteNoise = c.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        const filter = c.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1000, t);
        const snareGain = c.createGain();
        snareGain.gain.setValueAtTime(0.40, t);
        snareGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        whiteNoise.connect(filter);
        filter.connect(snareGain);
        snareGain.connect(this.synthMasterGain);
        whiteNoise.start(t);
      }

      // 3. Hi-hat
      if (s % 2 === 1) {
        const bufferSize = c.sampleRate * 0.04;
        const noiseBuffer = c.createBuffer(1, bufferSize, c.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const hat = c.createBufferSource();
        hat.buffer = noiseBuffer;
        const filter = c.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(8000, t);
        const hatGain = c.createGain();
        hatGain.gain.setValueAtTime(0.20, t);
        hatGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        hat.connect(filter);
        filter.connect(hatGain);
        hatGain.connect(this.synthMasterGain);
        hat.start(t);
      }

      // 4. Bass
      const midiNote = bassNotes[s];
      const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
      const bassOsc = c.createOscillator();
      const bassFilter = c.createBiquadFilter();
      const bassGain = c.createGain();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(freq, t);
      bassFilter.type = 'lowpass';
      bassFilter.frequency.setValueAtTime(500, t);
      bassGain.gain.setValueAtTime(0.45, t);
      bassGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(this.synthMasterGain);
      bassOsc.start(t);
      bassOsc.stop(t + 0.13);

      // 5. Synth Chords
      if (s % 4 === 0) {
        const chordIdx = Math.floor(this.synthStep / 16) % 4;
        const chord = chordFrequencies[chordIdx];
        chord.forEach((cFreq, cIdx) => {
          const padOsc = c.createOscillator();
          const padGain = c.createGain();
          const padFilter = c.createBiquadFilter();
          padOsc.type = 'sawtooth';
          padOsc.frequency.setValueAtTime(cFreq * 2, t);
          padFilter.type = 'lowpass';
          padFilter.frequency.setValueAtTime(850 + cIdx * 250, t);
          padGain.gain.setValueAtTime(0.10, t);
          padGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
          padOsc.connect(padFilter);
          padFilter.connect(padGain);
          padGain.connect(this.synthMasterGain);
          padOsc.start(t);
          padOsc.stop(t + 0.48);
        });
      }
    }, stepDuration * 1000);

    this.audioEngine.setStatus('connected');
    this.notifyTrackUpdate();
  }

  stopSynth() {
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
  }

  disconnect() {
    this.pause();
    this.stopSynth();
    if (this.audioElement) {
      this.audioElement.pause();
    }
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (err) {}
      // Keep this.sourceNode reference intact so it can be reconnected without InvalidStateError
    }
  }
}
