/**
 * OSM way-tag → DMD2-style surface classification.
 *
 * See https://docs.dmdnavigation.com/documentation/map-basics/ for the
 * reference color scheme. We use the same 5-grade track system as DMD2
 * based on OSM `tracktype`, with additional categories for paths,
 * bridleways, and paved roads.
 */

export type SurfaceClass =
  | 'paved'        // asphalt, concrete, primary/secondary roads
  | 'grade1'       // compacted, daily-drivable
  | 'grade2'       // solid unpaved gravel
  | 'grade3'       // mixed hard/soft
  | 'grade4'       // predominantly soft
  | 'grade5'       // soft/rock/mud/sand
  | 'path'         // generic non-motorized path
  | 'bridleway'    // horse route (often no motorcycles)
  | 'unknown';     // can't classify

export interface SurfaceInfo {
  id: SurfaceClass;
  label: string;
  color: string;
  desc: string;
}

// DMD2-aligned colors (https://docs.dmdnavigation.com/documentation/map-basics/)
export const SURFACES: Record<SurfaceClass, SurfaceInfo> = {
  paved:     { id: 'paved',     label: 'Paved',     color: '#6b7280', desc: 'Asphalt / paved road' },
  grade1:    { id: 'grade1',    label: 'Grade 1',   color: '#86efac', desc: 'Compacted, daily-drivable' },
  grade2:    { id: 'grade2',    label: 'Grade 2',   color: '#22c55e', desc: 'Solid unpaved gravel' },
  grade3:    { id: 'grade3',    label: 'Grade 3',   color: '#eab308', desc: 'Mixed hard/soft' },
  grade4:    { id: 'grade4',    label: 'Grade 4',   color: '#f97316', desc: 'Predominantly soft' },
  grade5:    { id: 'grade5',    label: 'Grade 5',   color: '#ef4444', desc: 'Soft, rock, mud, sand' },
  path:      { id: 'path',      label: 'Path',      color: '#14b8a6', desc: 'Non-motorized path' },
  bridleway: { id: 'bridleway', label: 'Bridleway', color: '#d946ef', desc: 'Horse route' },
  unknown:   { id: 'unknown',   label: 'Unknown',   color: '#94a3b8', desc: 'Unclassified' },
};

/**
 * Parse BRouter's WayTags string (e.g. "highway=track tracktype=grade2 surface=gravel")
 * into a flat tag object.
 */
export function parseWayTags(tagString: string): Record<string, string> {
  const tags: Record<string, string> = {};
  if (!tagString) return tags;
  for (const part of tagString.split(' ')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    tags[part.slice(0, eq)] = part.slice(eq + 1);
  }
  return tags;
}

/**
 * Classify a route segment into a SurfaceClass from its OSM way tags.
 *
 * Priority order:
 *   1. highway=path / cycleway / footway       → path
 *   2. highway=bridleway                        → bridleway
 *   3. highway=track + tracktype=gradeN         → gradeN
 *   4. surface tag                              → derive grade
 *   5. highway road class                       → paved
 */
export function classifySurface(tagString: string): SurfaceClass {
  const t = parseWayTags(tagString);
  const highway = t.highway;
  const tracktype = t.tracktype;
  const surface = t.surface;

  // Paths and footways
  if (highway === 'path' || highway === 'cycleway' || highway === 'footway') return 'path';
  if (highway === 'bridleway') return 'bridleway';

  // Tracks with explicit grade
  if (highway === 'track' && tracktype) {
    const match = tracktype.match(/grade([1-5])/);
    if (match) return `grade${match[1]}` as SurfaceClass;
  }

  // Surface-based classification (when tracktype absent or non-track)
  if (surface) {
    if (/^(asphalt|paved|concrete|paving_stones|sett|cobblestone|metal)$/.test(surface)) {
      return highway === 'track' ? 'grade1' : 'paved';
    }
    if (/^(compacted|fine_gravel)$/.test(surface)) return 'grade2';
    if (/^(gravel|pebblestone)$/.test(surface)) return 'grade3';
    if (/^(dirt|earth|ground|unpaved)$/.test(surface)) return 'grade4';
    if (/^(mud|sand|grass|rock|stone)$/.test(surface)) return 'grade5';
  }

  // Ungraded track with no surface info
  if (highway === 'track') return 'grade3'; // assume middle grade

  // Road classifications → paved
  if (/^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service)/.test(highway || '')) {
    return 'paved';
  }

  return 'unknown';
}
