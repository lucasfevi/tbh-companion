import { cn } from "../../lib/cn";
import { gradeColor } from "../../lib/gradeColor";
import { iconSrc } from "../../lib/iconSrc";
import { Tooltip } from "../../design-system/primitives/Tooltip/Tooltip";
import { ItemIcon } from "../../design-system/primitives/ItemIcon/ItemIcon";
import { ItemCard } from "./ItemCard";
import type { LookupItem } from "../../../../shared/types";
import type { LookupNavNode } from "../../lib/useLookupNav";

/**
 * Inline `{icon} Name` link in grade color, replacing the old pill-chip
 * navigation chrome. Used for item references (peek card on hover) and box
 * references (no peek — box entities aren't in the item catalog).
 */
export function ItemLink({
  node,
  name,
  grade,
  iconPath,
  suffix,
  onNavigate,
  peekItem,
}: {
  node: LookupNavNode;
  name: string;
  grade?: string | null;
  iconPath?: string | null;
  suffix?: string;
  onNavigate?: (node: LookupNavNode) => void;
  peekItem?: (id: number) => LookupItem | undefined;
}) {
  const color = grade ? gradeColor(grade) : undefined;
  const inner = (
    <>
      {iconPath ? (
        <ItemIcon src={iconSrc(iconPath)} color={color ?? gradeColor("UNKNOWN")} size="xs" />
      ) : null}
      <span className="truncate" style={color ? { color } : undefined}>
        {name}
      </span>
      {suffix ? <span className="shrink-0 text-[11px] text-muted">{suffix}</span> : null}
    </>
  );

  const className = cn(
    "inline-flex max-w-full items-center gap-1 rounded text-[13px]",
    onNavigate ? "cursor-pointer hover:underline" : null,
    !color ? "text-fg" : null,
  );

  const trigger = onNavigate ? (
    <button type="button" className={className} onClick={() => onNavigate(node)}>
      {inner}
    </button>
  ) : (
    <span className={className}>{inner}</span>
  );

  const peek = node.type === "item" ? peekItem?.(node.id) : undefined;
  if (peek) {
    return (
      <Tooltip trigger={trigger} className="w-64 border-0 bg-transparent p-0 shadow-none">
        <ItemCard item={peek} />
      </Tooltip>
    );
  }
  return trigger;
}
