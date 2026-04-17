import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'GPX Guide — Offroad Loop Planner',
  description:
    'How to use GPX files from Offroad Loop Planner with DMD2, Garmin, Komoot, OsmAnd, and other GPS devices and apps.',
};

export default function GuidePage() {
  return (
    <div className="content-page">
      <Link href="/" className="brand" style={{ display: 'block', marginBottom: '16px', textDecoration: 'none' }}>
        &larr; Back to planner
      </Link>

      <h1 style={{ color: 'var(--text-primary)', fontSize: '22px', fontWeight: 700, marginBottom: '16px' }}>
        Using GPX Files
      </h1>

      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', lineHeight: 1.7 }}>
        <p style={{ marginBottom: '14px' }}>
          After generating a route, click &ldquo;Download GPX&rdquo; to save the route file. The GPX file contains
          the full route track and waypoint markers that work with any GPS device or navigation app.
        </p>

        <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600, margin: '20px 0 10px' }}>
          DMD2
        </h2>
        <p style={{ marginBottom: '14px' }}>
          Transfer the GPX file to your phone. Open DMD2 and import the route from the routes menu.
          The waypoints show as POI markers on the map for easy navigation.
        </p>

        <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600, margin: '20px 0 10px' }}>
          Garmin devices
        </h2>
        <p style={{ marginBottom: '14px' }}>
          Connect your Garmin via USB. Copy the GPX file to the &ldquo;Garmin/GPX&rdquo; folder on the device.
          The route appears in your saved routes or courses menu.
        </p>

        <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600, margin: '20px 0 10px' }}>
          Komoot
        </h2>
        <p style={{ marginBottom: '14px' }}>
          Open Komoot on your desktop or app. Use the import function to upload the GPX file.
          Komoot will show the route on its map and you can start navigation directly.
        </p>

        <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600, margin: '20px 0 10px' }}>
          OsmAnd
        </h2>
        <p style={{ marginBottom: '14px' }}>
          Open the GPX file with OsmAnd directly from your file manager, or import it via
          OsmAnd&apos;s track manager. The route displays as an overlay on the map.
        </p>

        <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600, margin: '20px 0 10px' }}>
          Tips
        </h2>
        <ul style={{ paddingLeft: '18px' }}>
          <li style={{ marginBottom: '6px' }}>Drag waypoints on the map to adjust the route before downloading</li>
          <li style={{ marginBottom: '6px' }}>Use &ldquo;Shuffle&rdquo; to generate different route variations</li>
          <li style={{ marginBottom: '6px' }}>Shorter routes (20-60 km) tend to follow trails more closely</li>
          <li style={{ marginBottom: '6px' }}>The map uses OpenTopoMap tiles — the same data source as many GPS devices</li>
        </ul>
      </div>
    </div>
  );
}
