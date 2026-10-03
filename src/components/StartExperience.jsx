import { useState } from 'react';
import { Play } from 'lucide-react';

export default function StartExperience({
  onStart,
  isStarted,
  audioStatus,
  errorMessage,
  onRetryAudio,
  onContinueAmbient,
}) {
  const [isHovered, setIsHovered] = useState(false);

  if (isStarted) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 40,
        pointerEvents: isStarted ? 'none' : 'auto',
        transition: 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: isStarted ? 0 : 1,
        transform: isStarted ? 'scale(0.97) translateY(-16px)' : 'scale(1) translateY(0)',
      }}
    >
      {/* Soft atmospheric background glow */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          width: '560px',
          height: '280px',
          borderRadius: '50%',
          background: isHovered
            ? 'radial-gradient(ellipse at center, rgba(100, 140, 255, 0.14) 0%, rgba(130, 80, 220, 0.08) 50%, transparent 75%)'
            : 'radial-gradient(ellipse at center, rgba(80, 100, 200, 0.08) 0%, rgba(100, 60, 180, 0.04) 50%, transparent 75%)',
          filter: 'blur(60px)',
          transition: 'all 0.8s ease',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 24px',
          maxWidth: '640px',
          position: 'relative',
        }}
      >
        {/* Main Title: RAFA */}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(56px, 10vw, 96px)',
            fontWeight: 800,
            letterSpacing: '0.14em',
            lineHeight: 1,
            margin: '0 0 16px 0',
            background: 'linear-gradient(180deg, #ffffff 0%, #d8e0ff 60%, #9ba5e0 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 40px rgba(160, 180, 255, 0.2)',
          }}
        >
          RAFA
        </h1>

        {/* Subtitle: Music in motion. */}
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(16px, 2.2vw, 20px)',
            color: 'var(--text-secondary)',
            letterSpacing: '0.05em',
            fontWeight: 400,
            marginBottom: '46px',
            opacity: 0.85,
          }}
        >
          Music in motion.
        </p>

        {/* Action Button & Status */}
        {audioStatus === 'connecting' ? (
          <div
            style={{
              padding: '16px 36px',
              borderRadius: '9999px',
              background: 'rgba(18, 20, 36, 0.6)',
              border: '1px solid rgba(130, 160, 255, 0.3)',
              fontSize: '12px',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#c2d4ff',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 0 30px rgba(100, 140, 255, 0.15)',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#9bb8ff',
                boxShadow: '0 0 10px #9bb8ff',
                animation: 'pulse 1.4s infinite alternate',
              }}
            />
            CONNECTING AUDIO...
          </div>
        ) : audioStatus === 'error' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <p
              style={{
                fontSize: '13px',
                color: '#e288a2',
                maxWidth: '420px',
                lineHeight: 1.5,
                letterSpacing: '0.02em',
              }}
            >
              {errorMessage || 'Audio capture cancelled or unavailable.'}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={onRetryAudio}
                style={{
                  padding: '12px 24px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  letterSpacing: '0.14em',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: '#ffffff',
                  background: 'rgba(100, 140, 255, 0.2)',
                  border: '1px solid rgba(130, 170, 255, 0.4)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                RETRY AUDIO
              </button>
              <button
                onClick={onContinueAmbient}
                style={{
                  padding: '12px 24px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  letterSpacing: '0.14em',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                CONTINUE AMBIENT
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onStart}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px',
              padding: '18px 46px',
              fontSize: '12px',
              letterSpacing: '0.26em',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: isHovered ? '#ffffff' : '#d2d8f0',
              background: isHovered
                ? 'rgba(24, 26, 46, 0.7)'
                : 'rgba(14, 16, 28, 0.5)',
              border: isHovered
                ? '1px solid rgba(160, 180, 255, 0.5)'
                : '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '9999px',
              cursor: 'pointer',
              boxShadow: isHovered
                ? '0 0 35px rgba(100, 140, 255, 0.22), 0 0 60px rgba(160, 100, 255, 0.15)'
                : '0 8px 30px rgba(0, 0, 0, 0.4)',
              transform: isHovered ? 'translateY(-1px) scale(1.015)' : 'translateY(0) scale(1)',
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              outline: 'none',
            }}
          >
            <Play
              size={12}
              fill={isHovered ? '#b8ccff' : '#ffffff'}
              color={isHovered ? '#b8ccff' : '#ffffff'}
              style={{
                transition: 'all 0.3s ease',
                transform: isHovered ? 'scale(1.1) translateX(1px)' : 'scale(1)',
              }}
            />
            <span>START EXPERIENCE</span>
          </button>
        )}
      </div>
    </div>
  );
}
