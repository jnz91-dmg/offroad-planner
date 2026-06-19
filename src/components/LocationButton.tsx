'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePlannerStore } from '@/stores/planner';
import { geocodeSearch, type GeocodingResult } from '@/services/geocoding';

export default function LocationButton() {
  const locationName = usePlannerStore((s) => s.locationName);
  const setStartLocation = usePlannerStore((s) => s.setStartLocation);

  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Debounced search as user types ───
  useEffect(() => {
    if (!expanded) return;
    if (!query || query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      // Cancel any in-flight request
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      setSearching(true);
      setError(null);
      try {
        const r = await geocodeSearch(query, 6, abortRef.current.signal);
        setResults(r);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError('Search failed');
          setResults([]);
        }
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, expanded]);

  // ─── Close on outside click ───
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [expanded]);

  // ─── Focus input when expanded ───
  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  // ─── Select a result ───
  const handleSelect = useCallback(
    (r: GeocodingResult) => {
      setStartLocation(r.lat, r.lng, r.shortName);
      setExpanded(false);
      setQuery('');
      setResults([]);
    },
    [setStartLocation],
  );

  // ─── Geolocation ───
  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStartLocation(pos.coords.latitude, pos.coords.longitude, 'Current location');
        setLocating(false);
        setExpanded(false);
      },
      () => {
        setLocating(false);
        setError('Could not get your location');
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, [setStartLocation]);

  // ─── Collapsed: show current location ───
  if (!expanded) {
    return (
      <button
        type="button"
        className="row row-button"
        onClick={() => setExpanded(true)}
        title="Search for a place or use your location"
      >
        <span className="lbl">Start from</span>
        <span className="val">
          <span className="location-name-underline">{locationName}</span>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </span>
      </button>
    );
  }

  // ─── Expanded: search UI ───
  return (
    <div className="location-search" ref={wrapperRef}>
      <div className="location-search-header">
        <span className="lbl">Start from</span>
        <button
          className="location-locate-btn"
          onClick={handleLocate}
          disabled={locating}
          title="Use current location"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeLinecap="round" />
          </svg>
          {locating ? 'Locating…' : 'Use my location'}
        </button>
      </div>

      <input
        ref={inputRef}
        type="text"
        className="location-search-input"
        placeholder="Search address or place..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setExpanded(false);
          if (e.key === 'Enter' && results.length > 0) handleSelect(results[0]);
        }}
      />

      {(searching || results.length > 0 || error || query.trim().length >= 2) && (
        <div className="location-results">
          {searching && <div className="location-result location-result-status">Searching…</div>}
          {error && <div className="location-result location-result-status error">{error}</div>}
          {!searching && !error && results.length === 0 && query.trim().length >= 2 && (
            <div className="location-result location-result-status">No matches</div>
          )}
          {results.map((r, i) => (
            <button key={i} className="location-result" onClick={() => handleSelect(r)}>
              <div className="location-result-name">{r.shortName}</div>
              <div className="location-result-full">{r.displayName}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
