import { DIFFICULTIES, ROUTE_CHARACTERS } from '@/lib/config';
import type { Coordinate, DifficultyId, RouteCharacter, TripType } from '@/lib/types';

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
 * Creates algorithmic control points for either a loop or an out-and-back trip.
 * Pure function — no state reads.
 *
 * @param radiusScale Multiplier applied to the radius / one-way length. 1.0 = default.
 *   Use < 1.0 to shrink if the previous attempt routed too long.
 * @param seed Random seed for jitter — pass same seed to get same waypoints.
 * @param character Route character ('smooth' | 'balanced' | 'spurs') — scales jitter.
 * @param tripType 'loop' (closed circular) or 'out-and-back' (forward bearing only).
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
  tripType: TripType = 'loop',
): Coordinate[] {
  if (tripType === 'out-and-back') {
    return generateOutAndBackWaypoints(lat, lng, distance, heading, difficulty, radiusScale, seed, character);
  }

  const diff = DIFFICULTIES[difficulty];
  const n = diff.guidePoints;
  const jitter = diff.jitter * ROUTE_CHARACTERS[character].jitterMultiplier;
  const rand = mulberry32(seed || 42);

  const radiusKm = (distance / (Math.PI * 1.6)) * radiusScale;
  const radiusDeg = radiusKm / 111;
  const headingRad = (heading * Math.PI) / 180;
  const cosLat = Math.cos((lat * Math.PI) / 180);

  // Offset the loop center so the circle sits in the heading direction
  // from the user's start, then anchor the start as waypoint[0] so the
  // routed loop actually begins and ends at the chosen address.
  const centerLat = lat + radiusDeg * Math.cos(headingRad);
  const centerLng = lng + (radiusDeg * Math.sin(headingRad)) / cosLat;

  const waypoints: Coordinate[] = [[lat, lng]];
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
 * Generate waypoints along a single forward bearing for an out-and-back trip.
 * Targets `distance / 2` of forward travel; the return leg is mirrored from the
 * routed coords client-side (in router.buildOutAndBackPath), giving a byte-identical trail.
 *
 * Returns an OPEN array (no closure to start) — the router must NOT append waypoints[0].
 */
function generateOutAndBackWaypoints(
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
  const n = Math.max(2, diff.guidePoints);
  const jitter = diff.jitter * ROUTE_CHARACTERS[character].jitterMultiplier;
  const rand = mulberry32(seed || 42);

  const oneWayKm = (distance / 2) * radiusScale;
  const stepKm = oneWayKm / (n - 1);
  const headingRad = (heading * Math.PI) / 180;
  const cosLat = Math.cos((lat * Math.PI) / 180);

  // Forward unit vector (per km)
  const fwdDLatPerKm = Math.cos(headingRad) / 111;
  const fwdDLngPerKm = Math.sin(headingRad) / (111 * cosLat);
  // Right-hand perpendicular unit vector (per km) — for lateral jitter
  const latDLatPerKm = -Math.sin(headingRad) / 111;
  const latDLngPerKm = Math.cos(headingRad) / (111 * cosLat);

  const waypoints: Coordinate[] = [[lat, lng]]; // start at index 0
  for (let i = 1; i < n; i++) {
    const forwardKm = stepKm * i;
    // Lateral jitter dampens toward both ends so the start and tip stay on bearing.
    const t = i / (n - 1);
    const endDamp = Math.sin(t * Math.PI); // 0 at ends, 1 at middle
    const lateralKm =
      jitter *
      stepKm *
      endDamp *
      (Math.sin(i * 2.7 + 1.3) * 0.8 + Math.cos(i * 1.9 + rand() * 0.4) * 0.5);

    const dLat = forwardKm * fwdDLatPerKm + lateralKm * latDLatPerKm;
    const dLng = forwardKm * fwdDLngPerKm + lateralKm * latDLngPerKm;
    waypoints.push([lat + dLat, lng + dLng]);
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
