'use client';

import { useMemo, useRef, useState, useCallback } from 'react';

// ─── Gradient color bands (mirror MapView.GRADIENT_BANDS) ───
const GRADIENT_BANDS: ReadonlyArray<{ max: number; color: string }> = [
  { max: 3, color: '#22c55e' },
  { max: 6, color: '#eab308' },
  { max: 9, color: '#f97316' },
  { max: Infinity, color: '#ef4444' },
];

function gradientColor(percent: number): string {
  const abs = Math.abs(percent);
  for (const b of GRADIENT_BANDS) if (abs <= b.max) return b.color;
  return GRADIENT_BANDS[GRADIENT_BANDS.length - 1].color;
}

// Haversine distance in meters between two [lat, lng] points.
function haversineM(
  a: readonly [number, number],
  b: readonly [number, number],
): number {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const sLat = Math.sin(dLat / 2);
  const sLng = Math.sin(dLng / 2);
  const h =
    sLat * sLat +
    Math.cos((a[0] * Math.PI) / 180) *
      Math.cos((b[0] * Math.PI) / 180) *
      sLng *
      sLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ─── Component types ───
export type ElevationCoord =
  | [number, number]
  | [number, number, number];

export interface ElevationProfileProps {
  coords: Array<ElevationCoord>;
  height?: number;
}

interface ProfilePoint {
  // cumulative distance in meters from start (along input coords)
  distM: number;
  // elevation in meters
  ele: number;
  // pixel x position on the chart
  x: number;
  // pixel y position on the chart
  y: number;
  // smoothed gradient (%) at this point (for coloring + tooltip)
  grade: number;
}

interface ChartGeometry {
  points: ProfilePoint[];
  totalM: number;
  minEle: number;
  maxEle: number;
  // chart drawing area (inside padding)
  innerW: number;
  innerH: number;
  padX: number;
  padY: number;
  // total svg dims
  width: number;
  height: number;
  // built filled area path (single d) for the underlay
  areaPath: string;
  // gradient-colored stroke segments
  segments: Array<{ d: string; color: string }>;
}

const PAD_X = 10;
const PAD_Y = 10;
const DEFAULT_HEIGHT = 80;
// Internal SVG width — the SVG scales to 100% of container via viewBox + width="100%".
const VIEWBOX_W = 600;

/**
 * Build all derived geometry for the chart from an input coord list.
 * Returns null if there are fewer than 2 elevation-bearing points.
 */
function buildGeometry(
  coords: Array<ElevationCoord>,
  width: number,
  height: number,
): ChartGeometry | null {
  // Filter to points that carry elevation data.
  type LatLngEle = readonly [number, number, number];
  const pts: LatLngEle[] = [];
  for (const c of coords) {
    if (c.length >= 3 && typeof c[2] === 'number' && Number.isFinite(c[2])) {
      pts.push([c[0], c[1], c[2]] as LatLngEle);
    }
  }
  if (pts.length < 2) return null;

  // Cumulative distance per point.
  const dists: number[] = new Array(pts.length);
  dists[0] = 0;
  for (let i = 1; i < pts.length; i++) {
    dists[i] =
      dists[i - 1] +
      haversineM([pts[i - 1][0], pts[i - 1][1]], [pts[i][0], pts[i][1]]);
  }
  const totalM = dists[pts.length - 1];
  if (totalM <= 0) return null;

  // Min/max elevation (with a tiny pad so a flat-ish profile still has a visible curve).
  let minEle = Infinity;
  let maxEle = -Infinity;
  for (const p of pts) {
    if (p[2] < minEle) minEle = p[2];
    if (p[2] > maxEle) maxEle = p[2];
  }
  let eleSpan = maxEle - minEle;
  if (eleSpan < 1) {
    // ~zero range: pad symmetrically so the chart isn't a flat line on the bottom edge
    minEle -= 0.5;
    maxEle += 0.5;
    eleSpan = maxEle - minEle;
  }

  const padX = PAD_X;
  const padY = PAD_Y;
  const innerW = Math.max(1, width - padX * 2);
  const innerH = Math.max(1, height - padY * 2);

  // Smoothed gradient per point — same 3-pt window logic as MapView.buildGradientSegments,
  // but stored per-point (not per-segment) so we can use it for coloring + tooltip.
  const WINDOW = 3;
  const grades: number[] = new Array(pts.length);
  // grade[0] = grade between point 0 and 1 (matches "i=1..n-1" loop in MapView, then we mirror to point 0)
  for (let i = 1; i < pts.length; i++) {
    let totalDist = 0;
    let totalRise = 0;
    const lo = Math.max(0, i - WINDOW);
    const hi = Math.min(pts.length - 1, i + WINDOW - 1);
    for (let j = lo; j < hi; j++) {
      const d = haversineM(
        [pts[j][0], pts[j][1]],
        [pts[j + 1][0], pts[j + 1][1]],
      );
      if (d === 0) continue;
      totalDist += d;
      totalRise += pts[j + 1][2] - pts[j][2];
    }
    grades[i] = totalDist > 0 ? (totalRise / totalDist) * 100 : 0;
  }
  grades[0] = grades[1] ?? 0;

  // Build profile points with pixel coords.
  const points: ProfilePoint[] = pts.map((p, i) => {
    const x = padX + (dists[i] / totalM) * innerW;
    const y = padY + (1 - (p[2] - minEle) / eleSpan) * innerH;
    return {
      distM: dists[i],
      ele: p[2],
      x,
      y,
      grade: grades[i],
    };
  });

  // Filled-area path: top edge follows curve, then closes along the bottom.
  const baselineY = padY + innerH;
  const areaCmds: string[] = [];
  areaCmds.push(`M ${points[0].x.toFixed(2)} ${baselineY.toFixed(2)}`);
  for (const p of points) {
    areaCmds.push(`L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
  }
  areaCmds.push(`L ${points[points.length - 1].x.toFixed(2)} ${baselineY.toFixed(2)}`);
  areaCmds.push('Z');
  const areaPath = areaCmds.join(' ');

  // Gradient-colored stroke: group consecutive segments sharing a color band.
  // Use the band of the *destination* point of each segment (matches MapView).
  const segments: Array<{ d: string; color: string }> = [];
  if (points.length >= 2) {
    let segStartIdx = 0;
    let currentColor = gradientColor(points[1].grade);
    for (let i = 1; i < points.length; i++) {
      const c = gradientColor(points[i].grade);
      if (c !== currentColor) {
        // close previous segment from segStartIdx..i (i is the shared boundary)
        const cmds: string[] = [];
        for (let j = segStartIdx; j <= i; j++) {
          cmds.push(
            `${j === segStartIdx ? 'M' : 'L'} ${points[j].x.toFixed(2)} ${points[j].y.toFixed(2)}`,
          );
        }
        segments.push({ d: cmds.join(' '), color: currentColor });
        segStartIdx = i;
        currentColor = c;
      }
    }
    // tail
    const cmds: string[] = [];
    for (let j = segStartIdx; j < points.length; j++) {
      cmds.push(
        `${j === segStartIdx ? 'M' : 'L'} ${points[j].x.toFixed(2)} ${points[j].y.toFixed(2)}`,
      );
    }
    segments.push({ d: cmds.join(' '), color: currentColor });
  }

  return {
    points,
    totalM,
    minEle,
    maxEle,
    innerW,
    innerH,
    padX,
    padY,
    width,
    height,
    areaPath,
    segments,
  };
}

function formatKm(m: number): string {
  const km = m / 1000;
  if (km >= 100) return `${km.toFixed(0)} km`;
  return `${km.toFixed(1)} km`;
}

function formatGrade(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

export default function ElevationProfile({
  coords,
  height = DEFAULT_HEIGHT,
}: ElevationProfileProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // We render in a fixed-aspect viewBox space (600 x height). The SVG element
  // itself is width:100% of container, so the viewBox handles scaling.
  const geom = useMemo(
    () => buildGeometry(coords, VIEWBOX_W, height),
    [coords, height],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!geom || !svgRef.current) return;
      const svg = svgRef.current;
      const rect = svg.getBoundingClientRect();
      // Map screen x → viewBox x.
      const ratio = VIEWBOX_W / rect.width;
      const xVB = (e.clientX - rect.left) * ratio;

      // Binary search for the closest point by x coordinate.
      const pts = geom.points;
      let lo = 0;
      let hi = pts.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (pts[mid].x < xVB) lo = mid;
        else hi = mid;
      }
      const cand = Math.abs(pts[lo].x - xVB) <= Math.abs(pts[hi].x - xVB) ? lo : hi;
      setHoverIdx(cand);
    },
    [geom],
  );

  const handleMouseLeave = useCallback(() => {
    setHoverIdx(null);
  }, []);

  if (!geom) return null;

  const hover = hoverIdx != null ? geom.points[hoverIdx] : null;

  // Decide tooltip horizontal placement so it doesn't clip off either edge.
  // Tooltip width (in viewBox units) — approximate.
  const TT_W = 110;
  const TT_H = 44;
  const TT_GAP = 8;
  let ttX = 0;
  let ttY = 0;
  if (hover) {
    if (hover.x + TT_GAP + TT_W <= geom.width - geom.padX) {
      ttX = hover.x + TT_GAP;
    } else {
      ttX = hover.x - TT_GAP - TT_W;
    }
    ttY = Math.max(geom.padY, Math.min(hover.y - TT_H / 2, geom.height - geom.padY - TT_H));
  }

  return (
    <div className="elevation-profile">
      <svg
        ref={svgRef}
        className="elevation-profile-svg"
        viewBox={`0 0 ${geom.width} ${geom.height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        role="img"
        aria-label="Route elevation profile"
      >
        {/* Filled area underlay (subtle accent fill) */}
        <path
          d={geom.areaPath}
          fill="rgba(224, 90, 71, 0.10)"
          stroke="none"
        />

        {/* Gradient-colored stroke segments */}
        {geom.segments.map((seg, i) => (
          <path
            key={i}
            d={seg.d}
            fill="none"
            stroke={seg.color}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Y-axis labels (top-right max, bottom-right min) */}
        <text
          x={geom.width - geom.padX}
          y={geom.padY + 2}
          textAnchor="end"
          dominantBaseline="hanging"
          fontSize={9}
          fontFamily="'DM Sans', sans-serif"
          fill="var(--text-muted)"
        >
          {Math.round(geom.maxEle)} m
        </text>
        <text
          x={geom.width - geom.padX}
          y={geom.height - geom.padY - 2}
          textAnchor="end"
          dominantBaseline="alphabetic"
          fontSize={9}
          fontFamily="'DM Sans', sans-serif"
          fill="var(--text-muted)"
        >
          {Math.round(geom.minEle)} m
        </text>

        {/* X-axis labels */}
        <text
          x={geom.padX}
          y={geom.height - geom.padY - 2}
          textAnchor="start"
          dominantBaseline="alphabetic"
          fontSize={9}
          fontFamily="'DM Sans', sans-serif"
          fill="var(--text-muted)"
        >
          0 km
        </text>
        <text
          x={geom.width - geom.padX}
          y={geom.padY + 2}
          textAnchor="end"
          dominantBaseline="hanging"
          fontSize={9}
          fontFamily="'DM Sans', sans-serif"
          fill="var(--text-muted)"
          // Note: top-right slot is taken by maxEle; we put km on bottom-left + we put total km as a separate label below.
          opacity={0}
        >
          {formatKm(geom.totalM)}
        </text>
        {/* Total km — placed at bottom-right, slightly offset above the min ele label */}
        <text
          x={geom.width - geom.padX}
          y={geom.height - geom.padY - 12}
          textAnchor="end"
          dominantBaseline="alphabetic"
          fontSize={9}
          fontFamily="'DM Sans', sans-serif"
          fill="var(--text-muted)"
        >
          {formatKm(geom.totalM)}
        </text>

        {/* Hover indicator */}
        {hover && (
          <g pointerEvents="none">
            <line
              x1={hover.x}
              y1={geom.padY}
              x2={hover.x}
              y2={geom.height - geom.padY}
              stroke="rgba(255,255,255,0.55)"
              strokeWidth={1}
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={hover.x}
              cy={hover.y}
              r={3}
              fill={gradientColor(hover.grade)}
              stroke="#fff"
              strokeWidth={1}
            />

            {/* Tooltip */}
            <g transform={`translate(${ttX} ${ttY})`}>
              <rect
                x={0}
                y={0}
                width={TT_W}
                height={TT_H}
                rx={4}
                ry={4}
                fill="rgba(15,15,15,0.92)"
                stroke="var(--border-subtle)"
                strokeWidth={1}
              />
              <text
                x={7}
                y={11}
                fontSize={9.5}
                fontFamily="'DM Sans', sans-serif"
                fill="rgba(255,255,255,0.85)"
                dominantBaseline="hanging"
              >
                {formatKm(hover.distM)}
              </text>
              <text
                x={7}
                y={23}
                fontSize={9.5}
                fontFamily="'DM Sans', sans-serif"
                fill="rgba(255,255,255,0.85)"
                dominantBaseline="hanging"
              >
                {Math.round(hover.ele)} m
              </text>
              <text
                x={7}
                y={35}
                fontSize={9.5}
                fontFamily="'DM Sans', sans-serif"
                fill={gradientColor(hover.grade)}
                fontWeight={600}
                dominantBaseline="hanging"
              >
                {formatGrade(hover.grade)}
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
