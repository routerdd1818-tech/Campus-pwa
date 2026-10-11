import React from 'react';

interface CalicoAvatarProps {
  size?: number;
  mood?: 'happy' | 'sleeping' | 'thinking' | 'proud';
  className?: string;
  onClick?: () => void;
}

export const CalicoAvatar: React.FC<CalicoAvatarProps> = ({
  size = 48,
  mood = 'happy',
  className = '',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      style={{ width: size, height: size }}
      className={`relative rounded-full cursor-pointer transition-transform duration-200 active:scale-95 select-none ${className}`}
      title="可樂管家"
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-sm transition-all duration-300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Cat Ears */}
        {/* Left Ear (Orange patch) */}
        <path
          d="M22 42 L12 18 C11 15 15 12 18 14 L42 26 Z"
          fill="#E67E22"
          stroke="#3D2F2E"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        {/* Inner Left Ear */}
        <path d="M22 36 L17 22 L34 27 Z" fill="#FEEBC8" opacity="0.9" />

        {/* Right Ear (Black patch) */}
        <path
          d="M78 42 L88 18 C89 15 85 12 82 14 L58 26 Z"
          fill="#3D2F2E"
          stroke="#3D2F2E"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        {/* Inner Right Ear */}
        <path d="M78 36 L83 22 L66 27 Z" fill="#FEEBC8" opacity="0.8" />

        {/* Head Base (Cream White) */}
        <circle cx="50" cy="54" r="38" fill="#FFFBF5" stroke="#3D2F2E" strokeWidth="4" />

        {/* Calico Patch 1: Top-Right Cocoa Patch */}
        <path
          d="M50 16 C68 16 86 26 86 48 C86 42 78 32 68 28 C60 25 54 20 50 16 Z"
          fill="#3D2F2E"
        />

        {/* Calico Patch 2: Left Cheeks Warm Orange Patch */}
        <path
          d="M16 64 C14 54 18 42 28 36 C34 44 32 58 26 68 C20 68 18 66 16 64 Z"
          fill="#E67E22"
        />

        {/* Cheeks Blush */}
        <circle cx="28" cy="62" r="5.5" fill="#FED7D7" opacity="0.8" />
        <circle cx="72" cy="62" r="5.5" fill="#FED7D7" opacity="0.8" />

        {/* Eyes according to Mood */}
        {mood === 'happy' && (
          <>
            {/* Happy Curved Closed Eyes */}
            <path
              d="M32 52 Q38 46 44 52"
              stroke="#3D2F2E"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M56 52 Q62 46 68 52"
              stroke="#3D2F2E"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </>
        )}

        {mood === 'thinking' && (
          <>
            {/* Thinking / Curious Eyes */}
            <circle cx="38" cy="50" r="4.5" fill="#3D2F2E" />
            <circle cx="62" cy="49" r="4.5" fill="#3D2F2E" />
            {/* Light sparkles */}
            <circle cx="39.5" cy="48.5" r="1.5" fill="#FFFFFF" />
            <circle cx="63.5" cy="47.5" r="1.5" fill="#FFFFFF" />
          </>
        )}

        {mood === 'proud' && (
          <>
            {/* Sparkle Proud Eyes */}
            <path
              d="M31 51 Q38 43 45 51"
              stroke="#E67E22"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <path
              d="M55 51 Q62 43 69 51"
              stroke="#E67E22"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            {/* Tiny stars */}
            <polygon points="50,30 52,34 56,35 53,38 54,42 50,40 46,42 47,38 44,35 48,34" fill="#ECC94B" />
          </>
        )}

        {mood === 'sleeping' && (
          <>
            <line x1="32" y1="52" x2="44" y2="52" stroke="#3D2F2E" strokeWidth="4" strokeLinecap="round" />
            <line x1="56" y1="52" x2="68" y2="52" stroke="#3D2F2E" strokeWidth="4" strokeLinecap="round" />
          </>
        )}

        {/* Nose */}
        <polygon points="50,57 47,54 53,54" fill="#ED8936" />

        {/* Mouth */}
        <path
          d="M45 61 Q50 65 50 58 Q50 65 55 61"
          stroke="#3D2F2E"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />

        {/* Whiskers */}
        {/* Left */}
        <line x1="12" y1="56" x2="24" y2="58" stroke="#3D2F2E" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="10" y1="64" x2="23" y2="63" stroke="#3D2F2E" strokeWidth="2.5" strokeLinecap="round" />
        {/* Right */}
        <line x1="88" y1="56" x2="76" y2="58" stroke="#3D2F2E" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="90" y1="64" x2="77" y2="63" stroke="#3D2F2E" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
};
