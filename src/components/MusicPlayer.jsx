import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  MoreHorizontal,
  Volume2,
  VolumeX,
  Plus,
  Radio,
  ListMusic,
  ArrowLeftRight,
  ExternalLink,
} from 'lucide-react';
import AlbumArt from './AlbumArt';
import FrequencyGraph from './FrequencyGraph';

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function MusicPlayer({
  audioEngine,
  isMobile = false,
  onChangeSource,
  onOpenTabAudio,
}) {
  const [track, setTrack] = useState({
    title: 'Midnight Drive',
    artist: 'Sickick',
    artwork: null,
    duration: 238,
    currentTime: 84,
    isPlaying: false,
    volume: 0.8,
    isMuted: false,
    sourceType: 'local',
    repeatMode: 'all',
    isShuffle: false,
    playlistLength: 1,
    playlistIndex: 0,
  });

  const [isLiked, setIsLiked] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);

  const fileInputRef = useRef(null);
  const progressBarRef = useRef(null);

  // Sync with AudioEngine track state
  useEffect(() => {
    if (!audioEngine) return;
    const unsub = audioEngine.onTrackChange((t) => {
      setTrack((prev) => ({ ...prev, ...t }));
    });
    return unsub;
  }, [audioEngine]);

  // Handle Play / Pause
  const togglePlay = useCallback(() => {
    if (!audioEngine) return;
    audioEngine.togglePlayPause();
  }, [audioEngine]);

  // Handle Volume change
  const handleVolumeChange = useCallback(
    (e) => {
      const val = parseFloat(e.target.value);
      audioEngine?.setVolume(val);
    },
    [audioEngine]
  );

  const toggleMute = useCallback(() => {
    audioEngine?.toggleMute();
  }, [audioEngine]);

  // Handle Local Music file selection (supports multiple files)
  const handleAddMusicClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0 && audioEngine) {
      audioEngine.addLocalFiles(files);
      setShowMenu(false);
    }
  };

  // Progress Bar scrubbing
  const calculateProgressFromEvent = useCallback((e) => {
    const bar = progressBarRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio;
  }, []);

  const handleProgressMouseDown = useCallback(
    (e) => {
      setIsDraggingProgress(true);
      const ratio = calculateProgressFromEvent(e);
      setDragProgress(ratio);

      const onMouseMove = (moveEvent) => {
        const moveRatio = calculateProgressFromEvent(moveEvent);
        setDragProgress(moveRatio);
      };

      const onMouseUp = (upEvent) => {
        const upRatio = calculateProgressFromEvent(upEvent);
        setIsDraggingProgress(false);
        if (audioEngine) {
          const targetTime = upRatio * (track.duration || 1);
          audioEngine.seek(targetTime);
        }
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('touchmove', onMouseMove);
        window.removeEventListener('touchend', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onMouseMove);
      window.addEventListener('touchend', onMouseUp);
    },
    [audioEngine, calculateProgressFromEvent, track.duration]
  );

  const currentRatio = isDraggingProgress
    ? dragProgress
    : track.duration > 0
    ? Math.min(1, Math.max(0, track.currentTime / track.duration))
    : 0.353;

  const displayCurrentTime = isDraggingProgress
    ? dragProgress * (track.duration || 238)
    : track.currentTime;

  const isTabAudio = track.sourceType === 'tab';
  const isSpotify = track.sourceType === 'spotify';
  const isYouTube = track.sourceType === 'youtube';

  const localSource = audioEngine?.getSource('local');
  const playlistTracks = localSource?.playlist || [];

  return (
    <aside
      aria-label="Music Player"
      className="glass-player"
      style={{
        position: 'absolute',
        zIndex: 40,
        pointerEvents: 'auto',
        ...(isMobile
          ? {
              bottom: '16px',
              left: '12px',
              right: '12px',
              maxWidth: '430px',
              margin: '0 auto',
              padding: '14px 16px',
              borderRadius: '24px',
            }
          : {
              top: 'clamp(72px, 9.5vh, 98px)',
              left: 'clamp(24px, 3.2vw, 42px)',
              width: 'clamp(285px, 22.5vw, 325px)',
              padding: '18px 20px',
              borderRadius: '24px',
            }),
        background: 'rgba(6, 10, 24, 0.65)',
        backdropFilter: 'blur(30px) saturate(180%)',
        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow:
          '0 24px 60px rgba(0, 0, 0, 0.70), 0 0 35px rgba(0, 243, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.16)',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '10px' : '13px',
        color: '#ffffff',
        userSelect: 'none',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Hidden file input for Local Music files */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* TOP ROW: Album Artwork + Song Title + Artist + Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <AlbumArt src={track.artwork} size={isMobile ? 44 : 50} />

          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontSize: isMobile ? '14px' : '15px',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={track.title}
            >
              {track.title}
            </h2>
            <span
              style={{
                fontSize: isMobile ? '11px' : '12px',
                color: '#8a95b0',
                fontWeight: 400,
                letterSpacing: '0.01em',
                marginTop: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {track.artist}
            </span>
          </div>
        </div>

        {/* Heart & More Options */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
          <button
            onClick={() => setIsLiked(!isLiked)}
            title={isLiked ? 'Unlike' : 'Like'}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isLiked ? '#ff2a85' : '#8a95b0',
              transition: 'all 0.2s ease',
              filter: isLiked ? 'drop-shadow(0 0 6px rgba(255, 42, 133, 0.6))' : 'none',
            }}
          >
            <Heart size={isMobile ? 16 : 18} fill={isLiked ? '#ff2a85' : 'none'} />
          </button>

          <button
            onClick={() => setShowMenu(!showMenu)}
            title="Options & Sources"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8a95b0',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8a95b0')}
          >
            <MoreHorizontal size={isMobile ? 16 : 18} />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '6px',
                width: '200px',
                background: 'rgba(12, 16, 32, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '14px',
                padding: '6px',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.65)',
                zIndex: 60,
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
              }}
            >
              <button
                onClick={handleAddMusicClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  color: '#ffffff',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 243, 255, 0.15)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Plus size={14} color="#00f3ff" />
                <span>Add Local Music</span>
              </button>

              <button
                onClick={() => {
                  setShowPlaylist(!showPlaylist);
                  setShowMenu(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  color: '#ffffff',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 243, 255, 0.15)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <ListMusic size={14} color="#00d2ff" />
                <span>View Playlist ({playlistTracks.length})</span>
              </button>

              <button
                onClick={() => {
                  onChangeSource?.();
                  setShowMenu(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  color: '#ffffff',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(157, 0, 255, 0.15)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <ArrowLeftRight size={14} color="#b5179e" />
                <span>Change Music Source</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PLAYLIST DRAWER POPUP */}
      {showPlaylist && (
        <div
          style={{
            background: 'rgba(8, 12, 26, 0.95)',
            border: '1px solid rgba(0, 243, 255, 0.2)',
            borderRadius: '14px',
            padding: '10px',
            maxHeight: '180px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '4px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '11px',
              color: '#8a95b0',
            }}
          >
            <span>LOCAL PLAYLIST</span>
            <button
              onClick={() => setShowPlaylist(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8a95b0',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              ✕
            </button>
          </div>
          {playlistTracks.map((item, idx) => (
            <div
              key={item.id || idx}
              onClick={() => {
                localSource?.loadTrack(idx);
                localSource?.play();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: '8px',
                cursor: 'pointer',
                background:
                  idx === track.playlistIndex
                    ? 'rgba(0, 243, 255, 0.12)'
                    : 'transparent',
                borderLeft:
                  idx === track.playlistIndex
                    ? '2px solid #00f3ff'
                    : '2px solid transparent',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: idx === track.playlistIndex ? 700 : 400,
                    color: idx === track.playlistIndex ? '#00f3ff' : '#ffffff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.title}
                </span>
                <span style={{ fontSize: '10px', color: '#8a95b0' }}>{item.artist}</span>
              </div>
              <span
                style={{
                  fontSize: '10px',
                  color: '#8a95b0',
                  fontFamily: 'monospace',
                }}
              >
                {formatTime(item.duration)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* CONDITIONAL CONTROLS BASED ON SOURCE TYPE */}
      {isTabAudio ? (
        /* TAB AUDIO: VISUALIZATION MODE (External tab owns playback) */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '6px 0',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              borderRadius: '10px',
              background: 'rgba(0, 243, 255, 0.08)',
              border: '1px solid rgba(0, 243, 255, 0.20)',
            }}
          >
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: '#00f3ff',
                textTransform: 'uppercase',
              }}
            >
              TAB AUDIO VISUALIZATION MODE
            </span>
            <span
              style={{
                fontSize: '10px',
                color: '#8a95b0',
              }}
            >
              LIVE
            </span>
          </div>

          <p
            style={{
              fontSize: '11px',
              color: '#8a95b0',
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            Audio streamed from external browser tab. Use original tab to control playback.
          </p>

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              onClick={() => audioEngine?.disconnectTabAudio()}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(255, 42, 133, 0.15)',
                border: '1px solid rgba(255, 42, 133, 0.4)',
                color: '#ff6b9d',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Stop Sharing
            </button>
            <button
              onClick={onChangeSource}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(0, 243, 255, 0.12)',
                border: '1px solid rgba(0, 243, 255, 0.35)',
                color: '#00f3ff',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Change Source
            </button>
          </div>
        </div>
      ) : isSpotify ? (
        /* SPOTIFY INTEGRATION MODE */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              padding: '8px 10px',
              borderRadius: '10px',
              background: 'rgba(29, 185, 84, 0.10)',
              border: '1px solid rgba(29, 185, 84, 0.30)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#1db954',
                letterSpacing: '0.08em',
              }}
            >
              SPOTIFY INTEGRATION
            </span>
            <a
              href="https://open.spotify.com"
              target="_blank"
              rel="noreferrer"
              style={{
                color: '#1db954',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                textDecoration: 'none',
              }}
            >
              <span>Open Web Player</span>
              <ExternalLink size={10} />
            </a>
          </div>

          <p style={{ fontSize: '11px', color: '#8a95b0', margin: 0, lineHeight: 1.4 }}>
            For real-time spectrum analysis of Spotify audio playing on your computer, choose Browser Tab Audio from Change Source!
          </p>

          <button
            onClick={onChangeSource}
            style={{
              padding: '8px',
              borderRadius: '8px',
              background: 'rgba(0, 243, 255, 0.12)',
              border: '1px solid rgba(0, 243, 255, 0.35)',
              color: '#00f3ff',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Change Music Source
          </button>
        </div>
      ) : isYouTube ? (
        /* YOUTUBE INTEGRATION MODE */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              padding: '8px 10px',
              borderRadius: '10px',
              background: 'rgba(255, 0, 85, 0.10)',
              border: '1px solid rgba(255, 0, 85, 0.30)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#ff2a85',
                letterSpacing: '0.08em',
              }}
            >
              YOUTUBE MUSIC
            </span>
            <a
              href="https://music.youtube.com"
              target="_blank"
              rel="noreferrer"
              style={{
                color: '#ff2a85',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                textDecoration: 'none',
              }}
            >
              <span>Open in YouTube</span>
              <ExternalLink size={10} />
            </a>
          </div>

          <p style={{ fontSize: '11px', color: '#8a95b0', margin: 0, lineHeight: 1.4 }}>
            To stream YouTube Music live into the RAFA visualizer with full FFT spectrum analysis, choose Browser Tab Audio!
          </p>

          <button
            onClick={onChangeSource}
            style={{
              padding: '8px',
              borderRadius: '8px',
              background: 'rgba(0, 243, 255, 0.12)',
              border: '1px solid rgba(0, 243, 255, 0.35)',
              color: '#00f3ff',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Change Music Source
          </button>
        </div>
      ) : (
        /* LOCAL AUDIO & BUILT-IN PLAYER CONTROLS (FULL CONTROLS) */
        <>
          {/* Progress Bar with Timestamps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div
              ref={progressBarRef}
              onMouseDown={handleProgressMouseDown}
              onTouchStart={handleProgressMouseDown}
              style={{
                position: 'relative',
                width: '100%',
                height: '14px',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              {/* Background Track */}
              <div
                style={{
                  width: '100%',
                  height: '3px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Active Progress Fill (Cyan to Bright Blue) */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: `${currentRatio * 100}%`,
                    background: '#00f3ff',
                    boxShadow: '0 0 10px rgba(0, 243, 255, 0.65)',
                    borderRadius: '9999px',
                  }}
                />
              </div>

              {/* Draggable Glowing Knob */}
              <div
                style={{
                  position: 'absolute',
                  left: `${currentRatio * 100}%`,
                  transform: 'translateX(-50%)',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  boxShadow:
                    '0 0 8px rgba(0, 243, 255, 0.95), 0 0 14px rgba(0, 243, 255, 0.6)',
                  pointerEvents: 'none',
                  transition: isDraggingProgress ? 'none' : 'left 0.1s linear',
                }}
              />
            </div>

            {/* Timestamps */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#8a95b0',
                fontFamily: 'var(--font-mono, monospace)',
                letterSpacing: '0.02em',
              }}
            >
              <span>{formatTime(displayCurrentTime)}</span>
              <span>{formatTime(track.duration || 238)}</span>
            </div>
          </div>

          {/* Playback Controls (Shuffle, Prev, Glowing Circular Play/Pause, Next, Repeat) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 4px',
            }}
          >
            {/* Shuffle */}
            <button
              onClick={() => audioEngine?.setShuffle(!track.isShuffle)}
              title={track.isShuffle ? 'Shuffle On' : 'Shuffle Off'}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: track.isShuffle ? '#00f3ff' : '#8a95b0',
                transition: 'color 0.2s',
              }}
            >
              <Shuffle size={isMobile ? 15 : 17} />
            </button>

            {/* Previous */}
            <button
              onClick={() => audioEngine?.previous()}
              title="Previous"
              style={{
                background: 'transparent',
                border: 'none',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d0d8ea',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#d0d8ea')}
            >
              <SkipBack size={isMobile ? 18 : 20} fill="#d0d8ea" />
            </button>

            {/* Circular Play/Pause Button with Glowing Neon Cyan Ring */}
            <button
              onClick={togglePlay}
              title={track.isPlaying ? 'Pause' : 'Play'}
              style={{
                width: isMobile ? '44px' : '48px',
                height: isMobile ? '44px' : '48px',
                borderRadius: '50%',
                background: 'rgba(8, 14, 32, 0.85)',
                border: '2px solid #00f3ff',
                boxShadow:
                  '0 0 18px rgba(0, 243, 255, 0.45), inset 0 0 10px rgba(0, 243, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#ffffff',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: 'scale(1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.06)';
                e.currentTarget.style.boxShadow =
                  '0 0 24px rgba(0, 243, 255, 0.65), inset 0 0 14px rgba(0, 243, 255, 0.40)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow =
                  '0 0 18px rgba(0, 243, 255, 0.45), inset 0 0 10px rgba(0, 243, 255, 0.25)';
              }}
            >
              {track.isPlaying ? (
                <Pause size={isMobile ? 18 : 20} fill="#ffffff" />
              ) : (
                <Play
                  size={isMobile ? 18 : 20}
                  fill="#ffffff"
                  style={{ marginLeft: '2px' }}
                />
              )}
            </button>

            {/* Next */}
            <button
              onClick={() => audioEngine?.next()}
              title="Next"
              style={{
                background: 'transparent',
                border: 'none',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d0d8ea',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#d0d8ea')}
            >
              <SkipForward size={isMobile ? 18 : 20} fill="#d0d8ea" />
            </button>

            {/* Repeat */}
            <button
              onClick={() => audioEngine?.toggleRepeat()}
              title={`Repeat: ${track.repeatMode}`}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: track.repeatMode !== 'off' ? '#00f3ff' : '#8a95b0',
                transition: 'color 0.2s',
                position: 'relative',
              }}
            >
              {track.repeatMode === 'track' ? (
                <Repeat1 size={isMobile ? 15 : 17} />
              ) : (
                <Repeat size={isMobile ? 15 : 17} />
              )}
            </button>
          </div>
        </>
      )}

      {/* Real-time Neon Frequency Spectrum (32 vertical bars) */}
      <div style={{ marginTop: '2px' }}>
        <FrequencyGraph
          audioEngine={audioEngine}
          height={isMobile ? 38 : 46}
          numBars={32}
        />
      </div>

      {/* Volume Control */}
      {!isMobile && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            paddingTop: '2px',
          }}
        >
          <button
            onClick={toggleMute}
            title={track.isMuted ? 'Unmute' : 'Mute'}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8a95b0',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8a95b0')}
          >
            {track.isMuted || track.volume === 0 ? (
              <VolumeX size={16} />
            ) : (
              <Volume2 size={16} />
            )}
          </button>

          {/* Volume slider */}
          <div
            style={{
              position: 'relative',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={track.isMuted ? 0 : track.volume}
              onChange={handleVolumeChange}
              style={{
                width: '100%',
                height: '3px',
                appearance: 'none',
                WebkitAppearance: 'none',
                background: `linear-gradient(90deg, #00f3ff ${
                  (track.isMuted ? 0 : track.volume) * 100
                }%, rgba(255, 255, 255, 0.12) ${
                  (track.isMuted ? 0 : track.volume) * 100
                }%)`,
                borderRadius: '9999px',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
          </div>

          {/* Volume percentage */}
          <span
            style={{
              fontSize: '12px',
              color: '#8a95b0',
              fontFamily: 'var(--font-mono, monospace)',
              minWidth: '22px',
              textAlign: 'right',
            }}
          >
            {Math.round((track.isMuted ? 0 : track.volume) * 100)}
          </span>
        </div>
      )}
    </aside>
  );
}
