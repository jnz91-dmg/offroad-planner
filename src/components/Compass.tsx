'use client';

import { DIRECTIONS } from '@/lib/config';
import { usePlannerStore } from '@/stores/planner';

const SIZE = 185;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 70;

export default function Compass() {
  const heading = usePlannerStore((s) => s.heading);
  const setHeading = usePlannerStore((s) => s.setHeading);

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      {/* Outer ring */}
      <circle
        cx={CX}
        cy={CY}
        r={R + 12}
        fill="none"
        stroke="rgba(255,255,255,.04)"
        strokeWidth={1}
      />
      {/* Inner ring */}
      <circle
        cx={CX}
        cy={CY}
        r={R - 22}
        fill="none"
        stroke="rgba(255,255,255,.03)"
        strokeWidth={1}
      />

      {DIRECTIONS.map((dir) => {
        const a = ((dir.angle - 90) * Math.PI) / 180;
        const x = CX + R * Math.cos(a);
        const y = CY + R * Math.sin(a);
        const sel = heading === dir.angle;

        return (
          <g key={dir.angle}>
            {/* Direction indicator line */}
            {sel && (
              <line
                x1={CX}
                y1={CY}
                x2={CX + (R - 26) * Math.cos(a)}
                y2={CY + (R - 26) * Math.sin(a)}
                stroke="var(--accent)"
                strokeWidth={2}
                strokeLinecap="round"
                opacity={0.35}
              />
            )}

            {/* Direction button */}
            <circle
              cx={x}
              cy={y}
              r={sel ? 16 : 13}
              fill={sel ? 'var(--accent)' : 'rgba(255,255,255,.04)'}
              stroke={sel ? 'var(--accent)' : 'rgba(255,255,255,.1)'}
              strokeWidth={sel ? 2 : 1}
              style={{ cursor: 'pointer' }}
              onClick={() => setHeading(dir.angle)}
            />

            {/* Label */}
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={sel ? '#fff' : 'rgba(255,255,255,.35)'}
              fontSize={sel ? 10.5 : 9.5}
              fontFamily="'DM Sans', sans-serif"
              fontWeight={sel ? 700 : 500}
              style={{ pointerEvents: 'none' }}
            >
              {dir.label}
            </text>
          </g>
        );
      })}

      {/* Center dot */}
      <circle cx={CX} cy={CY} r={3} fill="rgba(255,255,255,.2)" />
    </svg>
  );
}
