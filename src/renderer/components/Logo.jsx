import React from 'react';

export default function Logo({ size = 24 }) {
  const barWidth = size * 0.08;
  const r = barWidth / 2;
  const cx = size / 2;
  const cy = size / 2;
  const gap = size * 0.078;

  // Bar heights as proportions of size (soundwave + center cursor)
  const bars = [
    { offset: -5, h: 0.14 },
    { offset: -4, h: 0.27 },
    { offset: -3, h: 0.40 },
    { offset: -2, h: 0.55 },
    { offset: -1, h: 0.43 },
    { offset: 0,  h: 0.66 }, // center cursor bar — tallest
    { offset: 1,  h: 0.43 },
    { offset: 2,  h: 0.55 },
    { offset: 3,  h: 0.40 },
    { offset: 4,  h: 0.27 },
    { offset: 5,  h: 0.14 },
  ];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <defs>
        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
      </defs>
      {bars.map(({ offset, h }, i) => {
        const barH = size * h;
        const x = cx + offset * gap - barWidth / 2;
        const y = cy - barH / 2;
        const opacity = offset === 0 ? 1 : 1 - Math.abs(offset) * 0.09;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={barH}
            rx={r}
            fill="url(#logo-grad)"
            opacity={opacity}
          />
        );
      })}
    </svg>
  );
}
