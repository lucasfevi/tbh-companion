import { usePriceProgress, usePriceStatus } from "../../lib/usePrices";
import { Button } from "../../design-system/primitives/Button/Button";
import { HintBanner } from "../ui/HintBanner";
import { ProgressBar } from "../ui/ProgressBar";

function progressLabel(progress: NonNullable<ReturnType<typeof usePriceProgress>>): string {
  return `${progress.done}/${progress.total} — priced ${progress.priced}, failed ${progress.failed} — ${progress.current || "starting…"}`;
}

export function SteamPriceProgress({ variant }: { variant: "banner" | "full" }) {
  const status = usePriceStatus();
  const progress = usePriceProgress();
  const running = status?.running ?? false;

  if (!running) return null;

  const pct =
    progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  const stopButton = (
    <Button
      size="sm"
      variant="danger"
      className={variant === "banner" ? "ml-1.5" : undefined}
      onClick={() => window.tbh.cancelPrices()}
    >
      Stop
    </Button>
  );

  if (variant === "banner") {
    return (
      <HintBanner>
        Updating Steam prices in the background
        {progress ? `: ${progress.done}/${progress.total} (${progress.priced} priced)` : "…"}.{" "}
        {stopButton}
        <ProgressBar
          percent={pct}
          label={
            progress?.current ? (
              <span className="mt-1.5 block text-xs text-muted">{progress.current}</span>
            ) : undefined
          }
        />
      </HintBanner>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-muted">Fetching Steam prices…</span>
        {stopButton}
      </div>
      <ProgressBar
        percent={pct}
        label={
          <span className="text-xs text-muted">
            {progress ? progressLabel(progress) : "starting…"}
          </span>
        }
      />
    </div>
  );
}
