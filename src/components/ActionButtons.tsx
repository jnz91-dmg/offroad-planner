'use client';

interface ActionButtonsProps {
  generated: boolean;
  onGenerate: () => void;
  onShuffle: () => void;
  onDownload: () => void;
  onReset: () => void;
}

export default function ActionButtons({
  generated,
  onGenerate,
  onShuffle,
  onDownload,
  onReset,
}: ActionButtonsProps) {
  return (
    <div className="btn-wrap">
      {!generated ? (
        <div>
          <button className="btn-primary" onClick={onGenerate}>
            Create round trip
          </button>
        </div>
      ) : (
        <div>
          <div className="btn-row">
            <button className="btn-sec" onClick={onShuffle}>
              &#8635; Shuffle
            </button>
            <button className="btn-dl" onClick={onDownload}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M12 3v14M12 17l-5-5M12 17l5-5M4 21h16" />
              </svg>
              Download GPX
            </button>
          </div>
          <button className="btn-reset" onClick={onReset}>
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
