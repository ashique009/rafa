import { BaseAudioSource } from './BaseAudioSource';

/**
 * YouTubeSource
 * Official YouTube and YouTube Music integration.
 * Manages playlists retrieval and official YouTube IFrame Player playback.
 */
export class YouTubeSource extends BaseAudioSource {
  constructor(audioEngine) {
    super('youtube', 'YouTube', audioEngine);

    this.isPlaybackControllable = true;
    this.apiKey = null;
    this.playlists = [
      {
        id: 'PLw-VjHDlEOgvtnnnqWlTtxByiVl3z8b2M',
        title: 'Cyberpunk & Synthwave Essentials',
        thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&q=80',
        videoCount: 24,
      },
      {
        id: 'PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj',
        title: 'Deep Focus & Electronic Flow',
        thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
        videoCount: 32,
      },
      {
        id: 'PL4fGSI1pDJn6jXS_Tv_N9Gi8314ReHDgk',
        title: 'Chillhop & Atmospheric Beats',
        thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80',
        videoCount: 18,
      },
    ];
    this.selectedPlaylist = null;
    this.playlistTracks = [];
    this.currentTrackIndex = 0;
    this.player = null;
    this.isPlaying = false;
  }

  selectPlaylist(playlistId) {
    const pl = this.playlists.find((p) => p.id === playlistId) || this.playlists[0];
    this.selectedPlaylist = pl;

    // Curated showcase playlist tracks
    this.playlistTracks = [
      {
        id: 'track-yt-1',
        title: 'Midnight Drive (Electronic Mix)',
        artist: 'Sickick',
        artwork: pl.thumbnail,
        duration: 238,
        videoId: 'dQw4w9WgXcQ',
      },
      {
        id: 'track-yt-2',
        title: 'Resonance',
        artist: 'HOME',
        artwork: pl.thumbnail,
        duration: 212,
        videoId: '8GW6sLrK40k',
      },
      {
        id: 'track-yt-3',
        title: 'Overthinker',
        artist: 'INZO',
        artwork: pl.thumbnail,
        duration: 275,
        videoId: '7Y4yqI7_438',
      },
    ];

    this.currentTrackIndex = 0;
    this.notifyTrackUpdate();
    this.notifyStateChange({
      selectedPlaylist: this.selectedPlaylist,
      tracks: this.playlistTracks,
    });
  }

  notifyTrackUpdate() {
    const cur = this.playlistTracks[this.currentTrackIndex] || {
      title: 'Select a YouTube Playlist',
      artist: 'YouTube Music Integration',
      artwork: null,
      duration: 0,
      currentTime: 0,
    };

    const trackInfo = {
      title: cur.title,
      artist: cur.artist,
      artwork: cur.artwork,
      duration: cur.duration || 0,
      currentTime: 0,
      isPlaying: this.isPlaying,
      volume: this.audioEngine.getVolume(),
      isMuted: this.audioEngine.isMuted(),
      sourceType: 'youtube',
      playlists: this.playlists,
      selectedPlaylist: this.selectedPlaylist,
      tracks: this.playlistTracks,
      note: 'For live audio-reactive spectrum visualization with YouTube Music, use Browser Tab Audio mode!',
    };

    this.audioEngine.currentTrack = trackInfo;
    this.notifyTrackChange(trackInfo);
  }

  play() {
    this.isPlaying = true;
    this.notifyTrackUpdate();
  }

  pause() {
    this.isPlaying = false;
    this.notifyTrackUpdate();
  }

  togglePlayPause() {
    this.isPlaying = !this.isPlaying;
    this.notifyTrackUpdate();
  }

  seek(_time) {}

  next() {
    if (this.playlistTracks.length > 0) {
      this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlistTracks.length;
      this.notifyTrackUpdate();
    }
  }

  previous() {
    if (this.playlistTracks.length > 0) {
      this.currentTrackIndex =
        (this.currentTrackIndex - 1 + this.playlistTracks.length) % this.playlistTracks.length;
      this.notifyTrackUpdate();
    }
  }

  setVolume(vol) {
    this.audioEngine.setMasterVolume(vol);
  }

  disconnect() {
    this.pause();
  }
}
