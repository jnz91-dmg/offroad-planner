import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About — Offroad Loop Planner',
  description:
    'Learn how the Offroad Loop Planner generates round-trip routes on actual trails using OpenStreetMap data. Free, no signup, works with any GPS device.',
};

export default function AboutPage() {
  return (
    <div className="content-page">
      <Link href="/" className="brand" style={{ display: 'block', marginBottom: '16px', textDecoration: 'none' }}>
        &larr; Back to planner
      </Link>

      <h1 style={{ color: 'var(--text-primary)', fontSize: '22px', fontWeight: 700, marginBottom: '16px' }}>
        About Offroad Loop Planner
      </h1>

      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', lineHeight: 1.7 }}>
        <p style={{ marginBottom: '14px' }}>
          Offroad Loop Planner is a free tool that generates round-trip riding routes on actual trails and roads.
          Set your distance, difficulty, and preferred direction — the planner creates a loop route starting and
          ending at your chosen location.
        </p>

        <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600, margin: '20px 0 10px' }}>
          How it works
        </h2>
        <p style={{ marginBottom: '14px' }}>
          Routes are generated using OpenStreetMap trail data via the BRouter routing engine. The algorithm places
          guide waypoints in a loop pattern, then routes between them along real trails, forest tracks, and roads
          based on your chosen difficulty level.
        </p>

        <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600, margin: '20px 0 10px' }}>
          Difficulty levels
        </h2>
        <ul style={{ paddingLeft: '18px', marginBottom: '14px' }}>
          <li style={{ marginBottom: '6px' }}><strong style={{ color: 'var(--easy)' }}>Easy</strong> — Gravel roads and farm tracks suitable for adventure bikes</li>
          <li style={{ marginBottom: '6px' }}><strong style={{ color: 'var(--medium)' }}>Medium</strong> — Forest tracks and moderate terrain for dual-sport riding</li>
          <li style={{ marginBottom: '6px' }}><strong style={{ color: 'var(--hard)' }}>Hard</strong> — Technical singletrack and steep terrain for enduro</li>
        </ul>

        <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600, margin: '20px 0 10px' }}>
          GPX export
        </h2>
        <p style={{ marginBottom: '14px' }}>
          Download your route as a GPX file compatible with any GPS device or app — DMD2, Garmin, Komoot, OsmAnd,
          and more. The GPX includes the full route track and waypoint markers.
        </p>

        <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600, margin: '20px 0 10px' }}>
          Credits &amp; attribution
        </h2>
        <p style={{ marginBottom: '14px' }}>
          Routing powered by the{' '}
          <a href="https://brouter.de/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
            BRouter
          </a>{' '}
          open-source routing engine (Arndt Brenschede). The motorcycle-tuned <em>offroad-easy</em>, <em>offroad-medium</em>,
          and <em>offroad-hard</em> profiles were created and are hosted by{' '}
          <a href="https://www.drivemodedashboard.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
            Drive Mode Dashboard (DMD2)
          </a>
          . Map data &copy;{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
            OpenStreetMap
          </a>{' '}
          contributors.
        </p>

        <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600, margin: '20px 0 10px' }}>
          Built by RatataLabs
        </h2>
        <p>
          Made for riders who want to explore new trails without spending hours planning routes.
          No tracking, no signup required.
        </p>
      </div>
    </div>
  );
}
