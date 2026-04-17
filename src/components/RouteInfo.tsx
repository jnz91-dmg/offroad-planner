'use client';

import { DIFFICULTIES } from '@/lib/config';
import { usePlannerStore } from '@/stores/planner';
import { SURFACES } from '@/services/surface';
import type { SurfaceClass } from '@/services/surface';
import type { SurfaceSegment } from '@/lib/types';

/** Aggregate segment distances by surface class. Returns km per class. */
function aggregateSurface(segments: SurfaceSegment[]): Array<{ cls: SurfaceClass; km: number }> {
  const totals: Partial<Record<SurfaceClass, number>> = {};
  for (const seg of segments) {
    const cls = seg.surfaceClass as SurfaceClass;
    totals[cls] = (totals[cls] ?? 0) + seg.distanceM;
  }
  const entries = Object.entries(totals) as Array<[SurfaceClass, number]>;
  return entries
    .map(([cls, m]) => ({ cls, km: m / 1000 }))
    .filter((e) => e.km >= 0.5) // hide sub-500m dust
    .sort((a, b) => b.km - a.km);
}

export default function RouteInfo() {
  const routedDistanceKm = usePlannerStore((s) => s.routedDistanceKm);
  const difficulty = usePlannerStore((s) => s.difficulty);
  const guideWaypoints = usePlannerStore((s) => s.guideWaypoints);
  const routedSegments = usePlannerStore((s) => s.routedSegments);

  if (!routedDistanceKm) return null;

  const diff = DIFFICULTIES[difficulty];
  const surfaceBreakdown = routedSegments ? aggregateSurface(routedSegments) : [];

  return (
    <>
      <div className="route-info" style={{ display: 'flex' }}>
        <div className="tag">
          Routed: <b>{routedDistanceKm} km</b>
        </div>
        <div className="tag">
          Profile: <b style={{ color: diff.color }}>{diff.label}</b>
        </div>
        <div className="tag">
          WPs: <b>{guideWaypoints?.length || 0}</b>
        </div>
      </div>

      {surfaceBreakdown.length > 0 && (
        <div className="surface-summary">
          <div className="surface-summary-title">Surface breakdown</div>
          <div className="surface-summary-bars">
            {surfaceBreakdown.map(({ cls, km }) => {
              const s = SURFACES[cls];
              const total = surfaceBreakdown.reduce((a, b) => a + b.km, 0);
              const pct = total > 0 ? (km / total) * 100 : 0;
              return (
                <div key={cls} className="surface-summary-row" title={s.desc}>
                  <span className="surface-summary-swatch" style={{ background: s.color }} />
                  <span className="surface-summary-label">{s.label}</span>
                  <span className="surface-summary-bar">
                    <span
                      className="surface-summary-bar-fill"
                      style={{ width: `${pct}%`, background: s.color }}
                    />
                  </span>
                  <span className="surface-summary-km">{km.toFixed(1)} km</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
