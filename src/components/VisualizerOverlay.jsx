import { useState } from 'react';
import { Maximize2, Minimize2, Radio, VolumeX } from 'lucide-react';
import PixluneLogo from './PixluneLogo';

export default function VisualizerOverlay({
  isStarted,
  audioStatus,
  onDisconnectAudio,
  onReconnectAudio,
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

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
        padding: '24px 30px',
      }}
    >
      {/* Top Header Bar (Only visible after started) */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          opacity: isStarted ? 1 : 0,
          transition: 'opacity 1.0s ease',
          pointerEvents: isStarted ? 'auto' : 'none',
        }}
      >
        {/* Brand & Audio Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '18px',
              fontWeight: 800,
              letterSpacing: '0.14em',
              color: '#ffffff',
            }}
          >
            RAFA
          </span>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '11px',
              letterSpacing: '0.08em',
              color: 'var(--text-secondary)',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: audioStatus === 'connected' ? '#70a5ff' : '#9d80e8',
                boxShadow:
                  audioStatus === 'connected'
                    ? '0 0 8px rgba(112, 165, 255, 0.6)'
                    : '0 0 6px rgba(157, 128, 232, 0.4)',
              }}
            />
            <span>
              {audioStatus === 'connected' ? 'AUDIO CONNECTED' : 'AMBIENT FLOW'}
            </span>
            {audioStatus === 'connected' && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '11px', marginLeft: '4px' }}>
                <span className="live-bar-1" style={{ width: '2px', backgroundColor: '#70a5ff', borderRadius: '1px' }} />
                <span className="live-bar-2" style={{ width: '2px', backgroundColor: '#70a5ff', borderRadius: '1px' }} />
                <span className="live-bar-3" style={{ width: '2px', backgroundColor: '#70a5ff', borderRadius: '1px' }} />
              </div>
            )}
          </div>

          {/* Audio Action (Disconnect or Connect) */}
          {audioStatus === 'connected' ? (
            <button
              onClick={onDisconnectAudio}
              title="Stop audio sharing"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ff4d6d')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <VolumeX size={15} />
            </button>
          ) : (
            <button
              onClick={onReconnectAudio}
              title="Connect tab audio"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#00f3ff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <Radio size={14} />
            </button>
          )}
        </div>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          title="Toggle Fullscreen"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            transition: 'background 0.2s, color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      </header>

      {/* Pixlune subtle branding in corner */}
      <PixluneLogo />
    </div>
  );
}
