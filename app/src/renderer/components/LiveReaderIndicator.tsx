import { useLiveMemory } from "../lib/useLiveMemory";
import { liveReaderState } from "../../core/liveMemory/status";
import { Badge } from "../design-system/primitives/Badge/Badge";

/**
 * Small, unobtrusive live-reader status chip for the app toolbar. Hidden when
 * the reader is off (default) so there is no visual noise; shows connecting /
 * attached / degraded once the reader is running.
 */
export function LiveReaderIndicator() {
  const { status } = useLiveMemory();
  // The reader process only runs when enabled + consented, so `running` is the
  // faithful "reader is on" signal for the indicator.
  const state = liveReaderState(status, Boolean(status?.running));

  if (state === "off") return null;

  if (state === "attached") {
    return (
      <Badge variant="success" className="self-center">
        Live
      </Badge>
    );
  }

  if (state === "connecting") {
    return (
      <Badge variant="muted" className="self-center">
        Live: connecting
      </Badge>
    );
  }

  // degraded — attached to an unsupported game version.
  return (
    <span className="self-center" title={status?.note ?? "Live stats unavailable for this version"}>
      <Badge variant="info">Live: unsupported</Badge>
    </span>
  );
}
