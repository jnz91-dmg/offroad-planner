import type { Coordinate } from '@/lib/types';

export type POIKind =
  | 'peak'
  | 'pass'
  | 'viewpoint'
  | 'border'
  | 'fuel'
  | 'lodging'
  | 'water'
  | 'mechanic'
  | 'food';

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
  const a = `around:${radiusM},${latlngs}`;

  return `
    [out:json][timeout:25];
    (
      node["natural"="peak"](${a});
      node["mountain_pass"="yes"](${a});
      node["tourism"="viewpoint"](${a});
      node["barrier"="border_control"](${a});
      node["amenity"="border_control"](${a});
      node["amenity"="fuel"](${a});
      node["tourism"~"^(hotel|guest_house|camp_site|chalet|hostel|motel)$"](${a});
      node["amenity"="drinking_water"](${a});
      node["shop"~"^(motorcycle|car_repair)$"](${a});
      node["amenity"~"^(restaurant|cafe|pub|fast_food)$"](${a});
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

const LODGING_TOURISM = new Set(['hotel', 'guest_house', 'camp_site', 'chalet', 'hostel', 'motel']);
const MECHANIC_SHOP = new Set(['motorcycle', 'car_repair']);
const FOOD_AMENITY = new Set(['restaurant', 'cafe', 'pub', 'fast_food']);

function classify(t: Record<string, string>): POIKind | null {
  if (t.barrier === 'border_control' || t.amenity === 'border_control') return 'border';
  if (t.mountain_pass === 'yes') return 'pass';
  if (t.tourism === 'viewpoint') return 'viewpoint';
  if (t.natural === 'peak') return 'peak';
  if (t.amenity === 'fuel') return 'fuel';
  if (t.tourism && LODGING_TOURISM.has(t.tourism)) return 'lodging';
  if (t.amenity === 'drinking_water') return 'water';
  if (t.shop && MECHANIC_SHOP.has(t.shop)) return 'mechanic';
  if (t.amenity && FOOD_AMENITY.has(t.amenity)) return 'food';
  return null;
}

function defaultName(kind: POIKind): string {
  switch (kind) {
    case 'border': return 'Border crossing';
    case 'pass': return 'Pass';
    case 'viewpoint': return 'Viewpoint';
    case 'peak': return 'Peak';
    case 'fuel': return 'Fuel station';
    case 'lodging': return 'Lodging';
    case 'water': return 'Drinking water';
    case 'mechanic': return 'Mechanic';
    case 'food': return 'Food';
  }
}

/**
 * Fetch POIs (peaks, passes, viewpoints, borders, fuel, lodging, water, mechanics, food)
 * along the route.
 */
export async function fetchPOIsAlongRoute(coords: Coordinate[]): Promise<POI[]> {
  if (coords.length < 2) return [];

  // Search within 500m of the route
  const query = buildAroundQuery(coords, 500);
  const elements = await tryOverpass(query);
  if (!elements) return [];

  const out: POI[] = [];
  for (const el of elements) {
    const e = el as { id?: number; lat?: number; lon?: number; tags?: Record<string, string> };
    if (e.lat == null || e.lon == null || e.id == null) continue;
    const t = e.tags || {};
    const kind = classify(t);
    if (!kind) continue;
    const elevation = t.ele ? parseInt(t.ele, 10) : undefined;
    out.push({
      id: String(e.id),
      kind,
      lat: e.lat,
      lng: e.lon,
      name: t.name || defaultName(kind),
      elevation: Number.isFinite(elevation) ? elevation : undefined,
    });
  }
  return out;
}
