import { create } from 'zustand';
import { DEFAULTS, DEFAULT_TILE_LAYER, DEFAULT_ROUTE_CHARACTER } from '@/lib/config';
import type { ColoringMode, Coordinate, DifficultyId, RouteCharacter, SurfaceSegment } from '@/lib/types';
import type { POI, POIKind } from '@/services/pois';

/** Categories enabled by default — kept conservative to avoid clutter. */
const DEFAULT_ENABLED_POI_CATEGORIES: POIKind[] = [
  'peak',
  'pass',
  'viewpoint',
  'fuel',
  'water',
];

interface PlannerState {
  // Route params
  distance: number;
  heading: number;
  difficulty: DifficultyId;

  // Start location
  lat: number;
  lng: number;
  locationName: string;

  // Generated data
  guideWaypoints: Coordinate[] | null;
  routedCoords: Coordinate[] | null;
  routedDistanceKm: number | null;
  routedSegments: SurfaceSegment[] | null;

  // UI state
  generated: boolean;
  routing: boolean;
  errorMessage: string | null;
  tileLayer: string;
  overlays: string[]; // enabled overlay tile layer IDs (e.g. 'cycling', 'hiking')
  pois: POI[];
  showPois: boolean;
  enabledPoiCategories: POIKind[];
  routeCharacter: RouteCharacter;
  coloringMode: ColoringMode;

  // Actions
  setDistance: (km: number) => void;
  setHeading: (angle: number) => void;
  setDifficulty: (id: DifficultyId) => void;
  setStartLocation: (lat: number, lng: number, name: string) => void;
  setRouteData: (guideWps: Coordinate[], routedCoords: Coordinate[], distKm: number | null, segments?: SurfaceSegment[] | null) => void;
  updateGuideWaypoint: (index: number, lat: number, lng: number) => void;
  setRouting: (isRouting: boolean) => void;
  setError: (msg: string | null) => void;
  setTileLayer: (id: string) => void;
  toggleOverlay: (id: string) => void;
  setPois: (pois: POI[]) => void;
  toggleShowPois: () => void;
  togglePoiCategory: (kind: POIKind) => void;
  setRouteCharacter: (c: RouteCharacter) => void;
  setColoringMode: (m: ColoringMode) => void;
  reset: () => void;
}

export const usePlannerStore = create<PlannerState>((set, get) => ({
  distance: DEFAULTS.distance,
  heading: DEFAULTS.heading,
  difficulty: DEFAULTS.difficulty,
  lat: DEFAULTS.lat,
  lng: DEFAULTS.lng,
  locationName: DEFAULTS.locationName,
  guideWaypoints: null,
  routedCoords: null,
  routedDistanceKm: null,
  routedSegments: null,
  generated: false,
  routing: false,
  errorMessage: null,
  tileLayer: DEFAULT_TILE_LAYER,
  overlays: [],
  pois: [],
  showPois: true,
  enabledPoiCategories: [...DEFAULT_ENABLED_POI_CATEGORIES],
  routeCharacter: DEFAULT_ROUTE_CHARACTER,
  coloringMode: 'gradient',

  setDistance: (km) => set({ distance: km }),
  setHeading: (angle) => set({ heading: angle }),
  setDifficulty: (id) => set({ difficulty: id }),

  setStartLocation: (lat, lng, name) =>
    set({ lat, lng, locationName: name }),

  setRouteData: (guideWps, routedCoords, distKm, segments) =>
    set({
      guideWaypoints: guideWps,
      routedCoords,
      routedDistanceKm: distKm,
      routedSegments: segments ?? null,
      generated: true,
    }),

  updateGuideWaypoint: (index, lat, lng) => {
    const wps = get().guideWaypoints;
    if (!wps) return;
    const updated = [...wps];
    updated[index] = [lat, lng];
    set({ guideWaypoints: updated });
  },

  setRouting: (isRouting) => set({ routing: isRouting }),
  setError: (msg) => set({ errorMessage: msg }),
  setTileLayer: (id) => set({ tileLayer: id }),
  toggleOverlay: (id) =>
    set((s) => ({
      overlays: s.overlays.includes(id)
        ? s.overlays.filter((o) => o !== id)
        : [...s.overlays, id],
    })),
  setPois: (pois) => set({ pois }),
  toggleShowPois: () => set((s) => ({ showPois: !s.showPois })),
  togglePoiCategory: (kind) =>
    set((s) => ({
      enabledPoiCategories: s.enabledPoiCategories.includes(kind)
        ? s.enabledPoiCategories.filter((k) => k !== kind)
        : [...s.enabledPoiCategories, kind],
    })),
  setRouteCharacter: (c) => set({ routeCharacter: c }),
  setColoringMode: (m) => set({ coloringMode: m }),

  reset: () =>
    set({
      guideWaypoints: null,
      routedCoords: null,
      routedDistanceKm: null,
      routedSegments: null,
      generated: false,
      routing: false,
      errorMessage: null,
      pois: [],
    }),
}));
