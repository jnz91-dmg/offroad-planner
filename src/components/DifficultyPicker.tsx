'use client';

import { DIFFICULTIES } from '@/lib/config';
import { usePlannerStore } from '@/stores/planner';
import type { DifficultyId } from '@/lib/types';

export default function DifficultyPicker() {
  const difficulty = usePlannerStore((s) => s.difficulty);
  const setDifficulty = usePlannerStore((s) => s.setDifficulty);
  const diff = DIFFICULTIES[difficulty];

  return (
    <div className="diff-sec">
      <div className="diff-hdr">
        <span className="lbl">Difficulty</span>
        <span className="diff-desc" style={{ color: diff.color }}>
          {diff.desc}
        </span>
      </div>
      <div className="diff-btns">
        {(Object.entries(DIFFICULTIES) as [DifficultyId, typeof diff][]).map(
          ([id, d]) => {
            const active = difficulty === id;
            return (
              <button
                key={id}
                className={`diff-btn ${active ? '' : 'off'}`}
                style={
                  active
                    ? {
                        border: `2px solid ${d.color}`,
                        color: d.color,
                        background: d.color + '10',
                      }
                    : undefined
                }
                onClick={() => setDifficulty(id)}
              >
                {d.label}
              </button>
            );
          },
        )}
      </div>
    </div>
  );
}
