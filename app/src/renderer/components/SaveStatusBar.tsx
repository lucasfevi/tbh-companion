import { useStats } from "../lib/useStats";
import { useBoxTimers } from "../lib/useBoxTimers";
import { fmtAgo } from "../lib/format";
import { cn } from "../lib/cn";

const IDLE_THRESHOLD = 120;

export function SaveStatusBar() {
  const stats = useStats();
  const boxTimers = useBoxTimers();
  const since = stats?.secondsSinceRead ?? null;
  const idle = since !== null && since > IDLE_THRESHOLD;

  let saveText: string;
  if (!stats || !stats.connected) saveText = "Connecting to the save file...";
  else if (since === null) saveText = "Waiting for the first save read...";
  else saveText = `Save written ${fmtAgo(since)}`;

  const showPlayerLog = Boolean(boxTimers?.playerLogPath);
  const playerLogAvailable = boxTimers?.playerLogAvailable ?? false;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-border px-3.5 py-1.5 text-xs",
        idle && "text-gold",
      )}
      role="status"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn("size-2 shrink-0 rounded-full bg-accent", idle && "bg-gold")}
          aria-hidden
        />
        <span>{saveText}</span>
        {idle ? <span className="text-gold">- is the game running?</span> : null}
      </div>
      {showPlayerLog ? (
        <div
          className={cn(
            "flex shrink-0 items-center gap-2",
            !idle && (playerLogAvailable ? "text-fg" : "text-muted"),
          )}
        >
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              playerLogAvailable ? "bg-accent" : "bg-muted",
            )}
            aria-hidden
          />
          <span>Player.log {playerLogAvailable ? "watching" : "not found"}</span>
        </div>
      ) : null}
    </div>
  );
}
