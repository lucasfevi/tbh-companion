/**
 * Derives `usedIn` on MATERIAL entries from existing per-gear `crafting` rows.
 * Mirrors tbh-data `buildMaterialUsedIn` when a full app-data rebuild is unavailable.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const path = join(root, "data", "lookup_sources.json");
const sources = JSON.parse(readFileSync(path, "utf8"));

/** @type {Map<number, { recipeKey: number, craftingType: string, tier: number, level: { min: number, max: number }, materials: { itemKey: number, name: string, amount: number }[], outputs: Map<number, number> }>} */
const recipesByKey = new Map();

for (const [itemKeyStr, src] of Object.entries(sources.items)) {
  const itemKey = Number(itemKeyStr);
  for (const craft of src.crafting ?? []) {
    let recipe = recipesByKey.get(craft.recipeKey);
    if (!recipe) {
      recipe = {
        recipeKey: craft.recipeKey,
        craftingType: craft.craftingType,
        tier: craft.tier,
        level: craft.level,
        materials: craft.materials,
        outputs: new Map(),
      };
      recipesByKey.set(craft.recipeKey, recipe);
    }
    recipe.outputs.set(itemKey, (recipe.outputs.get(itemKey) ?? 0) + craft.outputPct);
  }
}

let materialCount = 0;
for (const [itemKeyStr, src] of Object.entries(sources.items)) {
  const itemKey = Number(itemKeyStr);
  delete src.usedIn;
  const usedIn = [];
  for (const recipe of recipesByKey.values()) {
    if (!recipe.materials.some((m) => m.itemKey === itemKey)) continue;
    usedIn.push({
      recipeKey: recipe.recipeKey,
      craftingType: recipe.craftingType,
      tier: recipe.tier,
      level: recipe.level,
      materials: recipe.materials,
      outputs: [...recipe.outputs.entries()].map(([ik, poolPct]) => ({ itemKey: ik, poolPct })),
    });
  }
  if (usedIn.length) {
    src.usedIn = usedIn;
    materialCount++;
  }
}

writeFileSync(path, `${JSON.stringify(sources, null, 2)}\n`);
console.log(`Patched lookup_sources.json — ${materialCount} materials with usedIn`);
