import type { PriceRefreshResult, PriceRefreshSummary } from "../../../shared/types";

type RefreshMessageInput = Pick<
  PriceRefreshResult,
  "ok" | "priced" | "skipped" | "failed" | "stopped" | "error" | "noop" | "queued"
> & {
  ownedTargets?: number;
};

export function formatPriceRefreshMessage(input: RefreshMessageInput): string {
  if (input.queued) {
    return "A refresh is already running — yours is queued.";
  }

  if (input.ownedTargets === 0) {
    return "No inventory loaded yet — play with the game running or check your save path.";
  }

  if (input.noop) {
    const n = input.skipped;
    return `All ${n} item${n === 1 ? "" : "s"} are up to date (updated within 24h). Nothing to fetch.`;
  }

  if (!input.ok) {
    if (input.error === "already running") {
      return "Refresh already in progress.";
    }
    return `Refresh failed: ${input.error ?? "unknown error"}.`;
  }

  const stopMsg =
    input.stopped === "cancelled"
      ? " (cancelled)"
      : input.stopped === "rate-limited"
        ? " (rate-limited)"
        : "";
  return `Priced ${input.priced}, skipped ${input.skipped} fresh, ${input.failed} failed${stopMsg}.`;
}

export function formatPriceRefreshSummary(result: PriceRefreshSummary): string {
  return formatPriceRefreshMessage({ ok: true, ...result });
}
