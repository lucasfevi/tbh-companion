import { loadLookupItems, loadLookupSources, loadSynthesisModel } from "../../core/lookup/catalog";
import type { LookupItem, LookupSources, SynthesisModel } from "../../../shared/types";

export class LookupService {
  private readonly items: LookupItem[] = loadLookupItems();
  private readonly sources: LookupSources = loadLookupSources();
  private readonly synthesisModel: SynthesisModel = loadSynthesisModel();

  getCatalog(): LookupItem[] {
    return this.items;
  }

  getSources(): LookupSources {
    return this.sources;
  }

  getSynthesisModel(): SynthesisModel {
    return this.synthesisModel;
  }
}
