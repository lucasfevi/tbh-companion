#!/usr/bin/env node
/**
 * Suggest next semver from app/package.json, latest tag, and commits since tag on main.
 * Run from repo root: node docs/agent/scripts/version-hint.mjs
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function parseVersion(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(v);
  if (!m) throw new Error(`Invalid semver in package.json: ${v}`);
  return { major: +m[1], minor: +m[2], patch: +m[3], raw: `${m[1]}.${m[2]}.${m[3]}` };
}

function resolveCompareRef() {
  try {
    sh("git rev-parse --verify main");
    return "main";
  } catch {
    try {
      sh("git rev-parse --verify origin/main");
      return "origin/main";
    } catch {
      return "HEAD";
    }
  }
}

const pkg = JSON.parse(readFileSync("app/package.json", "utf8"));
const current = parseVersion(pkg.version);

let latestTag = "";
try {
  latestTag = sh("git describe --tags --abbrev=0");
} catch {
  latestTag = "";
}

const compareRef = resolveCompareRef();
const compareRange = latestTag ? `${latestTag}..${compareRef}` : compareRef;

let subjects = [];
if (latestTag) {
  try {
    const log = sh(`git log ${compareRange} --pretty=format:%s --no-merges`);
    subjects = log ? log.split("\n").filter(Boolean) : [];
  } catch {
    subjects = [];
  }
}

const breaking =
  subjects.some((s) => /^(feat|fix)(\(.+\))?!:/.test(s) || /^.+!:/.test(s)) ||
  subjects.some((s) => /BREAKING CHANGE/i.test(s));

const hasFeat = subjects.some((s) => /^feat(\(.+\))?:/.test(s));
const hasFix = subjects.some((s) => /^fix(\(.+\))?:/.test(s));

let bump = "patch";
let next = `${current.major}.${current.minor}.${current.patch + 1}`;

if (breaking) {
  bump = "major";
  next = `${current.major + 1}.0.0`;
} else if (hasFeat) {
  bump = "minor";
  next = `${current.major}.${current.minor + 1}.0`;
}

const out = {
  packageVersion: current.raw,
  latestTag: latestTag || null,
  compareRef,
  compareRange,
  commitsSinceTag: subjects.length,
  signals: { breaking, feat: hasFeat, fix: hasFix },
  suggestedBump: bump,
  suggestedVersion: next,
  recentSubjects: subjects.slice(0, 15),
  note: "Override using CHANGELOG [Unreleased] user-facing bullets — see docs/agent/references/semver-guide.md",
};

console.log(JSON.stringify(out, null, 2));
