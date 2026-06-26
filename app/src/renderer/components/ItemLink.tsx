import { FIRST_DROP_ONLY_LABEL } from "../../core/lookup/boxDisplay";
import { gradeColor } from "../lib/gradeColor";
import { iconSrc } from "../lib/iconSrc";
import { EntityLink } from "../design-system/primitives/EntityLink/EntityLink";
import { ItemIcon } from "../design-system/primitives/ItemIcon/ItemIcon";
import { ItemCard } from "./lookup/ItemCard";
import { BoxPeekCard } from "./lookup/BoxPeekCard";
import type { LookupBoxSources, LookupItem } from "../../../shared/types";
import type { LookupNavNode } from "../lib/useLookupNav";

/**
 * Domain wrapper for item/box entity links — grade color, peek cards, and
 * lookup navigation. Renders the presentational EntityLink primitive.
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
  const boxMeta = node.type === "box" ? peekBox?.(node.id) : undefined;
  const isFirstClearBox = boxMeta?.firstDropOnly === true;
  const effectiveSuffix = isFirstClearBox ? `· ${FIRST_DROP_ONLY_LABEL}` : suffix;

  const icon = iconPath ? (
    <ItemIcon src={iconSrc(iconPath)} color={color ?? gradeColor("UNKNOWN")} size="link" />
  ) : undefined;

  const peekItemData = node.type === "item" ? peekItem?.(node.id) : undefined;
  const boxPeek = node.type === "box" ? boxMeta : undefined;
  const peek =
    peekItemData != null ? (
      <ItemCard item={peekItemData} />
    ) : boxPeek != null ? (
      <BoxPeekCard box={boxPeek} boxItemKey={node.id} />
    ) : undefined;

  return (
    <EntityLink
      icon={icon}
      label={name}
      color={color}
      suffix={effectiveSuffix}
      suffixTone={isFirstClearBox ? "gold" : "muted"}
      onClick={onNavigate ? () => onNavigate(node) : undefined}
      peek={peek}
    />
  );
}
