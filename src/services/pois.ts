import type { Coordinate } from '@/lib/types';

export type POIKind = 'peak' | 'pass' | 'viewpoint' | 'border';

export interface POI {
  id: string;
  kind: POIKind;
  lat: number;
  lng: number;
  name: string;
  elevation?: number;
}

// Multiple Overpass mirrors for resilience (public servers get rate-limited)
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

/**
 * Build Overpass queries using "around" filter along route coordinates.
 * This is much faster than bbox queries for long routes — it only searches
 * within N meters of the actual route line instead of the entire bounding box.
 */
function buildAroundQuery(coords: Coordinate[], radiusM: number): string {
  // Sample up to ~80 points along the route to keep query size manageable
  const maxPoints = 80;
  const step = Math.max(1, Math.floor(coords.length / maxPoints));
  const sampled: Coordinate[] = [];
  for (let i = 0; i < coords.length; i += step) sampled.push(coords[i]);

  const latlngs = sampled.map((c) => `${c[0].toFixed(5)},${c[1].toFixed(5)}`).join(',');

  return `
    [out:json][timeout:25];
    (
      node["natural"="peak"](around:${radiusM},${latlngs});
      node["mountain_pass"="yes"](around:${radiusM},${latlngs});
      node["tourism"="viewpoint"](around:${radiusM},${latlngs});
      node["barrier"="border_control"](around:${radiusM},${latlngs});
      node["amenity"="border_control"](around:${radiusM},${latlngs});
    );
    out body;
  `.replace(/\s+/g, ' ').trim();
}

async function tryOverpass(query: string): Promise<unknown[] | null> {
  for (const url of OVERPASS_MIRRORS) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      return data.elements || [];
    } catch {
      // try next mirror
    }
  }
  return null;
}

/**
 * Fetch POIs (peaks, mountain passes, viewpoints, border crossings) along the route.
 */
export async function fetchPOIsAlongRoute(coords: Coordinate[]): Promise<POI[]> {
  if (coords.length < 2) return [];

  // Search within 500m of the route
  const query = buildAroundQuery(coords, 500);
  const elements = await tryOverpass(query);
  if (!elements) return [];

  return elements
    .filter((el): el is { id: number; lat: number; lon: number; tags: Record<string, string> } => {
      const e = el as { lat?: number; lon?: number };
      return e.lat != null && e.lon != null;
    })
    .map((el): POI => {
      const t = el.tags || {};
      const kind: POIKind =
        t.barrier === 'border_control' || t.amenity === 'border_control' ? 'border'
        : t.mountain_pass === 'yes' ? 'pass'
        : t.tourism === 'viewpoint' ? 'viewpoint'
        : 'peak';
      const elevation = t.ele ? parseInt(t.ele, 10) : undefined;
      return {
        id: String(el.id),
        kind,
        lat: el.lat,
        lng: el.lon,
        name: t.name || (kind === 'border' ? 'Border crossing' : kind === 'pass' ? 'Pass' : kind === 'viewpoint' ? 'Viewpoint' : 'Peak'),
        elevation,
      };
    });
}
