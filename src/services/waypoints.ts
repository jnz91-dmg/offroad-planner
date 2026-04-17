import { DIFFICULTIES, ROUTE_CHARACTERS } from '@/lib/config';
import type { Coordinate, DifficultyId, RouteCharacter } from '@/lib/types';

// Seeded pseudo-random so retries produce consistent (but different) waypoints
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Creates algorithmic control points in a loop shape.
 * Pure function — no state reads.
 *
 * @param radiusScale Multiplier applied to the radius. 1.0 = default.
 *   Use < 1.0 to shrink the loop if the previous attempt routed too long.
 * @param seed Random seed for jitter — pass same seed to get same waypoints.
 * @param character Route character ('smooth' | 'balanced' | 'spurs') — scales jitter.
 */
export function generateGuideWaypoints(
  lat: number,
  lng: number,
  distance: number,
  heading: number,
  difficulty: DifficultyId,
  radiusScale: number = 1,
  seed: number = 0,
  character: RouteCharacter = 'balanced',
): Coordinate[] {
  const diff = DIFFICULTIES[difficulty];
  const n = diff.guidePoints;
  const jitter = diff.jitter * ROUTE_CHARACTERS[character].jitterMultiplier;
  const rand = mulberry32(seed || 42);

  const radiusKm = (distance / (Math.PI * 1.6)) * radiusScale;
  const radiusDeg = radiusKm / 111;
  const headingRad = (heading * Math.PI) / 180;
  const cosLat = Math.cos((lat * Math.PI) / 180);

  const centerLat = lat + radiusDeg * Math.cos(headingRad) * 0.5;
  const centerLng = lng + (radiusDeg * Math.sin(headingRad) * 0.5) / cosLat;

  const waypoints: Coordinate[] = [];
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    const stretch =
      1 +
      jitter *
        (Math.sin(i * 2.7 + 1.3) * 0.8 +
          Math.cos(i * 1.9 + rand() * 0.4) * 0.5);
    const r = radiusDeg * stretch;
    waypoints.push([
      centerLat + r * Math.cos(angle + headingRad),
      centerLng + (r * Math.sin(angle + headingRad)) / cosLat,
    ]);
  }
  return waypoints;
}

/**
 * Evenly samples N points from a dense route for use as drag handles.
 */
export function extractGuidePoints(
  coords: Coordinate[],
  difficulty: DifficultyId,
): Coordinate[] {
  const n = DIFFICULTIES[difficulty]?.guidePoints || 7;
  const step = Math.floor(coords.length / n);
  const points: Coordinate[] = [];
  for (let i = 0; i < n; i++) {
    points.push([...coords[i * step]] as Coordinate);
  }
  return points;
}
