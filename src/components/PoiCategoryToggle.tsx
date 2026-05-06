'use client';

import { usePlannerStore } from '@/stores/planner';
import type { POIKind } from '@/services/pois';

/** UI metadata for each POI category. Letter symbols render reliably in divIcons. */
export const POI_CATEGORY_META: Record<POIKind, { label: string; letter: string; color: string }> = {
  peak: { label: 'Peaks', letter: 'P', color: '#a78bfa' },
  pass: { label: 'Passes', letter: 'A', color: '#facc15' },
  viewpoint: { label: 'Views', letter: 'V', color: '#60a5fa' },
  border: { label: 'Borders', letter: 'B', color: '#f87171' },
  fuel: { label: 'Fuel', letter: 'F', color: '#3b82f6' },
  lodging: { label: 'Lodging', letter: 'H', color: '#10b981' },
  water: { label: 'Water', letter: 'W', color: '#06b6d4' },
  mechanic: { label: 'Mechanic', letter: 'M', color: '#f59e0b' },
  food: { label: 'Food', letter: 'E', color: '#ec4899' },
};

const POI_ORDER: POIKind[] = [
  'peak',
  'pass',
  'viewpoint',
  'border',
  'fuel',
  'water',
  'lodging',
  'food',
  'mechanic',
];

export default function PoiCategoryToggle() {
  const enabled = usePlannerStore((s) => s.enabledPoiCategories);
  const toggle = usePlannerStore((s) => s.togglePoiCategory);

  return (
    <div className="tile-switcher overlay-switcher">
      <span className="tile-switcher-label">POIs</span>
      {POI_ORDER.map((kind) => {
        const meta = POI_CATEGORY_META[kind];
        const isOn = enabled.includes(kind);
        return (
          <button
            key={kind}
            type="button"
            className={`tile-btn ${isOn ? 'active' : ''}`}
            style={isOn ? { background: meta.color, color: '#111' } : undefined}
            title={meta.label}
            onClick={() => toggle(kind)}
          >
            {meta.letter}
          </button>
        );
      })}
    </div>
  );
}
