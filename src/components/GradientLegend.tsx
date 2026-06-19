'use client';

import { usePlannerStore } from '@/stores/planner';
import { SURFACES } from '@/services/surface';
import { SLOPE_BANDS } from '@/lib/slope';

const GRADIENT_BANDS = [
  { label: '0-3%', desc: 'Flat', color: '#22c55e' },
  { label: '3-6%', desc: 'Moderate', color: '#eab308' },
  { label: '6-9%', desc: 'Steep', color: '#f97316' },
  { label: '9%+', desc: 'Very steep', color: '#ef4444' },
];

const SURFACE_BANDS: Array<{ label: string; desc: string; color: string }> = [
  { label: 'Paved',    desc: SURFACES.paved.desc,     color: SURFACES.paved.color },
  { label: 'Grade 1',  desc: SURFACES.grade1.desc,    color: SURFACES.grade1.color },
  { label: 'Grade 2',  desc: SURFACES.grade2.desc,    color: SURFACES.grade2.color },
  { label: 'Grade 3',  desc: SURFACES.grade3.desc,    color: SURFACES.grade3.color },
  { label: 'Grade 4',  desc: SURFACES.grade4.desc,    color: SURFACES.grade4.color },
  { label: 'Grade 5',  desc: SURFACES.grade5.desc,    color: SURFACES.grade5.color },
  { label: 'Path',     desc: SURFACES.path.desc,      color: SURFACES.path.color },
  { label: 'Bridle',   desc: SURFACES.bridleway.desc, color: SURFACES.bridleway.color },
];

export default function GradientLegend() {
  const mode = usePlannerStore((s) => s.coloringMode);
  const bands =
    mode === 'surface' ? SURFACE_BANDS : mode === 'slope' ? SLOPE_BANDS : GRADIENT_BANDS;
  const title = mode === 'surface' ? 'Surface' : mode === 'slope' ? 'Slope' : 'Gradient';

  return (
    <div className="gradient-legend">
      <div className="gradient-legend-title">{title}</div>
      <div className="gradient-legend-bands">
        {bands.map((b) => (
          <div key={b.label} className="gradient-legend-band" title={b.desc}>
            <span className="gradient-legend-swatch" style={{ background: b.color }} />
            <span className="gradient-legend-label">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
