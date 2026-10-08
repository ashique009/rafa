import { Volume2, VolumeX, Menu, ArrowLeftRight } from 'lucide-react';
import PixluneLogo from './PixluneLogo';

export default function VisualizerOverlay({
  isStarted,
  audioStatus,
  audioEngine,
  isMobile,
  onDisconnectAudio,
  onReconnectAudio,
  onChangeSource,
  onOpenMobileMenu,
}) {
  const isConnected = audioStatus === 'connected';
  const track = audioEngine?.currentTrack || {};
  const sourceType = track.sourceType || 'local';

  let sourceLabel = 'AUDIO CONNECTED';
  if (sourceType === 'tab') {
    sourceLabel = isConnected ? 'TAB AUDIO CONNECTED' : 'TAB AUDIO IDLE';
  } else if (sourceType === 'spotify') {
    sourceLabel = 'SPOTIFY LIBRARY';
  } else if (sourceType === 'youtube') {
    sourceLabel = 'YOUTUBE MUSIC';
  } else if (!isConnected) {
    sourceLabel = 'AMBIENT FLOW';
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: isMobile ? '16px 20px' : '24px 36px',
      }}
    >
      {/* Top Header Bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          pointerEvents: 'auto',
          opacity: isStarted ? 1 : 0.95,
          transition: 'opacity 0.6s ease',
        }}
      >
        {/* Upper Left: RAFA Brand + AUDIO CONNECTED Badge + Change Source + Mute */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '16px' }}>
          <span
            style={{
              fontFamily: 'var(--font-display, "Syne", sans-serif)',
              fontSize: isMobile ? '18px' : '22px',
              fontWeight: 800,
              letterSpacing: '0.12em',
              color: '#ffffff',
              textShadow: '0 0 20px rgba(0, 243, 255, 0.4)',
            }}
          >
            RAFA
          </span>

          {/* AUDIO CONNECTED Pill Badge */}
          <div
            onClick={() => {
              if (sourceType === 'tab') {
                if (isConnected) onDisconnectAudio?.();
                else onReconnectAudio?.();
              } else {
                audioEngine?.togglePlayPause();
              }
            }}
            title={sourceType === 'tab' ? (isConnected ? 'Disconnect tab audio' : 'Connect tab audio') : 'Click to toggle playback'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: isMobile ? '4px 10px' : '6px 14px',
              borderRadius: '9999px',
              background: 'rgba(12, 16, 32, 0.65)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: isConnected
                ? '1px solid rgba(0, 243, 255, 0.35)'
                : '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: isConnected
                ? '0 0 16px rgba(0, 243, 255, 0.2)'
                : '0 4px 12px rgba(0, 0, 0, 0.3)',
              fontSize: isMobile ? '10px' : '11px',
              letterSpacing: '0.12em',
              fontWeight: 600,
              color: isConnected ? '#e0f4ff' : 'var(--text-secondary, #8b92b3)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            {/* Glowing dot */}
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isConnected ? '#00f3ff' : '#9d80e8',
                boxShadow: isConnected
                  ? '0 0 10px #00f3ff, 0 0 16px #00f3ff'
                  : '0 0 6px #9d80e8',
                transition: 'all 0.3s ease',
              }}
            />

            <span>{sourceLabel}</span>

            {/* Live equalizer wave bars inside badge */}
            {isConnected && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '2px',
                  height: '11px',
                  marginLeft: '2px',
                }}
              >
                <span className="live-bar-1" style={{ width: '2px', backgroundColor: '#00f3ff', borderRadius: '1px' }} />
                <span className="live-bar-2" style={{ width: '2px', backgroundColor: '#00f3ff', borderRadius: '1px' }} />
                <span className="live-bar-3" style={{ width: '2px', backgroundColor: '#00f3ff', borderRadius: '1px' }} />
              </div>
            )}
          </div>

          {/* Simple Change Source Button */}
          <button
            onClick={onChangeSource}
            title="Switch Music Source (Local, Tab, Spotify, YouTube)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: isMobile ? '4px 8px' : '6px 12px',
              borderRadius: '9999px',
              background: 'rgba(12, 16, 32, 0.55)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.10)',
              color: '#a0aabf',
              fontSize: isMobile ? '10px' : '11px',
              letterSpacing: '0.08em',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#00f3ff';
              e.currentTarget.style.borderColor = 'rgba(0, 243, 255, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#a0aabf';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.10)';
            }}
          >
            <ArrowLeftRight size={12} />
            <span>{!isMobile && 'Change Source'}</span>
          </button>

          {/* Header Mute/Unmute Icon */}
          <button
            onClick={() => audioEngine?.toggleMute()}
            title="Toggle Mute"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8b92b3',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '6px',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8b92b3')}
          >
            {audioEngine?.currentTrack?.isMuted ? (
              <VolumeX size={isMobile ? 16 : 18} />
            ) : (
              <Volume2 size={isMobile ? 16 : 18} />
            )}
          </button>
        </div>

        {/* Upper Right: Desktop Pixlune Logo OR Mobile Nav Controls */}
        {isMobile ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => audioEngine?.toggleMute()}
              title="Mute"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <Volume2 size={18} />
            </button>
            <button
              onClick={() => onOpenMobileMenu?.()}
              title="Menu"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <Menu size={20} />
            </button>
          </div>
        ) : (
          <PixluneLogo isMobile={isMobile} />
        )}
      </header>
    </div>
  );
}
