// Bundled item lookup catalog: every obtainable gear/material with stats and
// the cross-referenced item/box/stage source graph. See data/lookup_items.json
// and data/lookup_sources.json (produced by the tbh-data export pipeline).
//
// The shapes cross the IPC boundary unchanged, so the canonical definitions
// live in shared/types.ts; this module just re-exports them for core code.
export type {
  LookupBoxDrop,
  LookupBoxSources,
  LookupBoxStageRef,
  LookupCraftingEntry,
  LookupDropEntry,
  LookupGearStats,
  LookupItem,
  LookupItemSources,
  LookupMaterialGearGroup,
  LookupMaterialOutcome,
  LookupSources,
  LookupStageBoxRef,
  LookupStageSources,
  LookupStatRow,
  LookupUniqueMod,
  OfferingEntry,
  OfferingLootEntry,
  OfferingsModel,
  OfferingSource,
  SynthesisBucketEntry,
  SynthesisModel,
  SynthesisPathToItem,
  SynthesisRecipeRow,
  SynthesisSimOutcome,
} from "../../../shared/types";
