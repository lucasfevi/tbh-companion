import { readBundledJson } from "../bundledData";
import type { LookupItem, LookupSources, SynthesisModel } from "./types";

export function loadLookupItems(): LookupItem[] {
  return readBundledJson<LookupItem[]>("lookup_items.json");
}

export function loadLookupSources(): LookupSources {
  return readBundledJson<LookupSources>("lookup_sources.json");
}

export function loadSynthesisModel(): SynthesisModel {
  return readBundledJson<SynthesisModel>("synthesis_model.json");
}

export function lookupItemIndex(items: LookupItem[]): Map<number, LookupItem> {
  return new Map(items.map((item) => [item.id, item]));
}
