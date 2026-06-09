#!/usr/bin/env node
/**
 * Automated QA gate — run before marking app changes done.
 * Usage: npm run qa (from app/)
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

run("npm run typecheck");
run("npm test");
run("npm run build");

const mainBundle = join(appRoot, "out/main/index.js");
if (!existsSync(mainBundle)) {
  console.error("FAIL: out/main/index.js missing after build");
  process.exit(1);
}

const main = readFileSync(mainBundle, "utf8");
const badPatterns = [
  { re: /\.\.\/\.\.\/preload/g, label: "../../preload (must be ../preload from out/main/)" },
  { re: /\.\.\/\.\.\/renderer\/index\.html/g, label: "../../renderer (must be ../renderer from out/main/)" },
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

console.log("\nQA gate passed (typecheck + tests + build + bundle path checks).");
console.log("Still required: npm run dev — confirm the window is NOT blank (see tbh-qa skill).");
