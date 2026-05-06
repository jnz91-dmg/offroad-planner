'use client';

import { TILE_LAYERS, OVERLAY_LAYERS } from '@/lib/config';
import { usePlannerStore } from '@/stores/planner';
import PoiCategoryToggle from './PoiCategoryToggle';

export default function TileLayerSwitcher() {
  const tileLayer = usePlannerStore((s) => s.tileLayer);
  const setTileLayer = usePlannerStore((s) => s.setTileLayer);
  const overlays = usePlannerStore((s) => s.overlays);
  const toggleOverlay = usePlannerStore((s) => s.toggleOverlay);
  const coloringMode = usePlannerStore((s) => s.coloringMode);
  const setColoringMode = usePlannerStore((s) => s.setColoringMode);
  const generated = usePlannerStore((s) => s.generated);

  return (
    <div className="map-controls">
      {/* Base layer (mutually exclusive) */}
      <div className="tile-switcher">
        {Object.entries(TILE_LAYERS).map(([id, cfg]) => (
          <button
            key={id}
            className={`tile-btn ${tileLayer === id ? 'active' : ''}`}
            onClick={() => setTileLayer(id)}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Overlay toggles (multiple allowed) */}
      <div className="tile-switcher overlay-switcher">
        <span className="tile-switcher-label">Overlays</span>
        {Object.entries(OVERLAY_LAYERS).map(([id, cfg]) => (
          <button
            key={id}
            className={`tile-btn ${overlays.includes(id) ? 'active' : ''}`}
            onClick={() => toggleOverlay(id)}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Per-category POI visibility toggles */}
      <PoiCategoryToggle />

      {/* Route coloring mode — only meaningful when a route exists */}
      {generated && (
        <div className="tile-switcher overlay-switcher">
          <span className="tile-switcher-label">Route color</span>
          <button
            className={`tile-btn ${coloringMode === 'gradient' ? 'active' : ''}`}
            onClick={() => setColoringMode('gradient')}
          >
            Gradient
          </button>
          <button
            className={`tile-btn ${coloringMode === 'surface' ? 'active' : ''}`}
            onClick={() => setColoringMode('surface')}
          >
            Surface
          </button>
        </div>
      )}
    </div>
  );
}
