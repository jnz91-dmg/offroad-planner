'use client';

import { useEffect } from 'react';
import { usePlannerStore } from '@/stores/planner';

export default function Toast() {
  const errorMessage = usePlannerStore((s) => s.errorMessage);
  const setError = usePlannerStore((s) => s.setError);

  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(timer);
  }, [errorMessage, setError]);

  if (!errorMessage) return null;

  return (
    <div className="error-toast" style={{ display: 'block' }}>
      {errorMessage}
    </div>
  );
}
