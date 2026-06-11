function MiniOverlayIcon() {
  return (
    <svg className="size-3.5 shrink-0" viewBox="0 0 16 16" aria-hidden="true">
      <rect
        x="2"
        y="3"
        width="12"
        height="10"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M5 11V8h2v3M9 11V6h2v5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BoxTrackerIcon() {
  return (
    <svg className="size-3.5 shrink-0" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3 5.5 8 3l5 2.5v5L8 13 3 10.5v-5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M8 3v10M3 5.5l5 2.5 5-2.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const toolbarBtnClass =
  "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-muted hover:border-accent hover:text-fg";

export function AppToolbar() {
  return (
    <div className="flex shrink-0 gap-1 pb-1.5" role="toolbar" aria-label="Overlays">
      <button
        type="button"
        className={toolbarBtnClass}
        title="Open mini stats overlay"
        onClick={() => window.tbh.openOverlay()}
      >
        <MiniOverlayIcon />
        Mini
      </button>
      <button
        type="button"
        className={toolbarBtnClass}
        title="Open Stage chest tracker"
        onClick={() => window.tbh.openBoxTracker()}
      >
        <BoxTrackerIcon />
        Stage chests
      </button>
    </div>
  );
}
