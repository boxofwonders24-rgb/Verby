import React from 'react';

export default function Logo({ size = 24 }) {
  // Wider layout: thicker bars, more gap, fills the horizontal space
  // Asymmetric: left = voice wave, center = cursor, right = text output
  const s = size;
  const w = s * 0.055; // bar width (nearly 2x previous)
  const W = s * 0.07; // cursor bar
  const g = s * 0.082; // gap between bars

  const bars = [
    // left: voice (organic, varying heights)
    { x: -4.5, h: 0.14, w, o: 0.4 },
    { x: -3.5, h: 0.30, w, o: 0.55 },
    { x: -2.5, h: 0.50, w, o: 0.75 },
    { x: -1.5, h: 0.65, w, o: 0.9 },
    { x: -0.5, h: 0.50, w, o: 0.95 },
    // center: cursor — tallest, widest
    { x: 0.5, h: 0.78, w: W, o: 1, cursor: true },
    // right: text output (structured descent)
    { x: 1.5, h: 0.42, w, o: 0.9 },
    { x: 2.5, h: 0.30, w, o: 0.7 },
    { x: 3.5, h: 0.20, w, o: 0.5 },
    { x: 4.5, h: 0.12, w, o: 0.35 },
  ];

  const cx = s * 0.44; // shift left slightly so bars + dot fill the space
  const cy = s / 2;

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
      <defs>
        <linearGradient id="lg-main" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="40%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
        <linearGradient id="lg-cursor" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
      </defs>
      {bars.map(({ x, h, w: bw, o, cursor }, i) => {
        const barH = s * h;
        const bx = cx + x * g - bw / 2;
        const by = cy - barH / 2;
        return (
          <rect
            key={i}
            x={bx}
            y={by}
            width={bw}
            height={barH}
            rx={bw / 2}
            fill={cursor ? 'url(#lg-cursor)' : 'url(#lg-main)'}
            opacity={o}
          />
        );
      })}
      {/* Teal dot accent */}
      <circle
        cx={cx + 5.3 * g}
        cy={cy + s * 0.015}
        r={s * 0.03}
        fill="#14B8A6"
        opacity={0.65}
      />
    </svg>
  );
}
