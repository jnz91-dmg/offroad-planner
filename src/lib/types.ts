export type Coordinate = [number, number] | [number, number, number]; // [lat, lng] or [lat, lng, elevation]

export type RouteCharacter = 'smooth' | 'balanced' | 'spurs';

/** Per-segment surface info extracted from BRouter's WayTags. */
export interface SurfaceSegment {
  /** Index of the first coordinate in `coords` belonging to this segment. */
  startIdx: number;
  /** Index of the last coordinate (inclusive). */
  endIdx: number;
  /** Segment length in meters (as reported by BRouter). */
  distanceM: number;
  /** Raw OSM way-tag string from BRouter. */
  wayTags: string;
  /** Classified surface type. */
  surfaceClass: string;
}

export interface RouteResult {
  coords: Coordinate[];
  distKm: number | null;
  /** Per-segment OSM tags, if the routing engine provides them. */
  segments?: SurfaceSegment[];
}

export type ColoringMode = 'gradient' | 'surface';

export interface Direction {
  label: string;
  short: string;
  angle: number;
}

export interface DifficultyConfig {
  label: string;
  desc: string;
  color: string;
  jitter: number;
  guidePoints: number;
  brouter: string;
  /** Fallback profile on brouter.de if DMD2 server is unavailable. */
  brouterFallback: string;
  graphhopper: string;
  ghCustomModel: {
    priority: Array<{ if: string; multiply_by: number }>;
  } | null;
}

export type DifficultyId = 'easy' | 'medium' | 'hard';

export interface TileLayerConfig {
  url: string;
  maxZoom: number;
  attribution: string;
  /** Optional transparent labels overlay (e.g., place names on satellite). */
  labelLayer?: {
    url: string;
    maxZoom: number;
    opacity?: number;
  };
}
