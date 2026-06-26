import type { LookupItem } from "../../../shared/types";

/** True when the lookup grid/peek card should render a body below the header. */
export function lookupItemCardHasBody(item: LookupItem): boolean {
  if (item.stats) {
    if (item.stats.base.length > 0 || item.stats.inherent.length > 0 || item.stats.unique != null) {
      return true;
    }
  }
  return item.gearGroups?.some((group) => group.outcomes.length > 0) ?? false;
}
