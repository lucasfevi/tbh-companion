#!/usr/bin/env node
/**
 * Automated QA gate — run before marking app changes done.
 * Usage: pnpm run qa (from app/)
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd: appRoot, stdio: "inherit", shell: true });
}

run("pnpm run typecheck");
run("pnpm run lint");
run("pnpm run format:check");
run("pnpm test");
run("pnpm run test:dom");
run("pnpm run build");

const mainBundle = join(appRoot, "out/main/index.js");
if (!existsSync(mainBundle)) {
  console.error("FAIL: out/main/index.js missing after build");
  process.exit(1);
}

const main = readFileSync(mainBundle, "utf8");
const badPatterns = [
  { re: /\.\.\/\.\.\/preload/g, label: "../../preload (must be ../preload from out/main/)" },
  {
    re: /\.\.\/\.\.\/renderer\/index\.html/g,
    label: "../../renderer (must be ../renderer from out/main/)",
  },
];

for (const { re, label } of badPatterns) {
  if (re.test(main)) {
    console.error(`FAIL: bundled main contains ${label}`);
    console.error("See app/src/main/paths.ts and .cursor/skills/tbh-qa/references/checklist.md");
    process.exit(1);
  }
}

if (!main.includes("../preload/index.js")) {
  console.error("FAIL: bundled main missing expected ../preload/index.js path");
  process.exit(1);
}

const dataDir = join(appRoot, "..", "data");
const requiredDataFiles = [
  "gamedata.json",
  "stage_boxes.json",
  "box_types.json",
  "rune_box_cap.json",
  "steam_item_nameids.json",
  "steam_market_fee.json",
];
for (const file of requiredDataFiles) {
  const path = join(dataDir, file);
  if (!existsSync(path)) {
    console.error(
      `FAIL: missing bundled data file data/${file} (required for release extraResources)`,
    );
    process.exit(1);
  }
}

const pkg = JSON.parse(readFileSync(join(appRoot, "package.json"), "utf8"));
if (!/^\d+\.\d+\.\d+/.test(pkg.version ?? "")) {
  console.error(`FAIL: app/package.json version must be semver (got ${pkg.version ?? "missing"})`);
  process.exit(1);
}
const extraResources = pkg.build?.extraResources ?? [];
const shipsDataDir = extraResources.some(
  (entry) =>
    (typeof entry === "string" && entry.includes("data")) ||
    (entry && typeof entry === "object" && String(entry.from ?? "").includes("data")),
);
if (!shipsDataDir) {
  console.error("FAIL: electron-builder extraResources must ship ../data for packaged installs");
  process.exit(1);
}

const bundledDataModule = readFileSync(join(appRoot, "src/core/bundledData.ts"), "utf8");
if (!bundledDataModule.includes("process.resourcesPath")) {
  console.error("FAIL: bundledData.ts must resolve process.resourcesPath for packaged installs");
  process.exit(1);
}

const catalogSource = readFileSync(join(appRoot, "src/core/boxes/catalog.ts"), "utf8");
if (catalogSource.includes("process.cwd()")) {
  console.error("FAIL: boxes/catalog.ts must use core/bundledData.ts, not process.cwd() paths");
  process.exit(1);
}

console.log(
  "\nQA gate passed (typecheck + lint + format + tests + dom tests + build + bundle path checks).",
);
console.log("Still required: pnpm run dev — confirm the window is NOT blank (see tbh-qa skill).");
