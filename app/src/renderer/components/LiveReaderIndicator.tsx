import { useLiveMemory } from "../lib/useLiveMemory";
import { Badge } from "../design-system/primitives/Badge/Badge";

/**
 * Small, unobtrusive live-reader status chip for the app toolbar. Hidden when
 * the reader is off (default) so there is no visual noise; shows the reader
 * state once the worker is running.
 */
export function LiveReaderIndicator() {
  const { status } = useLiveMemory();

  // Show nothing while the reader isn't running (off, stopped, not yet started).
  if (!status?.running) return null;

  if (status.attached && status.supported) {
    return (
      <Badge variant="success" className="self-center">
        Live
      </Badge>
    );
  }

  if (status.attached && !status.supported) {
    return (
      <span
        className="self-center"
        title={status.note ?? "Live stats unavailable for this version"}
      >
        <Badge variant="info">Live: unsupported</Badge>
      </span>
    );
  }

  // Running but game process not found yet — retry loop is active.
  return (
    <Badge variant="muted" className="self-center">
      Live: waiting for game
    </Badge>
  );
}
