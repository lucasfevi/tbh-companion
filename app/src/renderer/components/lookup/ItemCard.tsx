import { memo } from "react";
import { cn } from "../../lib/cn";
import { Card } from "../../design-system/primitives/Card/Card";
import { CardContent, CardHeader } from "../../design-system/primitives/Card/CardParts";
import { ItemCardHeader, MaterialGroup, StatGroup } from "./itemCardParts";
import { LookupPrice } from "./LookupPrice";
import { lookupItemCardHasBody } from "../../lib/lookupItemCard";
import type { LookupItem } from "../../../../shared/types";

export const ItemCard = memo(function ItemCard({
  item,
  onSelect,
}: {
  item: LookupItem;
  onSelect?: (item: LookupItem) => void;
}) {
  const hasBody = lookupItemCardHasBody(item);
  // Grid cards (onSelect) link the price in a footer; peeks (no onSelect) show
  // a quiet inline price in the header instead.
  const interactive = Boolean(onSelect);
  const cardClassName = cn(
    "flex flex-col",
    hasBody && "h-full gap-2 [contain-intrinsic-size:0_180px] [content-visibility:auto]",
  );

  const content = (
    <>
      <CardHeader>
        <ItemCardHeader
          item={item}
          iconSize="md"
          trailing={interactive ? undefined : <LookupPrice item={item} variant="inline" />}
        />
      </CardHeader>

      {hasBody ? (
        <CardContent>
          {item.stats ? (
            <>
              <StatGroup title="Base stats" rows={item.stats.base} tone="base" />
              <StatGroup title="Inherent stats" rows={item.stats.inherent} tone="inherent" />
              {item.stats.unique ? (
                <StatGroup
                  title="Unique effect"
                  rows={[{ display: item.stats.unique.text }]}
                  tone="unique"
                />
              ) : null}
            </>
          ) : null}

          {item.gearGroups?.map((group) => (
            <MaterialGroup
              key={group.gearGroup}
              group={group}
              materialType={item.materialType}
              compact
            />
          ))}
        </CardContent>
      ) : null}

      {interactive ? <LookupPrice item={item} variant="footer" interactive /> : null}
    </>
  );

  if (onSelect) {
    return (
      <Card
        as="li"
        padding="compact"
        className={cn(cardClassName, "cursor-pointer hover:border-ideal/40")}
        onClick={() => onSelect(item)}
      >
        {content}
      </Card>
    );
  }

  return (
    <Card padding="compact" className={cardClassName}>
      {content}
    </Card>
  );
});
