import {
  ROUTING_ENGINE,
  BROUTER_BASE,
  BROUTER_FALLBACK,
  GRAPHHOPPER_BASE,
  GRAPHHOPPER_API_KEY,
  DIFFICULTIES,
} from '@/lib/config';
import type { Coordinate, DifficultyId, RouteResult, SurfaceSegment } from '@/lib/types';
import { classifySurface } from './surface';

interface BRouterSegmentResult {
  coords: Coordinate[];
  segments: SurfaceSegment[]; // indices are local to this segment's coords
}

// Parse BRouter's features[0].properties.messages into per-way SurfaceSegments.
// Each message represents one OSM way-section. The endpoint lat/lng is stored as
// int × 1e7. We find the matching coordinate index by walking along coords.
function parseBRouterMessages(
  rawMessages: unknown,
  coords: Coordinate[],
): SurfaceSegment[] {
  if (!Array.isArray(rawMessages) || rawMessages.length < 2) return [];
  const rows = rawMessages.slice(1) as string[][]; // skip header

  const segments: SurfaceSegment[] = [];
  let coordIdx = 0;

  for (const row of rows) {
    if (!row || row.length < 10) continue;
    // BRouter stores lat/lng as int × 1e6 (6 decimal places, ~11cm precision)
    const endLng = parseInt(row[0], 10) / 1e6;
    const endLat = parseInt(row[1], 10) / 1e6;
    const distanceM = parseInt(row[3], 10) || 0;
    const wayTags = row[9] || '';

    const startIdx = coordIdx;
    // Walk forward to find matching endpoint (small epsilon for fp rounding)
    while (coordIdx < coords.length - 1) {
      const c = coords[coordIdx + 1];
      if (Math.abs(c[0] - endLat) < 2e-5 && Math.abs(c[1] - endLng) < 2e-5) {
        coordIdx += 1;
        break;
      }
      coordIdx += 1;
    }

    segments.push({
      startIdx,
      endIdx: coordIdx,
      distanceM,
      wayTags,
      surfaceClass: classifySurface(wayTags),
    });
  }

  return segments;
}

// ─── BROUTER: ROUTE A SINGLE SEGMENT (2 points) ───
// Tries DMD2's server first (has motorcycle-tuned offroad-* profiles),
// falls back to brouter.de with the generic trekking/mtb profile if unavailable.
async function routeSegmentViaBRouter(
  from: Coordinate,
  to: Coordinate,
  profile: string,
  fallbackProfile: string,
): Promise<BRouterSegmentResult> {
  const lonlats = `${from[1].toFixed(6)},${from[0].toFixed(6)}|${to[1].toFixed(6)},${to[0].toFixed(6)}`;

  // Try DMD2 first with offroad profile
  try {
    const url = `${BROUTER_BASE}?lonlats=${lonlats}&profile=${profile}&alternativeidx=0&format=geojson`;
    const resp = await fetch(url);
    if (resp.ok) {
      const data = await resp.json();
      const feature = data.features[0];
      const coords: Coordinate[] = feature.geometry.coordinates.map(
        (c: number[]) => (c.length >= 3 ? [c[1], c[0], c[2]] : [c[1], c[0]]) as Coordinate,
      );
      const segments = parseBRouterMessages(feature.properties?.messages, coords);
      return { coords, segments };
    }
    // else fall through to fallback
  } catch { /* network error — fall through */ }

  // Fallback: brouter.de with generic profile (trekking/mtb)
  const url = `${BROUTER_FALLBACK}?lonlats=${lonlats}&profile=${fallbackProfile}&alternativeidx=0&format=geojson`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`BRouter segment error: ${resp.status}`);
  const data = await resp.json();
  const feature = data.features[0];
  const coords: Coordinate[] = feature.geometry.coordinates.map(
    (c: number[]) => (c.length >= 3 ? [c[1], c[0], c[2]] : [c[1], c[0]]) as Coordinate,
  );
  const segments = parseBRouterMessages(feature.properties?.messages, coords);
  return { coords, segments };
}

// ─── NUDGE: pull a point toward the center to escape sea/unmapped areas ───
function nudgeToward(point: Coordinate, center: Coordinate, factor: number): Coordinate {
  return [
    point[0] + (center[0] - point[0]) * factor,
    point[1] + (center[1] - point[1]) * factor,
  ];
}

// ─── BROUTER: try routing a segment, with retry by nudging endpoints ───
async function tryRouteSegment(
  from: Coordinate,
  to: Coordinate,
  center: Coordinate,
  profile: string,
  fallbackProfile: string,
): Promise<BRouterSegmentResult | null> {
  // Attempt 1: original points
  try {
    return await routeSegmentViaBRouter(from, to, profile, fallbackProfile);
  } catch { /* fall through */ }

  // Attempt 2: nudge both points 30% toward center (pulls sea points to land)
  try {
    const nudgedFrom = nudgeToward(from, center, 0.3);
    const nudgedTo = nudgeToward(to, center, 0.3);
    return await routeSegmentViaBRouter(nudgedFrom, nudgedTo, profile, fallbackProfile);
  } catch { /* fall through */ }

  return null;
}

// ─── BROUTER: ROUTE SEGMENT-BY-SEGMENT ───
// Routes each pair of waypoints individually so a single bad point
// only affects one segment (straight-line fallback) instead of killing
// the entire route. Failed segments are retried with nudged points.
async function routeViaBRouter(
  waypoints: Coordinate[],
  difficulty: DifficultyId,
): Promise<RouteResult> {
  const profile = DIFFICULTIES[difficulty].brouter;
  const fallbackProfile = DIFFICULTIES[difficulty].brouterFallback;
  const closed = [...waypoints, waypoints[0]];

  // Center of the loop (used for nudging failed points toward land)
  const center: Coordinate = [
    waypoints.reduce((s, w) => s + w[0], 0) / waypoints.length,
    waypoints.reduce((s, w) => s + w[1], 0) / waypoints.length,
  ];

  const allCoords: Coordinate[] = [];
  const allSegments: SurfaceSegment[] = [];
  let totalDistM = 0;
  let hasRouted = false;

  for (let i = 0; i < closed.length - 1; i++) {
    const result = await tryRouteSegment(closed[i], closed[i + 1], center, profile, fallbackProfile);
    if (result) {
      const skipFirst = i !== 0; // skip duplicated start point except on first iter
      const offset = allCoords.length - (skipFirst ? 1 : 0);
      allCoords.push(...result.coords.slice(skipFirst ? 1 : 0));

      // Offset segment indices to the global coords array
      for (const seg of result.segments) {
        allSegments.push({
          ...seg,
          startIdx: seg.startIdx + offset,
          endIdx: seg.endIdx + offset,
        });
      }
      hasRouted = true;
    } else {
      // Final fallback: straight line for this segment only
      if (i === 0) {
        allCoords.push(closed[i]);
      }
      allCoords.push(closed[i + 1]);
      // no surface data for fallback segment
    }
  }

  // Calculate approximate distance from coordinates if we have routed segments
  let distKm: number | null = null;
  if (hasRouted && allCoords.length > 1) {
    for (let i = 1; i < allCoords.length; i++) {
      totalDistM += haversineM(allCoords[i - 1], allCoords[i]);
    }
    distKm = parseFloat((totalDistM / 1000).toFixed(1));
  }

  return { coords: allCoords, distKm, segments: allSegments };
}

// ─── HAVERSINE DISTANCE (meters) ───
function haversineM(a: Coordinate, b: Coordinate): number {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a[0] * Math.PI) / 180) *
      Math.cos((b[0] * Math.PI) / 180) *
      sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ─── GRAPHHOPPER ROUTING ───
async function routeViaGraphHopper(
  waypoints: Coordinate[],
  difficulty: DifficultyId,
): Promise<RouteResult> {
  const diff = DIFFICULTIES[difficulty];
  const closed = [...waypoints, waypoints[0]];

  const body: Record<string, unknown> = {
    profile: diff.graphhopper,
    points: closed.map((wp) => [wp[1], wp[0]]),
    points_encoded: false,
    instructions: false,
    elevation: true,
    locale: 'en',
  };

  if (diff.ghCustomModel) {
    body.custom_model = diff.ghCustomModel;
    body['ch.disable'] = true;
  }

  const url = `${GRAPHHOPPER_BASE}?key=${GRAPHHOPPER_API_KEY}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(
      `GraphHopper error: ${resp.status} - ${err.message || ''}`,
    );
  }

  const data = await resp.json();
  const path = data.paths[0];
  const coords: Coordinate[] = path.points.coordinates.map(
    (c: number[]) => (c.length >= 3 ? [c[1], c[0], c[2]] : [c[1], c[0]]) as Coordinate,
  );
  const distKm = parseFloat((path.distance / 1000).toFixed(1));

  return { coords, distKm };
}

// ─── GRAPHHOPPER ROUND TRIP ───
export async function generateRoundTrip(
  lat: number,
  lng: number,
  distance: number,
  heading: number,
  difficulty: DifficultyId,
  seed: number = 0,
): Promise<RouteResult | null> {
  if (ROUTING_ENGINE !== 'graphhopper') return null;

  const diff = DIFFICULTIES[difficulty];

  const body: Record<string, unknown> = {
    profile: diff.graphhopper,
    points: [[lng, lat]],
    algorithm: 'round_trip',
    'round_trip.distance': distance * 1000,
    'round_trip.seed': seed,
    points_encoded: false,
    instructions: false,
    elevation: true,
    heading: [heading],
  };

  if (diff.ghCustomModel) {
    body.custom_model = diff.ghCustomModel;
    body['ch.disable'] = true;
  }

  const url = `${GRAPHHOPPER_BASE}?key=${GRAPHHOPPER_API_KEY}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(
      `GraphHopper round_trip error: ${resp.status} - ${err.message || ''}`,
    );
  }

  const data = await resp.json();
  const path = data.paths[0];
  const coords: Coordinate[] = path.points.coordinates.map(
    (c: number[]) => (c.length >= 3 ? [c[1], c[0], c[2]] : [c[1], c[0]]) as Coordinate,
  );
  const distKm = parseFloat((path.distance / 1000).toFixed(1));

  return { coords, distKm };
}

// ─── UNIFIED ROUTE FUNCTION ───
export async function routeWaypoints(
  waypoints: Coordinate[],
  difficulty: DifficultyId,
): Promise<RouteResult> {
  if (ROUTING_ENGINE === 'graphhopper') {
    return routeViaGraphHopper(waypoints, difficulty);
  }
  return routeViaBRouter(waypoints, difficulty);
}

// ─── FALLBACK: straight lines ───
export function straightLineFallback(waypoints: Coordinate[]): RouteResult {
  const closed = [...waypoints, waypoints[0]];
  return { coords: closed, distKm: null };
}
