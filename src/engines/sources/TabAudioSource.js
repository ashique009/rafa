import { BaseAudioSource } from './BaseAudioSource';

/**
 * TabAudioSource
 * Captures browser tab or system audio via getDisplayMedia for visualization.
 * Note: Visualization-only mode; source tab owns playback controls.
 */
export class TabAudioSource extends BaseAudioSource {
  constructor(audioEngine) {
    super('tab', 'Browser Tab Audio', audioEngine);
    this.isPlaybackControllable = false;
    this.mediaStream = null;
    this.sourceNode = null;
    this.audioTrack = null;
  }

  async connect() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      this.audioEngine.setStatus(
        'error',
        'Browser tab audio capture is not supported on this browser.'
      );
      return false;
    }

    this.audioEngine.setStatus('connecting');

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
        stream.getTracks().forEach((t) => t.stop());
        this.audioEngine.setStatus(
          'error',
          'No audio track detected. When choosing a tab, make sure "Also share tab audio" is checked.'
        );
        return false;
      }

      // Stop video track immediately to save CPU and battery
      stream.getVideoTracks().forEach((t) => t.stop());

      this.audioEngine.ensureAudioContext();
      const ctx = this.audioEngine.audioContext;

      this.mediaStream = stream;
      this.audioTrack = audioTracks[0];

      // Route audio stream to shared AnalyserNode for visualization
      this.sourceNode = ctx.createMediaStreamSource(stream);
      this.sourceNode.connect(this.audioEngine.analyser);

      // Listen for browser tab share stop event
      this.audioTrack.addEventListener('ended', () => {
        this.handleCaptureEnded();
      });

      this.audioEngine.setStatus('connected');
      this.notifyTrackUpdate(true);
      return true;
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
        this.audioEngine.setStatus('idle');
      } else {
        this.audioEngine.setStatus(
          'error',
          err.message || 'Failed to capture browser tab audio.'
        );
      }
      return false;
    }
  }

  handleCaptureEnded() {
    this.disconnect();
    this.audioEngine.setStatus('idle', 'Browser tab sharing stopped.');
    this.notifyTrackUpdate(false);
    this.audioEngine.setSource('local');
  }

  notifyTrackUpdate(isActive = true) {
    const trackInfo = {
      title: 'Browser Tab Audio',
      artist: 'Live Audio Visualization Mode',
      artwork: null,
      duration: 0,
      currentTime: 0,
      isPlaying: isActive,
      volume: this.audioEngine.getVolume(),
      isMuted: this.audioEngine.isMuted(),
      sourceType: 'tab',
      isPlaybackControllable: false,
      tabNote: 'Audio streamed from external browser tab. Use original tab to control playback.',
    };

    this.audioEngine.currentTrack = trackInfo;
    this.notifyTrackChange(trackInfo);
  }

  // Playback control placeholders (external tab controls playback)
  play() {}
  pause() {}
  togglePlayPause() {}
  seek(_time) {}
  next() {}
  previous() {}
  setShuffle(_bool) {}
  setRepeat(_mode) {}

  setVolume(vol) {
    this.audioEngine.setMasterVolume(vol);
  }

  disconnect() {
    if (this.audioTrack) {
      this.audioTrack.stop();
      this.audioTrack = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (err) {}
      this.sourceNode = null;
    }
  }
}
