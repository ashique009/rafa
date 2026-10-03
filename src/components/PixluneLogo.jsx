import { useState } from 'react';
import pixluneImg from '../assets/pixlune-logo.png';

export default function PixluneLogo() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 'clamp(20px, 3vh, 28px)',
        right: 'clamp(22px, 3.2vw, 32px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        pointerEvents: 'auto',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
        opacity: isHovered ? 0.95 : 0.52,
        transform: isHovered ? 'scale(1.04)' : 'scale(1)',
        cursor: 'default',
        userSelect: 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img
        src={pixluneImg}
        alt="Pixlune"
        style={{
          height: 'clamp(32px, 4vw, 42px)',
          width: 'clamp(32px, 4vw, 42px)',
          objectFit: 'contain',
          display: 'block',
          filter: 'drop-shadow(0 2px 10px rgba(0, 0, 0, 0.45)) drop-shadow(0 0 12px rgba(180, 210, 255, 0.15))',
        }}
      />
    </div>
  );
}
