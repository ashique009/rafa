/**
 * BaseAudioSource
 * Abstract interface for all RAFA audio sources:
 * - LocalAudioSource (HTML5 Audio + local playlist)
 * - TabAudioSource (Browser Tab getDisplayMedia MediaStream)
 * - SpotifySource (Official Spotify Web API / Playback SDK)
 * - YouTubeSource (Official YouTube API / IFrame Player)
 */
export class BaseAudioSource {
  constructor(id, name, audioEngine) {
    this.id = id;
    this.name = name;
    this.audioEngine = audioEngine;
    this.isPlaybackControllable = true;
    this.trackListeners = new Set();
    this.stateListeners = new Set();
  }

  onTrackChange(fn) {
    this.trackListeners.add(fn);
    return () => this.trackListeners.delete(fn);
  }

  notifyTrackChange(trackInfo) {
    for (const fn of this.trackListeners) {
      try {
        fn(trackInfo);
      } catch (err) {
        console.error(`[${this.name}] Track change listener error:`, err);
      }
    }
  }

  onStateChange(fn) {
    this.stateListeners.add(fn);
    return () => this.stateListeners.delete(fn);
  }

  notifyStateChange(state) {
    for (const fn of this.stateListeners) {
      try {
        fn(state);
      } catch (err) {
        console.error(`[${this.name}] State change listener error:`, err);
      }
    }
  }

  // --- Common Interface ---
  play() {}
  pause() {}
  togglePlayPause() {}
  seek(_timeInSeconds) {}
  setVolume(_fraction) {}
  next() {}
  previous() {}
  setShuffle(_isShuffle) {}
  setRepeat(_repeatMode) {} // 'off' | 'all' | 'track'
  getMetadata() {
    return {
      title: 'Unknown Title',
      artist: 'Unknown Artist',
      artwork: null,
      duration: 0,
      currentTime: 0,
      isPlaying: false,
      volume: 0.8,
      sourceType: this.id,
    };
  }
  disconnect() {}
}
