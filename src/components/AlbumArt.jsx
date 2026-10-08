export default function AlbumArt({ src = null, size = 52, className = '' }) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
        background: '#070a16',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5), 0 0 14px rgba(0, 243, 255, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
      }}
    >
      {src ? (
        <img
          src={src}
          alt="Album Art"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block' }}
        >
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0a0518" />
            <stop offset="50%" stopColor="#081026" />
            <stop offset="100%" stopColor="#02030a" />
          </linearGradient>

          <radialGradient id="ringGlow" cx="50%" cy="46%" r="50%">
            <stop offset="0%" stopColor="#ff00a0" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#9d00ff" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#00f3ff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="neonRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff2a85" />
            <stop offset="50%" stopColor="#b026ff" />
            <stop offset="100%" stopColor="#00f3ff" />
          </linearGradient>

          <filter id="bloom" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Dark Cyberpunk Background */}
        <rect width="100" height="100" fill="url(#bgGrad)" />

        {/* Ambient Portal Halo */}
        <circle cx="50" cy="46" r="32" fill="url(#ringGlow)" />

        {/* Grid perspective floor lines */}
        <line x1="50" y1="72" x2="10" y2="100" stroke="#00f3ff" strokeOpacity="0.3" strokeWidth="0.8" />
        <line x1="50" y1="72" x2="30" y2="100" stroke="#00f3ff" strokeOpacity="0.25" strokeWidth="0.8" />
        <line x1="50" y1="72" x2="50" y2="100" stroke="#00f3ff" strokeOpacity="0.35" strokeWidth="0.8" />
        <line x1="50" y1="72" x2="70" y2="100" stroke="#00f3ff" strokeOpacity="0.25" strokeWidth="0.8" />
        <line x1="50" y1="72" x2="90" y2="100" stroke="#00f3ff" strokeOpacity="0.3" strokeWidth="0.8" />
        <line x1="20" y1="84" x2="80" y2="84" stroke="#ff00a0" strokeOpacity="0.25" strokeWidth="0.8" />

        {/* Outer Glowing Neon Ring */}
        <circle
          cx="50"
          cy="46"
          r="22"
          stroke="url(#neonRing)"
          strokeWidth="3.2"
          filter="url(#bloom)"
        />

        {/* Inner Bright Neon Rim */}
        <circle
          cx="50"
          cy="46"
          r="19"
          stroke="#ffffff"
          strokeOpacity="0.85"
          strokeWidth="1.0"
        />

        {/* Silhouette Figure */}
        {/* Head */}
        <circle cx="50" cy="56" r="3.2" fill="#030308" />
        {/* Torso & Coat */}
        <path
          d="M45.5 68 L47.5 60 L50 59.5 L52.5 60 L54.5 68 L53 76 L47 76 Z"
          fill="#030308"
        />
        {/* Legs */}
        <line x1="48" y1="76" x2="47" y2="86" stroke="#030308" strokeWidth="2.0" strokeLinecap="round" />
        <line x1="52" y1="76" x2="53" y2="86" stroke="#030308" strokeWidth="2.0" strokeLinecap="round" />

        {/* Rim lighting on silhouette shoulders */}
        <path
          d="M46.8 61 L50 60 L53.2 61"
          stroke="#00f3ff"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeOpacity="0.9"
        />
      </svg>
      )}
    </div>
  );
}
