'use client';

/**
 * Attribution block — credits the routing infrastructure and profile sources.
 * Shown in the sidebar below the coords.
 */
export default function Attribution() {
  return (
    <div className="attribution">
      <div className="attribution-line">
        Routing via{' '}
        <a
          href="https://brouter.de/"
          target="_blank"
          rel="noopener noreferrer"
        >
          BRouter
        </a>
        {' '}&middot; offroad profiles by{' '}
        <a
          href="https://www.drivemodedashboard.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          DMD2
        </a>
      </div>
      <div className="attribution-line">
        Map data{' '}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
        >
          &copy; OpenStreetMap
        </a>
        {' '}contributors
      </div>
    </div>
  );
}
