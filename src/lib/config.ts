import type { Direction, DifficultyConfig, DifficultyId, RouteCharacter, TileLayerConfig } from './types';

// ─── API KEYS ───
// GraphHopper: https://www.graphhopper.com/ (free: 500 req/day)
// Set to null to use BRouter (free, no key, fewer features)
export const GRAPHHOPPER_API_KEY: string | null = null;

// ─── ROUTING ENGINE ───
export const ROUTING_ENGINE: 'graphhopper' | 'brouter' =
  GRAPHHOPPER_API_KEY ? 'graphhopper' : 'brouter';

// DMD2's BRouter instance hosts motorcycle-tuned offroad-* profiles.
// brouter.de is the official public server with the standard profiles (trekking, mtb, ...).
// We try DMD2 first (better offroad quality) then fall back to brouter.de.
export const BROUTER_BASE = 'https://router.advhub.net/api/brouter/brouter';
export const BROUTER_FALLBACK = 'https://brouter.de/brouter';
export const GRAPHHOPPER_BASE = 'https://graphhopper.com/api/1/route';

// ─── COMPASS DIRECTIONS ───
export const DIRECTIONS: Direction[] = [
  { label: 'N', short: 'North', angle: 0 },
  { label: 'NE', short: 'Northeast', angle: 45 },
  { label: 'E', short: 'East', angle: 90 },
  { label: 'SE', short: 'Southeast', angle: 135 },
  { label: 'S', short: 'South', angle: 180 },
  { label: 'SW', short: 'Southwest', angle: 225 },
  { label: 'W', short: 'West', angle: 270 },
  { label: 'NW', short: 'Northwest', angle: 315 },
];

// ─── DIFFICULTY PROFILES ───
export const DIFFICULTIES: Record<DifficultyId, DifficultyConfig> = {
  easy: {
    label: 'Easy',
    desc: 'Gravel roads, farm tracks',
    color: '#4ade80',
    jitter: 0.12,
    guidePoints: 5,
    brouter: 'offroad-easy',
    brouterFallback: 'trekking',
    graphhopper: 'car',
    ghCustomModel: {
      priority: [
        { if: 'road_class == MOTORWAY', multiply_by: 0 },
        { if: 'road_class == PRIMARY', multiply_by: 0.3 },
        { if: 'surface == UNPAVED', multiply_by: 1.5 },
        { if: 'surface == GRAVEL', multiply_by: 1.8 },
      ],
    },
  },
  medium: {
    label: 'Medium',
    desc: 'Forest tracks, moderate terrain',
    color: '#facc15',
    jitter: 0.25,
    guidePoints: 7,
    brouter: 'offroad-medium',
    brouterFallback: 'trekking',
    graphhopper: 'mtb',
    ghCustomModel: null,
  },
  hard: {
    label: 'Hard',
    desc: 'Technical singletrack, steep',
    color: '#f87171',
    jitter: 0.4,
    guidePoints: 10,
    brouter: 'offroad-hard',
    brouterFallback: 'mtb',
    graphhopper: 'mtb',
    ghCustomModel: {
      priority: [
        { if: 'road_class == TRACK', multiply_by: 1.5 },
        { if: 'road_class == PATH', multiply_by: 2.0 },
        { if: 'surface == UNPAVED', multiply_by: 1.8 },
      ],
    },
  },
};

// ─── MAP CONFIG ───
export const TILE_LAYERS: Record<string, TileLayerConfig & { label: string }> = {
  opentopomap: {
    label: 'Topo',
    url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
    maxZoom: 17,
    attribution:
      '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
  },
  cyclosm: {
    label: 'Cycle',
    url: 'https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    maxZoom: 18,
    attribution:
      '&copy; <a href="https://www.cyclosm.org">CyclOSM</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
  },
  osm: {
    label: 'Street',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 18,
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, Earthstar Geographics',
    // CARTO positron labels overlay — adds town/village names
    labelLayer: {
      url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_only_labels/{z}/{x}/{y}.png',
      maxZoom: 18,
      opacity: 0.75,
    },
  },
};

export const DEFAULT_TILE_LAYER = 'opentopomap';

// Overlay layers — transparent tiles shown on top of the base layer.
// User can toggle these independently (multiple can be active at once).
export const OVERLAY_LAYERS: Record<string, { label: string; url: string; maxZoom: number; attribution: string; opacity?: number }> = {
  cycling: {
    label: 'Cycling',
    url: 'https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png',
    maxZoom: 18,
    attribution: '&copy; <a href="https://waymarkedtrails.org/">Waymarked Trails</a>',
    opacity: 0.8,
  },
  hiking: {
    label: 'Hiking',
    url: 'https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png',
    maxZoom: 18,
    attribution: '&copy; <a href="https://waymarkedtrails.org/">Waymarked Trails</a>',
    opacity: 0.8,
  },
  mtb: {
    label: 'MTB',
    url: 'https://tile.waymarkedtrails.org/mtb/{z}/{x}/{y}.png',
    maxZoom: 18,
    attribution: '&copy; <a href="https://waymarkedtrails.org/">Waymarked Trails</a>',
    opacity: 0.8,
  },
};

// ─── ROUTE CHARACTER ───
// Controls how adventurous the generated route is:
// - Smooth: through-routes, fewer detours
// - Balanced: default mix
// - Spurs: encourages out-and-back excursions on side roads
export const ROUTE_CHARACTERS: Record<RouteCharacter, { label: string; desc: string; jitterMultiplier: number }> = {
  smooth: { label: 'Smooth', desc: 'Through-routes, less backtracking', jitterMultiplier: 0.85 },
  balanced: { label: 'Balanced', desc: 'Default mix', jitterMultiplier: 1.0 },
  spurs: { label: 'Spurs', desc: 'Exploration detours', jitterMultiplier: 1.6 },
};
export const DEFAULT_ROUTE_CHARACTER: RouteCharacter = 'balanced';

// ─── DEFAULTS ───
export const DEFAULTS = {
  distance: 100,
  heading: 225,
  difficulty: 'medium' as DifficultyId,
  lat: 45.955,
  lng: 13.652,
  locationName: 'Nova Gorica',
  minDistance: 20,
  maxDistance: 300,
  distanceStep: 5,
};
