import { cn } from "../../lib/cn";
import { gradeColor } from "../../lib/gradeColor";
import { iconSrc } from "../../lib/iconSrc";
import { Tooltip } from "../../design-system/primitives/Tooltip/Tooltip";
import { ItemIcon } from "../../design-system/primitives/ItemIcon/ItemIcon";
import { ItemCard } from "./ItemCard";
import { BoxPeekCard } from "./BoxPeekCard";
import type { LookupBoxSources, LookupItem } from "../../../../shared/types";
import type { LookupNavNode } from "../../lib/useLookupNav";

/**
 * Inline `{icon} Name` link in grade color, replacing the old pill-chip
 * navigation chrome. Used for item references (peek card on hover) and box
 * references (box peek card on hover).
 */
export function ItemLink({
  node,
  name,
  grade,
  iconPath,
  suffix,
  onNavigate,
  peekItem,
  peekBox,
}: {
  node: LookupNavNode;
  name: string;
  grade?: string | null;
  iconPath?: string | null;
  suffix?: string;
  onNavigate?: (node: LookupNavNode) => void;
  peekItem?: (id: number) => LookupItem | undefined;
  peekBox?: (id: number) => LookupBoxSources | undefined;
}) {
  const color = grade ? gradeColor(grade) : undefined;
  const linkInner = (
    <>
      {iconPath ? (
        <ItemIcon src={iconSrc(iconPath)} color={color ?? gradeColor("UNKNOWN")} size="link" />
      ) : null}
      <span className="truncate" style={color ? { color } : undefined}>
        {name}
      </span>
    </>
  );

  const linkClassName = cn(
    "inline-flex w-fit max-w-full items-center gap-1 rounded text-[13px]",
    onNavigate ? "cursor-pointer hover:underline" : null,
    !color ? "text-fg" : null,
  );

  const linkTrigger = onNavigate ? (
    <button type="button" className={linkClassName} onClick={() => onNavigate(node)}>
      {linkInner}
    </button>
  ) : (
    <span className={linkClassName}>{linkInner}</span>
  );

  const peek = node.type === "item" ? peekItem?.(node.id) : undefined;
  const boxPeek = node.type === "box" ? peekBox?.(node.id) : undefined;
  const interactive =
    peek != null ? (
      <Tooltip trigger={linkTrigger} className="w-64 border-0 bg-transparent p-0 shadow-none">
        <div className="shadow-[0_8px_24px_rgb(0_0_0/0.45)]">
          <ItemCard item={peek} />
        </div>
      </Tooltip>
    ) : boxPeek != null ? (
      <Tooltip trigger={linkTrigger} className="w-64 border-0 bg-transparent p-0 shadow-none">
        <div className="shadow-[0_8px_24px_rgb(0_0_0/0.45)]">
          <BoxPeekCard box={boxPeek} boxItemKey={node.id} />
        </div>
      </Tooltip>
    ) : (
      linkTrigger
    );

  if (!suffix) {
    return <span className="w-fit max-w-full self-start">{interactive}</span>;
  }

  return (
    <span className="inline-flex w-fit max-w-full self-start items-center gap-1 text-[13px]">
      {interactive}
      <span className="shrink-0 text-[11px] text-muted">{suffix}</span>
    </span>
  );
}
