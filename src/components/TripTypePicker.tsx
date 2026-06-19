'use client';

import { TRIP_TYPES } from '@/lib/config';
import { usePlannerStore } from '@/stores/planner';
import type { TripType } from '@/lib/types';

export default function TripTypePicker() {
  const tripType = usePlannerStore((s) => s.tripType);
  const setTripType = usePlannerStore((s) => s.setTripType);
  const cfg = TRIP_TYPES[tripType];

  return (
    <div className="diff-sec">
      <div className="diff-hdr">
        <span className="lbl">Trip type</span>
        <span className="diff-desc" style={{ color: 'rgba(255,255,255,.5)' }}>
          {cfg.desc}
        </span>
      </div>
      <div className="diff-btns">
        {(Object.entries(TRIP_TYPES) as [TripType, typeof cfg][]).map(([id, c]) => {
          const active = tripType === id;
          return (
            <button
              key={id}
              className={`diff-btn ${active ? '' : 'off'}`}
              style={
                active
                  ? {
                      border: `2px solid var(--accent)`,
                      color: 'var(--accent)',
                      background: 'rgba(224, 90, 71, 0.08)',
                    }
                  : undefined
              }
              onClick={() => setTripType(id)}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
