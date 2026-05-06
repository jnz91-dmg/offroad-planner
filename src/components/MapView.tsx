'use client';

import { useEffect, useRef, useMemo, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { TILE_LAYERS, DEFAULT_TILE_LAYER, OVERLAY_LAYERS } from '@/lib/config';
import { usePlannerStore } from '@/stores/planner';
import type { Coordinate, SurfaceSegment } from '@/lib/types';
import type { POI } from '@/services/pois';
import { SURFACES } from '@/services/surface';
import { reverseGeocode } from '@/services/geocoding';

// ─── Draggable Marker ───
function DraggableMarker({
  position,
  index,
  isStart,
  onDragEnd,
}: {
  position: Coordinate;
  index: number;
  isStart: boolean;
  onDragEnd: (index: number, lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker>(null);

  const icon = useMemo(
    () =>
      L.divIcon({
        className: '',
        html: `<div class="wp-marker ${isStart ? 'start' : 'normal'}">${isStart ? 'GO' : index}</div>`,
        iconSize: [isStart ? 32 : 28, isStart ? 32 : 28],
        iconAnchor: [isStart ? 16 : 14, isStart ? 16 : 14],
      }),
    [index, isStart],
  );

  const eventHandlers = useMemo(
    () => ({
      dragstart() {
        const marker = markerRef.current;
        if (!marker) return;
        const el = marker.getElement()?.querySelector('.wp-marker');
        if (el) el.classList.add('dragging');
      },
      dragend() {
        const marker = markerRef.current;
        if (!marker) return;
        const el = marker.getElement()?.querySelector('.wp-marker');
        if (el) el.classList.remove('dragging');
        const pos = marker.getLatLng();
        onDragEnd(index, pos.lat, pos.lng);
      },
    }),
    [index, onDragEnd],
  );

  return (
    <Marker
      position={position}
      draggable
      icon={icon}
      zIndexOffset={isStart ? 1000 : 0}
      eventHandlers={eventHandlers}
      ref={markerRef}
    />
  );
}

// ─── GRADIENT COLORING ───
// DMD2-style color bands based on absolute gradient percentage
const GRADIENT_BANDS = [
  { max: 3, color: '#22c55e' },   // green: flat / gentle
  { max: 6, color: '#eab308' },   // yellow: moderate
  { max: 9, color: '#f97316' },   // orange: steep
  { max: Infinity, color: '#ef4444' }, // red: very steep
];

function gradientColor(percent: number): string {
  const abs = Math.abs(percent);
  for (const b of GRADIENT_BANDS) if (abs <= b.max) return b.color;
  return GRADIENT_BANDS[GRADIENT_BANDS.length - 1].color;
}

// Haversine distance in meters between [lat, lng] points
function haversineM(a: Coordinate, b: Coordinate): number {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const sLat = Math.sin(dLat / 2), sLng = Math.sin(dLng / 2);
  const h = sLat * sLat + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * sLng * sLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

interface ColoredSegment {
  positions: [number, number][];
  color: string;
}

type GradientSegment = ColoredSegment;

/**
 * Build polyline segments colored by OSM surface class.
 * Uses BRouter's per-way-section data captured at routing time.
 */
function buildSurfaceSegments(
  coords: Coordinate[],
  segments: SurfaceSegment[],
): ColoredSegment[] | null {
  if (!segments || segments.length === 0) return null;
  const out: ColoredSegment[] = [];
  for (const seg of segments) {
    if (seg.startIdx >= coords.length || seg.endIdx >= coords.length) continue;
    if (seg.endIdx <= seg.startIdx) continue;
    const positions: [number, number][] = [];
    for (let i = seg.startIdx; i <= seg.endIdx; i++) {
      positions.push([coords[i][0], coords[i][1]]);
    }
    const surface = SURFACES[seg.surfaceClass as keyof typeof SURFACES] || SURFACES.unknown;
    out.push({ positions, color: surface.color });
  }
  return out.length > 0 ? out : null;
}

/**
 * Build color-graded polyline segments from a routed path.
 * Groups adjacent points with the same gradient bucket into single segments
 * to reduce the number of rendered <Polyline> elements.
 * Returns null if any coord lacks elevation (falls back to single-color rendering).
 */
function buildGradientSegments(coords: Coordinate[]): GradientSegment[] | null {
  if (coords.length < 2) return null;
  // Bail if no elevation data on any point
  if (!coords.every((c) => c.length >= 3 && typeof c[2] === 'number')) return null;

  // Smooth gradient over 3-point window to dampen noise
  const WINDOW = 3;
  const colors: string[] = [];
  for (let i = 1; i < coords.length; i++) {
    let totalDist = 0, totalRise = 0;
    const lo = Math.max(0, i - WINDOW), hi = Math.min(coords.length - 1, i + WINDOW - 1);
    for (let j = lo; j < hi; j++) {
      const d = haversineM(coords[j], coords[j + 1]);
      if (d === 0) continue;
      totalDist += d;
      totalRise += (coords[j + 1][2] as number) - (coords[j][2] as number);
    }
    const pct = totalDist > 0 ? (totalRise / totalDist) * 100 : 0;
    colors.push(gradientColor(pct));
  }

  // Group consecutive same-color segments
  const segments: GradientSegment[] = [];
  let currentColor = colors[0];
  let currentPositions: [number, number][] = [[coords[0][0], coords[0][1]]];
  for (let i = 0; i < colors.length; i++) {
    if (colors[i] !== currentColor) {
      // Close segment at the shared point, then start new one from that point
      currentPositions.push([coords[i][0], coords[i][1]]);
      segments.push({ positions: currentPositions, color: currentColor });
      currentColor = colors[i];
      currentPositions = [[coords[i][0], coords[i][1]]];
    }
    currentPositions.push([coords[i + 1][0], coords[i + 1][1]]);
  }
  segments.push({ positions: currentPositions, color: currentColor });
  return segments;
}

// ─── POI icon SVGs (emoji-style symbols) ───
const POI_ICONS: Record<POI['kind'], { symbol: string; color: string }> = {
  peak: { symbol: '\u25B2', color: '#a78bfa' },          // ▲ triangle
  pass: { symbol: '\u26F0', color: '#facc15' },          // ⛰ mountain
  viewpoint: { symbol: '\u{1F441}', color: '#60a5fa' },  // 👁 eye
  border: { symbol: '\u{1F6A7}', color: '#f87171' },     // 🚧 barrier
  fuel: { symbol: '⛽', color: '#fbbf24' },          // ⛽ fuel pump
  lodging: { symbol: '\u{1F3E8}', color: '#34d399' },    // 🏨 hotel
  water: { symbol: '\u{1F4A7}', color: '#38bdf8' },      // 💧 droplet
  mechanic: { symbol: '\u{1F527}', color: '#94a3b8' },   // 🔧 wrench
  food: { symbol: '\u{1F374}', color: '#fb923c' },       // 🍴 fork & knife
};

function POIMarker({ poi }: { poi: POI }) {
  const { symbol, color } = POI_ICONS[poi.kind];
  const icon = useMemo(
    () =>
      L.divIcon({
        className: '',
        html: `<div class="poi-marker" style="background:${color}">${symbol}</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
    [symbol, color],
  );
  const label =
    poi.name + (poi.elevation ? ` (${poi.elevation}m)` : '');

  return (
    <Marker position={[poi.lat, poi.lng]} icon={icon} interactive>
      <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
        {label}
      </Tooltip>
    </Marker>
  );
}

// ─── Map click → set start location ───
// Listens for clicks on the map background (marker clicks don't propagate),
// updates the start location immediately with raw coords, then resolves the
// place name via reverse geocoding. Toast surfaces friendly status to user.
function MapClickHandler() {
  const setStartLocation = usePlannerStore((s) => s.setStartLocation);
  const setError = usePlannerStore((s) => s.setError);
  const reqIdRef = useRef(0);

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      // Round for a stable display while we await the name
      const latStr = lat.toFixed(5);
      const lngStr = lng.toFixed(5);
      const placeholder = `${latStr}, ${lngStr}`;
      setStartLocation(lat, lng, placeholder);
      setError('Locating...');

      const myReqId = ++reqIdRef.current;
      reverseGeocode(lat, lng)
        .then((res) => {
          // Bail if a newer click superseded this one
          if (myReqId !== reqIdRef.current) return;
          if (res) {
            setStartLocation(lat, lng, res.shortName);
            setError(`Start set: ${res.shortName}`);
          } else {
            setError(`Start set: ${placeholder}`);
          }
        })
        .catch(() => {
          if (myReqId !== reqIdRef.current) return;
          setError(`Start set: ${placeholder}`);
        });
    },
  });

  return null;
}

// ─── Fit bounds helper ───
// Uses routed coords (full path) for bounds so the entire route is visible,
// falls back to waypoints if no route yet.
function FitBounds({ routedCoords, waypoints }: { routedCoords: Coordinate[] | null; waypoints: Coordinate[] }) {
  const map = useMap();

  useEffect(() => {
    const pts = routedCoords && routedCoords.length > 1 ? routedCoords : waypoints;
    if (pts.length === 0) return;
    const bounds = L.latLngBounds(pts.map((p) => L.latLng(p[0], p[1])));
    map.fitBounds(bounds.pad(0.12));
  }, [map, routedCoords, waypoints]);

  return null;
}

// ─── Main Map Component ───
interface MapViewProps {
  center: Coordinate;
  routedCoords: Coordinate[] | null;
  guideWaypoints: Coordinate[] | null;
  generated: boolean;
  onWaypointDragEnd: (index: number, lat: number, lng: number) => void;
}

export default function MapView({
  center,
  routedCoords,
  guideWaypoints,
  generated,
  onWaypointDragEnd,
}: MapViewProps) {
  const tileLayerId = usePlannerStore((s) => s.tileLayer);
  const tileConfig = TILE_LAYERS[tileLayerId] || TILE_LAYERS[DEFAULT_TILE_LAYER];
  const overlays = usePlannerStore((s) => s.overlays);
  const pois = usePlannerStore((s) => s.pois);
  const showPois = usePlannerStore((s) => s.showPois);
  const enabledPoiCategories = usePlannerStore((s) => s.enabledPoiCategories);
  const coloringMode = usePlannerStore((s) => s.coloringMode);
  const routedSegments = usePlannerStore((s) => s.routedSegments);

  const handleDragEnd = useCallback(
    (index: number, lat: number, lng: number) => {
      onWaypointDragEnd(index, lat, lng);
    },
    [onWaypointDragEnd],
  );

  if (!generated) {
    return (
      <div className="placeholder">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,.1)"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
          <path d="M9 3v15M15 6v15" />
        </svg>
        <span>Generate to see route on map</span>
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={10}
      zoomControl={true}
      attributionControl={true}
      style={{ width: '100%', height: '100%' }}
    >
      <MapClickHandler />

      <TileLayer
        key={tileLayerId}
        url={tileConfig.url}
        maxZoom={tileConfig.maxZoom}
        attribution={tileConfig.attribution}
      />

      {/* Transparent labels overlay (e.g., place names on satellite) */}
      {tileConfig.labelLayer && (
        <TileLayer
          key={`${tileLayerId}-labels`}
          url={tileConfig.labelLayer.url}
          maxZoom={tileConfig.labelLayer.maxZoom}
          opacity={tileConfig.labelLayer.opacity ?? 1}
          zIndex={400}
        />
      )}

      {/* User-toggled overlay layers (Waymarked Trails cycling/hiking/mtb) */}
      {overlays.map((id) => {
        const cfg = OVERLAY_LAYERS[id];
        if (!cfg) return null;
        return (
          <TileLayer
            key={id}
            url={cfg.url}
            maxZoom={cfg.maxZoom}
            opacity={cfg.opacity ?? 1}
            attribution={cfg.attribution}
            zIndex={350}
          />
        );
      })}

      {/* Route — colored by either gradient (steepness) or surface (track grade) */}
      {(() => {
        if (!routedCoords || routedCoords.length < 2) return null;
        const segments =
          coloringMode === 'surface'
            ? buildSurfaceSegments(routedCoords, routedSegments || [])
            : buildGradientSegments(routedCoords);

        if (segments) {
          return (
            <>
              {/* Glow underneath (single muted polyline) */}
              <Polyline
                positions={routedCoords.map((c) => [c[0], c[1]] as [number, number])}
                pathOptions={{
                  color: '#000',
                  weight: 10,
                  opacity: 0.2,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              {segments.map((seg, i) => (
                <Polyline
                  key={i}
                  positions={seg.positions}
                  pathOptions={{
                    color: seg.color,
                    weight: 4.5,
                    opacity: 0.95,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              ))}
            </>
          );
        }

        // Fallback: no elevation → single-color polyline (matches old behavior)
        const plain = routedCoords.map((c) => [c[0], c[1]] as [number, number]);
        return (
          <>
            <Polyline positions={plain} pathOptions={{ color: 'var(--accent)', weight: 10, opacity: 0.12, lineCap: 'round', lineJoin: 'round' }} />
            <Polyline positions={plain} pathOptions={{ color: 'var(--accent)', weight: 3.5, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }} />
          </>
        );
      })()}

      {/* POI markers — filtered by per-category visibility */}
      {showPois && pois.filter((p) => enabledPoiCategories.includes(p.kind)).map((poi) => <POIMarker key={poi.id} poi={poi} />)}

      {/* Draggable waypoint markers */}
      {guideWaypoints?.map((wp, i) => (
        <DraggableMarker
          key={i}
          position={wp}
          index={i}
          isStart={i === 0}
          onDragEnd={handleDragEnd}
        />
      ))}

      {/* Fit bounds */}
      {guideWaypoints && guideWaypoints.length > 0 && (
        <FitBounds routedCoords={routedCoords} waypoints={guideWaypoints} />
      )}
    </MapContainer>
  );
}
