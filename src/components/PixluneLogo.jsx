import { useState } from 'react';
import pixluneImg from '../assets/pixlune-logo.png';

export default function PixluneLogo({ isMobile = false }) {
  const [isHovered, setIsHovered] = useState(false);

  if (isMobile) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        pointerEvents: 'auto',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
        opacity: isHovered ? 1.0 : 0.82,
        transform: isHovered ? 'scale(1.03)' : 'scale(1)',
        cursor: 'pointer',
        userSelect: 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Pixlune"
    >
      <img
        src={pixluneImg}
        alt="PIXLUNE"
        style={{
          height: '24px',
          width: 'auto',
          maxHeight: '28px',
          objectFit: 'contain',
          display: 'block',
          mixBlendMode: 'screen', // Seamlessly eliminates black background while preserving white logo
          filter: 'drop-shadow(0 2px 10px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 14px rgba(255, 255, 255, 0.25))',
        }}
      />
    </div>
  );
}
