import { memo } from "react";
import { Card } from "../../design-system/primitives/Card/Card";
import { CardContent, CardHeader } from "../../design-system/primitives/Card/CardParts";
import { ItemCardHeader, MaterialGroup, StatGroup } from "./itemCardParts";
import type { LookupItem } from "../../../../shared/types";

export const ItemCard = memo(function ItemCard({
  item,
  onSelect,
}: {
  item: LookupItem;
  onSelect?: (item: LookupItem) => void;
}) {
  const content = (
    <>
      <CardHeader>
        <ItemCardHeader item={item} iconSize="md" />
      </CardHeader>

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

      {/* Footer: Steam Market price (future) */}
    </>
  );

  if (onSelect) {
    return (
      <Card
        as="li"
        padding="compact"
        className="flex h-full cursor-pointer flex-col gap-2 hover:border-ideal/40 [contain-intrinsic-size:0_180px] [content-visibility:auto]"
        onClick={() => onSelect(item)}
      >
        {content}
      </Card>
    );
  }

  return (
    <Card
      padding="compact"
      className="flex h-full flex-col gap-2 [contain-intrinsic-size:0_180px] [content-visibility:auto]"
    >
      {content}
    </Card>
  );
});
