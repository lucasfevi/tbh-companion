/** Small tier badge prefixing a material outcome line (e.g. "T7"). */
export function TierTag({ tier }: { tier: number }) {
  return (
    <span className="shrink-0 rounded bg-card px-1 text-[10px] font-semibold text-muted">
      T{tier}
    </span>
  );
}
