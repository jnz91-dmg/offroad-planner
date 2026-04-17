'use client';

import { ROUTE_CHARACTERS } from '@/lib/config';
import { usePlannerStore } from '@/stores/planner';
import type { RouteCharacter } from '@/lib/types';

export default function RouteCharacterPicker() {
  const character = usePlannerStore((s) => s.routeCharacter);
  const setCharacter = usePlannerStore((s) => s.setRouteCharacter);
  const cfg = ROUTE_CHARACTERS[character];

  return (
    <div className="diff-sec">
      <div className="diff-hdr">
        <span className="lbl">Route character</span>
        <span className="diff-desc" style={{ color: 'rgba(255,255,255,.5)' }}>
          {cfg.desc}
        </span>
      </div>
      <div className="diff-btns">
        {(Object.entries(ROUTE_CHARACTERS) as [RouteCharacter, typeof cfg][]).map(
          ([id, c]) => {
            const active = character === id;
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
                onClick={() => setCharacter(id)}
              >
                {c.label}
              </button>
            );
          },
        )}
      </div>
    </div>
  );
}
