#!/usr/bin/env node
/**
 * Automated QA gate — run before marking app changes done.
 * Usage: pnpm qa (from app/)
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd: appRoot, stdio: "inherit", shell: true });
}

run("pnpm typecheck");
run("pnpm lint");
run("pnpm format:check");
run("pnpm test");
run("pnpm test:dom");
run("pnpm build");
run("pnpm minify-and-copy-data");

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
    console.error("See docs/agent/QA-CHECKLIST.md");
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

const stagedDataDir = join(appRoot, "dist", "data");
const stagedCriticalFiles = [
  "gamedata.json",
  "stage_boxes.json",
  "box_types.json",
  "rune_box_cap.json",
  "steam_item_nameids.json",
  "steam_market_fee.json",
];
for (const file of stagedCriticalFiles) {
  const path = join(stagedDataDir, file);
  if (!existsSync(path)) {
    console.error(`FAIL: missing staged data file dist/data/${file} after minify-and-copy-data`);
    process.exit(1);
  }
}
const stagedGamedata = JSON.parse(readFileSync(join(stagedDataDir, "gamedata.json"), "utf8"));
if (!Array.isArray(stagedGamedata.items) || stagedGamedata.items.length === 0) {
  console.error("FAIL: dist/data/gamedata.json must contain a non-empty items array");
  process.exit(1);
}

const packagedIconsDir = join(stagedDataDir, "icons");
if (!existsSync(packagedIconsDir)) {
  console.error(
    "FAIL: dist/data/icons missing after minify-and-copy-data (game item icons required for packaged installs)",
  );
  process.exit(1);
}
const packagedIconCount = readdirSync(packagedIconsDir).filter((name) =>
  name.endsWith(".png"),
).length;
if (packagedIconCount === 0) {
  console.error("FAIL: dist/data/icons has no PNG files after minify-and-copy-data");
  process.exit(1);
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
console.log("Still required: pnpm dev — confirm the window is NOT blank (see docs/agent/QA.md).");
