import { loadLookupItems, loadLookupSources } from "../../core/lookup/catalog";
import type { LookupItem, LookupSources } from "../../../shared/types";

export class LookupService {
  private readonly items: LookupItem[] = loadLookupItems();
  private readonly sources: LookupSources = loadLookupSources();

  getCatalog(): LookupItem[] {
    return this.items;
  }

  getSources(): LookupSources {
    return this.sources;
  }
}
