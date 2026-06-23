import {
  loadLookupItems,
  loadLookupSources,
  loadOfferings,
  loadSynthesisModel,
} from "../../core/lookup/catalog";
import type {
  LookupItem,
  LookupSources,
  OfferingsModel,
  SynthesisModel,
} from "../../../shared/types";

export class LookupService {
  private readonly items: LookupItem[] = loadLookupItems();
  private readonly sources: LookupSources = loadLookupSources();
  private readonly synthesisModel: SynthesisModel = loadSynthesisModel();
  private readonly offerings: OfferingsModel = loadOfferings();

  getCatalog(): LookupItem[] {
    return this.items;
  }

  getSources(): LookupSources {
    return this.sources;
  }

  getSynthesisModel(): SynthesisModel {
    return this.synthesisModel;
  }

  getOfferings(): OfferingsModel {
    return this.offerings;
  }
}
