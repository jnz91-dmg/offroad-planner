/**
 * Signed slope coloring (DMD2-inspired, tuned for ADV / 4x4).
 *
 * Unlike the existing unsigned `gradient` mode (Math.abs of pct), `slope`
 * distinguishes descent (cool / blue) from climb (warm / red) using a
 * symmetric 7-band diverging palette. Designed to read well on satellite
 * and topo basemaps.
 */

interface SlopeStop {
  /** Upper bound (inclusive) of this band, in signed percent. */
  max: number;
  color: string;
}

/** Internal lookup ordered from most-negative to most-positive. */
const SLOPE_STOPS: SlopeStop[] = [
  { max: -15, color: '#1d4ed8' }, // very steep descent
  { max: -8,  color: '#3b82f6' }, // steep descent
  { max: -3,  color: '#93c5fd' }, // moderate descent
  { max: 3,   color: '#9ca3af' }, // flat (mid-grey for contrast on dark tiles)
  { max: 8,   color: '#fbbf24' }, // moderate climb
  { max: 15,  color: '#f97316' }, // steep climb
  { max: Infinity, color: '#dc2626' }, // very steep climb
];

/**
 * Bands for the legend (matches GradientLegend's existing band shape).
 * Order: descent → flat → climb, so the legend reads left-to-right.
 */
export const SLOPE_BANDS: Array<{ label: string; desc: string; color: string }> = [
  { label: '<-15%', desc: 'Very steep descent', color: '#1d4ed8' },
  { label: '-15..-8%', desc: 'Steep descent', color: '#3b82f6' },
  { label: '-8..-3%', desc: 'Moderate descent', color: '#93c5fd' },
  { label: '-3..3%', desc: 'Flat', color: '#9ca3af' },
  { label: '3..8%', desc: 'Moderate climb', color: '#fbbf24' },
  { label: '8..15%', desc: 'Steep climb', color: '#f97316' },
  { label: '>15%', desc: 'Very steep climb', color: '#dc2626' },
];

/** Smoothing window (point count) — matches buildGradientSegments for parity. */
export const SLOPE_WINDOW = 3;

/** Map a signed slope percentage to its band color. */
export function slopeColor(percent: number): string {
  for (const s of SLOPE_STOPS) if (percent <= s.max) return s.color;
  return SLOPE_STOPS[SLOPE_STOPS.length - 1].color;
}
