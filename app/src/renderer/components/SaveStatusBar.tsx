import { useStats } from "../lib/useStats";
import { fmtAgo } from "../lib/format";
import { cn } from "../lib/cn";

const IDLE_THRESHOLD = 120;

export function SaveStatusBar() {
  const stats = useStats();
  const since = stats?.secondsSinceRead ?? null;
  const idle = since !== null && since > IDLE_THRESHOLD;

  let text: string;
  if (!stats || !stats.connected) text = "Connecting to the save file...";
  else if (since === null) text = "Waiting for the first save read...";
  else text = `Save written ${fmtAgo(since)}`;

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b border-border px-3.5 py-1.5 text-xs",
        idle && "text-gold",
      )}
      role="status"
    >
      <span
        className={cn("size-2 shrink-0 rounded-full bg-accent", idle && "bg-gold")}
        aria-hidden
      />
      <span>{text}</span>
      {idle && <span className="text-gold">- is the game running?</span>}
    </div>
  );
}
