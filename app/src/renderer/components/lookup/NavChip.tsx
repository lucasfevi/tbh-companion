import { cn } from "../../lib/cn";
import { Tooltip } from "../../design-system/primitives/Tooltip/Tooltip";
import { ItemPeekCard } from "./ItemPeekCard";
import type { LookupItem } from "../../../../shared/types";
import type { LookupNavNode } from "../../lib/useLookupNav";

export function NavChip({
  node,
  label,
  onNavigate,
  peekItem,
}: {
  node: LookupNavNode;
  label: string;
  onNavigate?: (node: LookupNavNode) => void;
  /** When node.type === "item", resolves the item for a hover peek card. */
  peekItem?: (id: number) => LookupItem | undefined;
}) {
  const className = cn(
    "rounded-full border border-border bg-card px-2 py-0.5 text-[11px]",
    onNavigate ? "cursor-pointer text-fg hover:border-ideal/40 hover:text-ideal" : "text-muted",
  );

  const trigger = onNavigate ? (
    <button type="button" className={className} onClick={() => onNavigate(node)}>
      {label}
    </button>
  ) : (
    <span className={className}>{label}</span>
  );

  const peek = node.type === "item" ? peekItem?.(node.id) : undefined;
  if (peek) {
    return (
      <Tooltip trigger={trigger}>
        <ItemPeekCard item={peek} />
      </Tooltip>
    );
  }
  return trigger;
}
