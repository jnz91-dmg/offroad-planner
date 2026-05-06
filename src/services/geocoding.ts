/**
 * Forward geocoding via Nominatim (OpenStreetMap).
 * Free, no API key needed.
 *
 * Usage policy: https://operations.osmfoundation.org/policies/nominatim/
 *  - Max 1 request/second (we debounce client-side)
 *  - Must provide valid User-Agent / Referer (browsers send Referer automatically)
 *  - No heavy use / bulk geocoding
 */

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string; // long form (e.g., "Nova Gorica, Upravna enota Nova Gorica, Slovenia")
  shortName: string;   // short form (e.g., "Nova Gorica")
  type: string;        // place type (city, town, village, residential, etc.)
  importance: number;  // 0-1, relevance
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

/**
 * Search for places matching a query string.
 * Returns top results ranked by relevance.
 */
export async function geocodeSearch(
  query: string,
  limit: number = 6,
  signal?: AbortSignal,
): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 2) return [];

  const params = new URLSearchParams({
    q: query.trim(),
    format: 'jsonv2',
    limit: String(limit),
    addressdetails: '1',
    'accept-language': navigator.language || 'en',
  });

  const resp = await fetch(`${NOMINATIM_URL}?${params.toString()}`, { signal });
  if (!resp.ok) throw new Error(`Nominatim error: ${resp.status}`);
  const data = (await resp.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    name?: string;
    type: string;
    importance: number;
    address?: Record<string, string>;
  }>;

  return data.map((r) => ({
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    displayName: r.display_name,
    shortName: buildShortName(r),
    type: r.type,
    importance: r.importance,
  }));
}

/**
 * Reverse geocode a lat/lng to a place name via Nominatim.
 * Returns null if the API has no result for the coordinates (e.g. open ocean).
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<GeocodingResult | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'jsonv2',
    zoom: '14',
    addressdetails: '1',
    'accept-language': navigator.language || 'en',
  });

  const resp = await fetch(`${NOMINATIM_REVERSE_URL}?${params.toString()}`, { signal });
  if (!resp.ok) throw new Error(`Nominatim error: ${resp.status}`);
  const data = (await resp.json()) as {
    lat?: string;
    lon?: string;
    display_name?: string;
    name?: string;
    type?: string;
    importance?: number;
    address?: Record<string, string>;
    error?: string;
  };

  if (!data || data.error || !data.display_name) return null;

  return {
    lat: data.lat ? parseFloat(data.lat) : lat,
    lng: data.lon ? parseFloat(data.lon) : lng,
    displayName: data.display_name,
    shortName: buildShortName({
      name: data.name,
      display_name: data.display_name,
      address: data.address,
    }),
    type: data.type ?? 'unknown',
    importance: data.importance ?? 0,
  };
}

function buildShortName(r: {
  name?: string;
  display_name: string;
  address?: Record<string, string>;
}): string {
  // Prefer the primary name, then city/town/village/hamlet, then first part of display name
  if (r.name) return r.name;
  const a = r.address || {};
  const primary =
    a.city || a.town || a.village || a.hamlet || a.suburb || a.neighbourhood ||
    a.road || a.attraction || a.tourism;
  if (primary) {
    const country = a.country_code?.toUpperCase();
    return country ? `${primary}, ${country}` : primary;
  }
  // Fallback: first 2 parts of comma-separated display name
  return r.display_name.split(',').slice(0, 2).join(',').trim();
}
