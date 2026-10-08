import { useRef } from 'react';
import { Music, Radio, Disc, Video } from 'lucide-react';

export default function StartExperience({
  isStarted,
  onSelectSource,
  audioStatus,
  errorMessage,
}) {
  const localFileInputRef = useRef(null);

  if (isStarted) return null;

  const handleLocalClick = () => {
    // Open file picker directly or start with local source
    localFileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onSelectSource?.('local', files);
    } else {
      onSelectSource?.('local', null);
    }
  };

  const sources = [
    {
      id: 'local',
      title: 'Local Music',
      description: 'Play your own audio files inside RAFA.',
      badge: 'Full Controls & Playlists',
      icon: Music,
      color: '#00f3ff',
      onClick: handleLocalClick,
    },
    {
      id: 'tab',
      title: 'Browser Tab Audio',
      description: 'Stream audio directly from any browser tab.',
      badge: 'Live Tab & System Audio',
      icon: Radio,
      color: '#0084ff',
      onClick: () => onSelectSource?.('tab'),
    },
    {
      id: 'spotify',
      title: 'Spotify',
      description: 'External link & Tab Audio visualization.',
      badge: 'External / Tab Mode',
      icon: Disc,
      color: '#1db954',
      onClick: () => onSelectSource?.('spotify'),
    },
    {
      id: 'youtube',
      title: 'YouTube',
      description: 'External link & Tab Audio visualization.',
      badge: 'External / Tab Mode',
      icon: Video,
      color: '#ff0055',
      onClick: () => onSelectSource?.('youtube'),
    },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        backgroundColor: 'rgba(2, 4, 10, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '24px',
        userSelect: 'none',
      }}
    >
      {/* Hidden local file input for Local Music option */}
      <input
        ref={localFileInputRef}
        type="file"
        multiple
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: '780px',
          width: '100%',
        }}
      >
        {/* Brand Header */}
        <h1
          style={{
            fontFamily: 'var(--font-display, "Syne", sans-serif)',
            fontSize: 'clamp(52px, 8vw, 84px)',
            fontWeight: 800,
            letterSpacing: '0.14em',
            margin: '0 0 8px 0',
            color: '#ffffff',
            textShadow: '0 0 35px rgba(0, 243, 255, 0.4)',
          }}
        >
          RAFA
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-body, sans-serif)',
            fontSize: 'clamp(15px, 2.2vw, 19px)',
            color: '#8b95b0',
            letterSpacing: '0.08em',
            fontWeight: 400,
            margin: '0 0 36px 0',
          }}
        >
          Music in Motion
        </p>

        <p
          style={{
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.22em',
            color: '#5b6585',
            fontWeight: 600,
            margin: '0 0 20px 0',
          }}
        >
          Choose your music source:
        </p>

        {/* Source Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '14px',
            width: '100%',
            maxWidth: '740px',
          }}
        >
          {sources.map((src) => {
            const Icon = src.icon;
            return (
              <div
                key={src.id}
                onClick={src.onClick}
                style={{
                  background: 'rgba(8, 14, 30, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.10)',
                  borderRadius: '20px',
                  padding: '20px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '10px',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.45)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = src.color;
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = `0 14px 35px rgba(0, 0, 0, 0.6), 0 0 20px ${src.color}33`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.10)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.45)';
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: `${src.color}18`,
                    border: `1px solid ${src.color}44`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: src.color,
                  }}
                >
                  <Icon size={20} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span
                    style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      color: '#ffffff',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {src.title}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#8b95b0',
                      lineHeight: 1.35,
                    }}
                  >
                    {src.description}
                  </span>
                </div>

                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: src.color,
                    background: `${src.color}15`,
                    padding: '3px 8px',
                    borderRadius: '9999px',
                    marginTop: 'auto',
                  }}
                >
                  {src.badge}
                </span>
              </div>
            );
          })}
        </div>

        {/* Quick Demo Button */}
        <button
          onClick={() => onSelectSource?.('local', null)}
          style={{
            marginTop: '28px',
            background: 'transparent',
            border: 'none',
            color: '#6e7b9b',
            fontSize: '12px',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            padding: '6px 12px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#00f3ff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#6e7b9b')}
        >
          Or play built-in demo track →
        </button>

        {/* Status / Error Toast */}
        {errorMessage && (
          <div
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'rgba(255, 42, 133, 0.15)',
              border: '1px solid rgba(255, 42, 133, 0.35)',
              color: '#ff6b9d',
              fontSize: '12px',
            }}
          >
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}
