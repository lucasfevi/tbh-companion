#!/usr/bin/env node
/**
 * Stage bundled data for packaging: minify data/*.json and copy data/icons/
 * into app/dist/data/. Source JSON in ../data stays pretty-printed (readable
 * diffs); only the packaged copy is minified. Run before pack/dist — see
 * app/package.json.
 * Usage (from app/):
 *   pnpm run minify-and-copy-data
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const logTag = "[minify-and-copy-data]";
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

console.log(`\n${logTag} data/*.json -> dist/data/*.json\n`);
for (const { file, prettyBytes, minifiedBytes } of rows) {
  console.log(
    `  ${file.padEnd(28)} ${formatKb(prettyBytes).padStart(10)} -> ${formatKb(minifiedBytes).padStart(10)}  (-${formatSavings(prettyBytes, minifiedBytes)})`,
  );
}
console.log(
  `  ${"TOTAL".padEnd(28)} ${formatKb(totalPretty).padStart(10)} -> ${formatKb(totalMinified).padStart(10)}  (-${formatSavings(totalPretty, totalMinified)})`,
);
console.log(`\n${logTag} Wrote ${rows.length} file(s) to ${outDir}`);

const iconsSource = join(sourceDir, "icons");
const iconsDest = join(outDir, "icons");
if (!existsSync(iconsSource)) {
  console.error(`${logTag} FAIL: missing bundled icons directory at ${iconsSource}`);
  process.exit(1);
}
cpSync(iconsSource, iconsDest, { recursive: true });
const iconCount = readdirSync(iconsDest).filter((name) => name.endsWith(".png")).length;
if (iconCount === 0) {
  console.error(`${logTag} FAIL: no PNG icons copied to ${iconsDest}`);
  process.exit(1);
}
console.log(`${logTag} Copied ${iconCount} icon(s) to ${iconsDest}`);
