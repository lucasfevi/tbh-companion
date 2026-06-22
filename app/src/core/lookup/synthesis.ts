import type {
  SynthesisBucketEntry,
  SynthesisModel,
  SynthesisPathToItem,
  SynthesisRecipeRow,
  SynthesisSimOutcome,
} from "../../../shared/types";

/** Gear synthesis type from catalog gearGroup (matches game ItemSynthesisType). */
export function synthesisTypeForItem(item: {
  type: string;
  gearGroup: string | null;
}): string | null {
  if (item.type !== "GEAR") return null;
  if (item.gearGroup === "ACCESSORY") return "Accessory";
  return "Gear";
}

function gradeNameForValue(model: SynthesisModel, value: number): string | undefined {
  for (const [name, info] of Object.entries(model.gradeWeights)) {
    if (info.value === value) return name;
  }
  return undefined;
}

function gradeStepWeight(model: SynthesisModel, inputGrade: string, step: number): number {
  const info = model.gradeWeights[inputGrade];
  if (!info) return 0;
  return info.weights[step + 2] ?? 0;
}

function levelsForGradeType(
  model: SynthesisModel,
  outputGrade: string,
  synthesisType: string,
): number[] {
  const prefix = `${outputGrade}|${synthesisType}|`;
  const levels: number[] = [];
  for (const key of Object.keys(model.buckets)) {
    if (!key.startsWith(prefix)) continue;
    const level = Number(key.slice(prefix.length));
    if (Number.isFinite(level)) levels.push(level);
  }
  return levels.toSorted((a, b) => a - b);
}

function bucketItems(
  model: SynthesisModel,
  outputGrade: string,
  synthesisType: string,
  level: number,
): SynthesisBucketEntry[] {
  return model.buckets[`${outputGrade}|${synthesisType}|${level}`] ?? [];
}

function itemPoolPct(
  model: SynthesisModel,
  outputGrade: string,
  synthesisType: string,
  level: number,
  itemKey: number,
): number | null {
  const entry = bucketItems(model, outputGrade, synthesisType, level).find(
    (b) => b.itemKey === itemKey,
  );
  return entry?.poolPct ?? null;
}

/**
 * LevelWeight1 maps to the lowest discrete result level in range (ascending).
 * Proven from synthesis_recipe data — see task spec / verify-app-lookup.mjs.
 */
export function levelDistribution(
  recipe: SynthesisRecipeRow,
  outputGrade: string,
  synthesisType: string,
  model: SynthesisModel,
): Array<{ level: number; pct: number }> {
  const candidates = levelsForGradeType(model, outputGrade, synthesisType).filter(
    (level) => level >= recipe.minResultLevel && level <= recipe.maxResultLevel,
  );
  if (!candidates.length) return [];

  const weights = recipe.levelWeights.slice(0, candidates.length);
  const total = weights.reduce((sum, w) => sum + (w ?? 0), 0);
  if (!total) return [];

  return candidates.map((level, idx) => ({
    level,
    pct: Math.round(((weights[idx] ?? 0) / total) * 10000) / 100,
  }));
}

export function gradeRoll(
  inputGrade: string,
  model: SynthesisModel,
): Array<{ grade: string; step: number; pct: number }> {
  const info = model.gradeWeights[inputGrade];
  if (!info?.total) return [];

  const out: Array<{ grade: string; step: number; pct: number }> = [];
  for (let step = -2; step <= 2; step++) {
    const weight = gradeStepWeight(model, inputGrade, step);
    if (!weight) continue;
    const grade = gradeNameForValue(model, info.value + step);
    if (!grade) continue;
    out.push({
      grade,
      step,
      pct: Math.round((weight / info.total) * 10000) / 100,
    });
  }
  return out;
}

function roundChance(p: number): number {
  return Math.round(p * 100 * 100) / 100;
}

export function pathsToItem(
  item: { id: number; grade: string; level: number | null; type: string; gearGroup: string | null },
  model: SynthesisModel,
): SynthesisPathToItem[] {
  const synthesisType = synthesisTypeForItem(item);
  if (!synthesisType || item.level == null) return [];

  const targetGrade = model.gradeWeights[item.grade];
  if (!targetGrade) return [];

  const recipes = model.recipesByType[synthesisType] ?? [];
  const paths: SynthesisPathToItem[] = [];

  for (const recipe of recipes) {
    if (item.level < recipe.minResultLevel || item.level > recipe.maxResultLevel) continue;

    const inputInfo = model.gradeWeights[recipe.inputGrade];
    if (!inputInfo?.total) continue;
    const gradeStep = targetGrade.value - inputInfo.value;
    if (gradeStep < -2 || gradeStep > 2) continue;
    const stepWeight = gradeStepWeight(model, recipe.inputGrade, gradeStep);
    if (!stepWeight) continue;
    const pGrade = stepWeight / inputInfo.total;

    const distribution = levelDistribution(recipe, item.grade, synthesisType, model);
    const levelEntry = distribution.find((d) => d.level === item.level);
    if (!levelEntry?.pct) continue;

    const poolPct = itemPoolPct(model, item.grade, synthesisType, item.level, item.id);
    if (poolPct == null) continue;

    const pLevel = levelEntry.pct / 100;
    const pItem = poolPct / 100;

    const avgRange = recipeMaterialAverageLevelRange(model, synthesisType, recipe);

    paths.push({
      inputGrade: recipe.inputGrade,
      gradeStep,
      tier: recipe.recipeTier,
      minMaterialTier: recipe.minMaterialTier,
      materialAvgLevel: recipe.minMaterialAverageLevel,
      materialAvgLevelMin: avgRange.min,
      materialAvgLevelMax: avgRange.max,
      materialAmount: recipe.materialAmount,
      resultLevelMin: recipe.minResultLevel,
      resultLevelMax: recipe.maxResultLevel,
      itemLevel: item.level,
      pGrade: Math.round(pGrade * 10000) / 100,
      pLevel: levelEntry.pct,
      itemPoolPct: poolPct,
      chance: roundChance(pGrade * pLevel * pItem),
    });
  }

  const byKey = new Map<string, SynthesisPathToItem>();
  for (const path of paths) {
    const key = `${path.inputGrade}|${path.tier}|${path.minMaterialTier}|${path.materialAvgLevel}`;
    const existing = byKey.get(key);
    if (!existing || path.chance > existing.chance) byKey.set(key, path);
  }

  return [...byKey.values()].toSorted((a, b) => b.chance - a.chance);
}

/** In-game tier band: aggregate min/max result level across all recipes at that tier. */
export function recipeTierResultRange(
  model: SynthesisModel,
  synthesisType: string,
  recipeTier: number,
): { min: number; max: number } | null {
  const recipes = (model.recipesByType[synthesisType] ?? []).filter(
    (recipe) => recipe.recipeTier === recipeTier,
  );
  if (!recipes.length) return null;
  return {
    min: Math.min(...recipes.map((recipe) => recipe.minResultLevel)),
    max: Math.max(...recipes.map((recipe) => recipe.maxResultLevel)),
  };
}

export function formatSynthesisResultRange(min: number, max: number): string {
  return min === max ? `Lv ${min}` : `Lv ${min}~${max}`;
}

function materialAverageThresholds(
  model: SynthesisModel,
  synthesisType: string,
  inputGrade: string,
  recipeTier: number,
  minMaterialTier: number,
): number[] {
  const recipes = model.recipesByType[synthesisType] ?? [];
  const thresholds = new Set<number>();
  for (const recipe of recipes) {
    if (
      recipe.inputGrade !== inputGrade ||
      recipe.recipeTier !== recipeTier ||
      recipe.minMaterialTier !== minMaterialTier
    ) {
      continue;
    }
    thresholds.add(recipe.minMaterialAverageLevel);
  }
  return [...thresholds].toSorted((a, b) => a - b);
}

function fallbackMaterialAverageLevelRange(
  model: SynthesisModel,
  synthesisType: string,
  path: Pick<SynthesisPathToItem, "inputGrade" | "tier" | "minMaterialTier" | "materialAvgLevel">,
): { min: number; max: number } {
  const thresholds = materialAverageThresholds(
    model,
    synthesisType,
    path.inputGrade,
    path.tier,
    path.minMaterialTier,
  );
  const idx = thresholds.indexOf(path.materialAvgLevel);
  const recipes = (model.recipesByType[synthesisType] ?? []).filter(
    (recipe) =>
      recipe.inputGrade === path.inputGrade &&
      recipe.recipeTier === path.tier &&
      recipe.minMaterialTier === path.minMaterialTier,
  );
  const tierMax = Math.max(...recipes.map((recipe) => recipe.maxResultLevel));
  if (idx < 0) return { min: path.materialAvgLevel, max: tierMax };
  const next = thresholds[idx + 1];
  return { min: path.materialAvgLevel, max: next != null ? next - 1 : tierMax };
}

function recipeMaterialAverageLevelRange(
  model: SynthesisModel,
  synthesisType: string,
  recipe: SynthesisRecipeRow,
): { min: number; max: number } {
  if (recipe.materialAvgLevelMin != null && recipe.materialAvgLevelMax != null) {
    return { min: recipe.materialAvgLevelMin, max: recipe.materialAvgLevelMax };
  }
  return fallbackMaterialAverageLevelRange(model, synthesisType, {
    inputGrade: recipe.inputGrade,
    tier: recipe.recipeTier,
    minMaterialTier: recipe.minMaterialTier,
    materialAvgLevel: recipe.minMaterialAverageLevel,
  });
}

/** Material average band for a synthesis path. */
export function materialAverageLevelRange(
  path: Pick<SynthesisPathToItem, "materialAvgLevelMin" | "materialAvgLevelMax">,
): { min: number; max: number } {
  return { min: path.materialAvgLevelMin, max: path.materialAvgLevelMax };
}

export function formatMaterialAverageLevelRange(range: { min: number; max: number }): string {
  return range.min === range.max
    ? `Average item Lv ${range.min}`
    : `Average item Lv ${range.min}-${range.max}`;
}

/** Player-facing setup line: tier band + material average (matches in-game synthesis UI). */
export function formatSynthesisPathSetup(
  path: Pick<SynthesisPathToItem, "tier" | "materialAvgLevel" | "inputGrade" | "minMaterialTier">,
  tierRange: { min: number; max: number },
  avgRange: { min: number; max: number },
): string {
  return `Tier ${path.tier} (${formatSynthesisResultRange(tierRange.min, tierRange.max)}) · ${formatMaterialAverageLevelRange(avgRange)}`;
}

export function synthesisPathKey(path: SynthesisPathToItem): string {
  return `${path.inputGrade}|${path.tier}|${path.minMaterialTier}|${path.materialAvgLevel}`;
}

export function simulate(
  inputGrade: string,
  tier: number,
  materialAvgLevel: number,
  materialTier: number,
  synthesisType: string,
  model: SynthesisModel,
): SynthesisSimOutcome[] {
  const recipes = (model.recipesByType[synthesisType] ?? []).filter(
    (r) =>
      r.inputGrade === inputGrade &&
      r.recipeTier === tier &&
      r.minMaterialAverageLevel === materialAvgLevel &&
      r.minMaterialTier === materialTier,
  );
  if (!recipes.length) return [];

  const outcomes = new Map<string, SynthesisSimOutcome>();

  for (const recipe of recipes) {
    for (const roll of gradeRoll(inputGrade, model)) {
      const distribution = levelDistribution(recipe, roll.grade, synthesisType, model);
      for (const { level, pct: pLevelPct } of distribution) {
        for (const bucket of bucketItems(model, roll.grade, synthesisType, level)) {
          const chance = roundChance((roll.pct / 100) * (pLevelPct / 100) * (bucket.poolPct / 100));
          const key = `${roll.grade}|${level}|${bucket.itemKey}`;
          const existing = outcomes.get(key);
          if (existing) {
            existing.chance = roundChance(existing.chance + chance);
          } else {
            outcomes.set(key, {
              outputGrade: roll.grade,
              level,
              itemKey: bucket.itemKey,
              chance,
            });
          }
        }
      }
    }
  }

  return [...outcomes.values()].toSorted((a, b) => b.chance - a.chance);
}
