#!/usr/bin/env node
/**
 * Minify bundled data/*.json catalogs into app/dist/data/ for packaging.
 * Source files in ../data stay pretty-printed (readable diffs); only the
 * packaged copy is minified. Run before pack/dist — see app/package.json.
 * Usage (from app/):
 *   pnpm run minify-data
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = join(appRoot, "..", "data");
const outDir = join(appRoot, "dist", "data");

mkdirSync(outDir, { recursive: true });

const files = readdirSync(sourceDir).filter((name) => name.endsWith(".json"));

let totalPretty = 0;
let totalMinified = 0;
const rows = [];

for (const file of files) {
  const srcPath = join(sourceDir, file);
  const rawWithBom = readFileSync(srcPath, "utf-8");
  const raw = rawWithBom.charCodeAt(0) === 0xfeff ? rawWithBom.slice(1) : rawWithBom;
  const data = JSON.parse(raw);
  const minified = JSON.stringify(data);

  writeFileSync(join(outDir, file), minified, "utf-8");

  const prettyBytes = statSync(srcPath).size;
  const minifiedBytes = Buffer.byteLength(minified, "utf-8");
  totalPretty += prettyBytes;
  totalMinified += minifiedBytes;
  rows.push({ file, prettyBytes, minifiedBytes });
}

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatSavings(prettyBytes, minifiedBytes) {
  if (prettyBytes === 0) return "0.0%";
  return `${(((prettyBytes - minifiedBytes) / prettyBytes) * 100).toFixed(1)}%`;
}

console.log("\n[minify-data] data/*.json -> dist/data/*.json\n");
for (const { file, prettyBytes, minifiedBytes } of rows) {
  console.log(
    `  ${file.padEnd(28)} ${formatKb(prettyBytes).padStart(10)} -> ${formatKb(minifiedBytes).padStart(10)}  (-${formatSavings(prettyBytes, minifiedBytes)})`,
  );
}
console.log(
  `  ${"TOTAL".padEnd(28)} ${formatKb(totalPretty).padStart(10)} -> ${formatKb(totalMinified).padStart(10)}  (-${formatSavings(totalPretty, totalMinified)})`,
);
console.log(`\n[minify-data] Wrote ${rows.length} file(s) to ${outDir}`);
