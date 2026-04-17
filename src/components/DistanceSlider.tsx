'use client';

import { useRef, useEffect } from 'react';
import { DEFAULTS } from '@/lib/config';
import { usePlannerStore } from '@/stores/planner';

function getSliderBg(value: number) {
  const pct =
    ((value - DEFAULTS.minDistance) /
      (DEFAULTS.maxDistance - DEFAULTS.minDistance)) *
    100;
  return `linear-gradient(to right, var(--accent) ${pct}%, rgba(255,255,255,.08) ${pct}%)`;
}

export default function DistanceSlider() {
  const distance = usePlannerStore((s) => s.distance);
  const setDistance = usePlannerStore((s) => s.setDistance);
  const sliderRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.style.background = getSliderBg(distance);
    }
  }, [distance]);

  return (
    <>
      <div className="dist-section">
        <div className="dist-label">Length</div>
        <div className="dist-val">
          <span>{distance}</span> <span>km</span>
        </div>
      </div>
      <div className="slider-wrap">
        <input
          ref={sliderRef}
          type="range"
          min={DEFAULTS.minDistance}
          max={DEFAULTS.maxDistance}
          step={DEFAULTS.distanceStep}
          value={distance}
          onChange={(e) => setDistance(+e.target.value)}
        />
        <div className="slider-range">
          <span>{DEFAULTS.minDistance} km</span>
          <span>{DEFAULTS.maxDistance} km</span>
        </div>
      </div>
    </>
  );
}
