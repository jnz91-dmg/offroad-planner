'use client';

import { useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ROUTING_ENGINE, DIRECTIONS } from '@/lib/config';
import { usePlannerStore } from '@/stores/planner';
import type { Coordinate, SurfaceSegment } from '@/lib/types';
import { generateGuideWaypoints, extractGuidePoints } from '@/services/waypoints';
import { routeWaypoints, generateRoundTrip, straightLineFallback } from '@/services/router';
import { downloadGPX } from '@/services/gpx';
import { fetchPOIsAlongRoute } from '@/services/pois';

import DistanceSlider from '@/components/DistanceSlider';
import DifficultyPicker from '@/components/DifficultyPicker';
import Compass from '@/components/Compass';
import LocationButton from '@/components/LocationButton';
import RouteInfo from '@/components/RouteInfo';
import RoutingOverlay from '@/components/RoutingOverlay';
import Toast from '@/components/Toast';
import ActionButtons from '@/components/ActionButtons';
import TileLayerSwitcher from '@/components/TileLayerSwitcher';
import RouteCharacterPicker from '@/components/RouteCharacterPicker';
import GradientLegend from '@/components/GradientLegend';
import Attribution from '@/components/Attribution';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function PlannerPage() {
  const store = usePlannerStore();
  const shuffleSeedRef = useRef(0);

  // ─── AUTO-DETECT LOCATION ON FIRST LOAD ───
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        usePlannerStore.getState().setStartLocation(
          pos.coords.latitude,
          pos.coords.longitude,
          'Current location',
        );
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  // ─── FETCH POIS WHEN ROUTE CHANGES ───
  const routedCoords = store.routedCoords;
  const routing = store.routing;
  useEffect(() => {
    if (!routedCoords || routedCoords.length < 2 || routing) return;
    let cancelled = false;
    (async () => {
      try {
        const pois = await fetchPOIsAlongRoute(routedCoords);
        if (!cancelled) usePlannerStore.getState().setPois(pois);
      } catch (err) {
        console.warn('POI fetch failed:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [routedCoords, routing]);

  // ─── ROUTE + DISPLAY (single attempt, used for waypoint drag) ───
  const performRouting = useCallback(
    async (guideWps: Coordinate[]) => {
      const { setRouting, setRouteData, setError, difficulty } =
        usePlannerStore.getState();
      setRouting(true);

      try {
        const result = await routeWaypoints(guideWps, difficulty);
        setRouteData(guideWps, result.coords, result.distKm, result.segments ?? null);
      } catch (err) {
        console.warn('Routing failed:', err);
        setError('Routing failed \u2014 showing straight lines');
        const fallback = straightLineFallback(guideWps);
        setRouteData(guideWps, fallback.coords, fallback.distKm, null);
      }

      setRouting(false);
    },
    [],
  );

  // ─── GENERATE WITH DISTANCE CONVERGENCE ───
  // Routes iteratively, adjusting radius until the routed distance is close to target.
  // Roads meander, so the initial straight-line radius usually yields a longer route.
  const generateAccurate = useCallback(async (seed: number) => {
    const { lat, lng, distance, heading, difficulty, routeCharacter, setRouting, setRouteData, setError } =
      usePlannerStore.getState();
    setRouting(true);

    const MAX_ATTEMPTS = 3;
    const TOLERANCE = 0.12; // within ±12% is good enough

    let radiusScale = 1.0;
    let bestResult: { wps: Coordinate[]; coords: Coordinate[]; distKm: number | null; segments: SurfaceSegment[] | null } | null = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const wps = generateGuideWaypoints(lat, lng, distance, heading, difficulty, radiusScale, seed, routeCharacter);
      try {
        const result = await routeWaypoints(wps, difficulty);
        const routed = result.distKm;

        // Track best result seen so far (closest to target)
        if (routed != null) {
          const currErr = Math.abs(routed - distance) / distance;
          const bestErr = bestResult?.distKm != null ? Math.abs(bestResult.distKm - distance) / distance : Infinity;
          if (currErr < bestErr) {
            bestResult = { wps, coords: result.coords, distKm: routed, segments: result.segments ?? null };
          }

          // Within tolerance → done
          if (currErr <= TOLERANCE) {
            setRouteData(wps, result.coords, routed, result.segments ?? null);
            setRouting(false);
            return;
          }

          // Adjust radius for next attempt: if route is 20% too long, shrink radius by ~20%
          const ratio = distance / routed;
          // Clamp the adjustment to avoid wild swings
          radiusScale *= Math.min(1.4, Math.max(0.6, ratio));
        } else {
          // No distance returned → use what we have
          bestResult = { wps, coords: result.coords, distKm: null, segments: result.segments ?? null };
        }
      } catch (err) {
        console.warn(`Attempt ${attempt + 1} failed:`, err);
      }
    }

    // Use best result found, or fall back to straight lines
    if (bestResult) {
      setRouteData(bestResult.wps, bestResult.coords, bestResult.distKm, bestResult.segments);
    } else {
      const wps = generateGuideWaypoints(lat, lng, distance, heading, difficulty, 1, seed, routeCharacter);
      const fallback = straightLineFallback(wps);
      setError('Routing failed \u2014 showing straight lines');
      setRouteData(wps, fallback.coords, fallback.distKm, null);
    }
    setRouting(false);
  }, []);

  // ─── GENERATE ───
  const handleGenerate = useCallback(async () => {
    const { lat, lng, distance, heading, difficulty, setRouting, setRouteData } =
      usePlannerStore.getState();

    if (ROUTING_ENGINE === 'graphhopper') {
      setRouting(true);
      try {
        const result = await generateRoundTrip(
          lat, lng, distance, heading, difficulty,
          shuffleSeedRef.current,
        );
        if (result) {
          const guideWps = extractGuidePoints(result.coords, difficulty);
          setRouteData(guideWps, result.coords, result.distKm, result.segments ?? null);
          setRouting(false);
          return;
        }
      } catch (err) {
        console.warn('GraphHopper round_trip failed, falling back:', err);
      }
      setRouting(false);
    }

    await generateAccurate(shuffleSeedRef.current);
  }, [generateAccurate]);

  // ─── SHUFFLE ───
  const handleShuffle = useCallback(async () => {
    shuffleSeedRef.current++;
    await generateAccurate(shuffleSeedRef.current);
  }, [generateAccurate]);

  // ─── DOWNLOAD ───
  const handleDownload = useCallback(() => {
    const s = usePlannerStore.getState();
    downloadGPX(
      s.routedCoords, s.guideWaypoints,
      s.distance, s.heading, s.difficulty, s.routedDistanceKm,
    );
  }, []);

  // ─── RESET ───
  const handleReset = useCallback(() => {
    usePlannerStore.getState().reset();
  }, []);

  // ─── WAYPOINT DRAG ───
  const handleWaypointDragEnd = useCallback(
    async (index: number, lat: number, lng: number) => {
      usePlannerStore.getState().updateGuideWaypoint(index, lat, lng);
      const wps = usePlannerStore.getState().guideWaypoints;
      if (wps) {
        await performRouting(wps);
      }
    },
    [performRouting],
  );

  const headingLabel =
    DIRECTIONS.find((d) => d.angle === store.heading)?.short || '';

  return (
    <div className="layout">
      {/* ─── LEFT PANEL: Controls ─── */}
      <div className="panel">
        <div className="header">
          <h1>Plan a Round Trip</h1>
          <div className="brand">RATATALABS</div>
        </div>

        <DistanceSlider />

        <div className="card">
          <LocationButton />
          <DifficultyPicker />
          <RouteCharacterPicker />
          <div className="comp-sec">
            <div className="comp-hdr">
              <span className="lbl">Head towards</span>
              <span className="val">{headingLabel}</span>
            </div>
            <div className="comp-wrap">
              <Compass />
            </div>
          </div>
        </div>

        <RouteInfo />

        <ActionButtons
          generated={store.generated}
          onGenerate={handleGenerate}
          onShuffle={handleShuffle}
          onDownload={handleDownload}
          onReset={handleReset}
        />

        <div className="coords">
          <span>{store.lat.toFixed(3)}&deg;N</span>
          <span>{store.lng.toFixed(3)}&deg;E</span>
        </div>

        <Attribution />
      </div>

      {/* ─── RIGHT PANEL: Map ─── */}
      <div className="map-panel">
        {store.generated && (
          <div className="map-badge">
            DRAG WAYPOINTS &middot; RE-ROUTES AUTOMATICALLY
          </div>
        )}
        <RoutingOverlay />
        <Toast />
        <TileLayerSwitcher />
        <MapView
          center={[store.lat, store.lng]}
          routedCoords={store.routedCoords}
          guideWaypoints={store.guideWaypoints}
          generated={store.generated}
          onWaypointDragEnd={handleWaypointDragEnd}
        />
        {store.generated && store.routedCoords && store.routedCoords.some((c) => c.length >= 3) && (
          <GradientLegend />
        )}
      </div>
    </div>
  );
}
