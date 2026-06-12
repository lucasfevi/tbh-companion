#!/usr/bin/env node
/**
 * Mirror active skills from .cursor/skills to .claude/skills.
 * Canonical edits: .cursor/skills/<name>/
 * Run: node scripts/sync-agent-skills.mjs [--check]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(repoRoot, ".cursor", "skills");
const destRoot = path.join(repoRoot, ".claude", "skills");

/** Upstream imports replaced by TBH-native skills — not mirrored to Claude. */
const EXCLUDE = new Set(["best-practices", "react-best-practices"]);

function listSkillDirs(root) {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !EXCLUDE.has(d.name))
    .filter((d) => fs.existsSync(path.join(root, d.name, "SKILL.md")))
    .map((d) => d.name)
    .sort();
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function walk(dir, onFile, prefix = "") {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, onFile, rel);
    else onFile(rel);
  }
}

function fileContentHash(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

function dirFingerprint(root, names) {
  const files = [];
  for (const name of names) {
    walk(path.join(root, name), (rel) => files.push(`${name}/${rel}`));
  }
  files.sort();
  return files
    .map((rel) => {
      const full = path.join(root, rel);
      return `${rel}:${fileContentHash(full)}`;
    })
    .join("\n");
}

function removeStaleDestDirs(activeNames) {
  if (!fs.existsSync(destRoot)) return;
  const active = new Set(activeNames);
  for (const entry of fs.readdirSync(destRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!active.has(entry.name)) {
      fs.rmSync(path.join(destRoot, entry.name), { recursive: true, force: true });
    }
  }
}

const checkOnly = process.argv.includes("--check");
const names = listSkillDirs(srcRoot);

if (names.length === 0) {
  console.error("No skills found under .cursor/skills/");
  process.exit(1);
}

if (checkOnly) {
  const srcFp = dirFingerprint(srcRoot, names);
  const destFp = dirFingerprint(destRoot, names);
  const destNames = listSkillDirs(destRoot);
  if (srcFp !== destFp || destNames.join() !== names.join()) {
    console.error(
      ".claude/skills is out of sync with .cursor/skills. Run: npm run sync:skills",
    );
    process.exit(1);
  }
  console.log(`Skills mirror OK (${names.length} skills).`);
  process.exit(0);
}

fs.mkdirSync(destRoot, { recursive: true });
removeStaleDestDirs(names);

for (const name of names) {
  const src = path.join(srcRoot, name);
  const dest = path.join(destRoot, name);
  fs.rmSync(dest, { recursive: true, force: true });
  copyDir(src, dest);
  console.log(`synced ${name}`);
}

console.log(`Done — ${names.length} skill(s) → .claude/skills/`);
