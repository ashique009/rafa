import { BaseAudioSource } from './BaseAudioSource';

/**
 * SpotifySource
 * Official Spotify Web API and Web Playback SDK integration.
 * Manages authentication, playlist retrieval, and official playback state.
 */
export class SpotifySource extends BaseAudioSource {
  constructor(audioEngine) {
    super('spotify', 'Spotify', audioEngine);

    this.isPlaybackControllable = true;
    this.accessToken = null;
    this.clientId = null;
    this.userPlaylists = [];
    this.selectedPlaylist = null;
    this.playlistTracks = [];
    this.currentTrackIndex = 0;
    this.player = null;
    this.deviceId = null;
    this.isAuthenticated = false;
    this.authError = '';

    this.loadPersistedAuth();
  }

  loadPersistedAuth() {
    if (typeof window === 'undefined') return;

    // Check URL hash for OAuth return token
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const tokenFromUrl = params.get('access_token');

    if (tokenFromUrl) {
      this.setAccessToken(tokenFromUrl);
      window.history.replaceState(null, '', window.location.pathname);
    } else {
      const stored = localStorage.getItem('rafa_spotify_token');
      if (stored) {
        this.accessToken = stored;
        this.isAuthenticated = true;
      }
    }
  }

  setAccessToken(token) {
    this.accessToken = token;
    this.isAuthenticated = !!token;
    if (token) {
      localStorage.setItem('rafa_spotify_token', token);
      this.fetchUserPlaylists();
      this.initWebPlaybackSDK();
    } else {
      localStorage.removeItem('rafa_spotify_token');
    }
    this.notifyTrackUpdate();
  }

  getAuthUrl(clientId, redirectUri = window.location.origin) {
    const scopes = [
      'streaming',
      'user-read-email',
      'user-read-private',
      'user-read-playback-state',
      'user-modify-playback-state',
      'playlist-read-private',
      'playlist-read-collaborative',
    ].join(' ');

    return `https://accounts.spotify.com/authorize?client_id=${encodeURIComponent(
      clientId
    )}&response_type=token&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${encodeURIComponent(scopes)}`;
  }

  async fetchUserPlaylists() {
    if (!this.accessToken) return [];

    try {
      const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=20', {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      if (res.status === 401) {
        this.setAccessToken(null);
        this.authError = 'Spotify session expired. Please reconnect.';
        return [];
      }

      const data = await res.json();
      this.userPlaylists = (data.items || []).map((pl) => ({
        id: pl.id,
        name: pl.name,
        trackCount: pl.tracks?.total || 0,
        artwork: pl.images?.[0]?.url || null,
        uri: pl.uri,
      }));

      this.notifyStateChange({ playlists: this.userPlaylists });
      return this.userPlaylists;
    } catch (err) {
      console.warn('[SpotifySource] Error fetching playlists:', err);
      this.authError = 'Failed to load Spotify playlists.';
      return [];
    }
  }

  async selectPlaylist(playlistId) {
    if (!this.accessToken) return;

    try {
      const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=30`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      const data = await res.json();
      this.playlistTracks = (data.items || [])
        .filter((item) => item.track)
        .map((item) => ({
          id: item.track.id,
          title: item.track.name,
          artist: (item.track.artists || []).map((a) => a.name).join(', '),
          artwork: item.track.album?.images?.[0]?.url || null,
          duration: Math.floor(item.track.duration_ms / 1000),
          uri: item.track.uri,
        }));

      this.currentTrackIndex = 0;
      this.selectedPlaylist = this.userPlaylists.find((p) => p.id === playlistId) || null;
      this.notifyTrackUpdate();
      this.notifyStateChange({
        selectedPlaylist: this.selectedPlaylist,
        tracks: this.playlistTracks,
      });
    } catch (err) {
      console.warn('[SpotifySource] Error fetching playlist tracks:', err);
    }
  }

  initWebPlaybackSDK() {
    if (typeof window === 'undefined' || !this.accessToken) return;

    // Load Spotify Web Playback SDK script if not already present
    if (!window.Spotify) {
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      document.body.appendChild(script);
    }

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'RAFA Music Visualizer',
        getOAuthToken: (cb) => cb(this.accessToken),
        volume: this.audioEngine.getVolume(),
      });

      player.addListener('ready', ({ device_id }) => {
        this.deviceId = device_id;
        this.audioEngine.setStatus('connected');
      });

      player.addListener('not_ready', () => {
        this.deviceId = null;
      });

      player.addListener('player_state_changed', (state) => {
        if (!state) return;
        const current = state.track_window?.current_track;
        if (current) {
          const trackInfo = {
            title: current.name,
            artist: (current.artists || []).map((a) => a.name).join(', '),
            artwork: current.album?.images?.[0]?.url || null,
            duration: Math.floor(state.duration / 1000),
            currentTime: Math.floor(state.position / 1000),
            isPlaying: !state.paused,
            volume: this.audioEngine.getVolume(),
            isMuted: this.audioEngine.isMuted(),
            sourceType: 'spotify',
          };
          this.audioEngine.currentTrack = trackInfo;
          this.notifyTrackChange(trackInfo);
        }
      });

      player.addListener('initialization_error', ({ message }) => {
        console.warn('[SpotifySource] Init error:', message);
      });

      player.addListener('authentication_error', ({ message }) => {
        this.authError = 'Spotify authentication failed. Please reconnect.';
        this.setAccessToken(null);
      });

      player.addListener('account_error', ({ message }) => {
        this.authError =
          'Spotify Premium is required for Web Playback. You can still use Browser Tab Audio to visualize Spotify!';
      });

      player.connect();
      this.player = player;
    };
  }

  notifyTrackUpdate() {
    const cur = this.playlistTracks[this.currentTrackIndex] || {
      title: this.isAuthenticated ? 'Select a Playlist' : 'Connect Spotify',
      artist: this.isAuthenticated ? 'Spotify Library' : 'Spotify Account Required',
      artwork: null,
      duration: 0,
      currentTime: 0,
    };

    const trackInfo = {
      title: cur.title,
      artist: cur.artist,
      artwork: cur.artwork,
      duration: cur.duration || 0,
      currentTime: cur.currentTime || 0,
      isPlaying: false,
      volume: this.audioEngine.getVolume(),
      isMuted: this.audioEngine.isMuted(),
      sourceType: 'spotify',
      isAuthenticated: this.isAuthenticated,
      authError: this.authError,
      playlists: this.userPlaylists,
      selectedPlaylist: this.selectedPlaylist,
      tracks: this.playlistTracks,
    };

    this.audioEngine.currentTrack = trackInfo;
    this.notifyTrackChange(trackInfo);
  }

  // --- PLAYBACK CONTROLS ---
  play() {
    if (this.player) {
      this.player.resume().catch(() => {});
    }
  }

  pause() {
    if (this.player) {
      this.player.pause().catch(() => {});
    }
  }

  togglePlayPause() {
    if (this.player) {
      this.player.togglePlay().catch(() => {});
    }
  }

  seek(timeInSeconds) {
    if (this.player) {
      this.player.seek(timeInSeconds * 1000).catch(() => {});
    }
  }

  next() {
    if (this.player) {
      this.player.nextTrack().catch(() => {});
    }
  }

  previous() {
    if (this.player) {
      this.player.previousTrack().catch(() => {});
    }
  }

  setVolume(vol) {
    if (this.player) {
      this.player.setVolume(vol).catch(() => {});
    }
  }

  disconnect() {
    if (this.player) {
      this.player.disconnect();
      this.player = null;
    }
  }
}
