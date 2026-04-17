'use client';

import { usePlannerStore } from '@/stores/planner';

export default function RoutingOverlay() {
  const routing = usePlannerStore((s) => s.routing);

  if (!routing) return null;

  return (
    <div className="routing-overlay" style={{ display: 'flex' }}>
      <div className="spinner" />
      <span>Routing on trails...</span>
    </div>
  );
}
