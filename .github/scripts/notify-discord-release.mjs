#!/usr/bin/env node
/**
 * Post a GitHub release notification to Discord (#app-releases webhook).
 *
 * Usage:
 *   node .github/scripts/notify-discord-release.mjs VERSION TAG REPO [BODY_FILE] [WEBHOOK_URL]
 *
 * Webhook URL: 5th argument, or DISCORD_WEBHOOK / DISCORD_RELEASE_WEBHOOK_URL env vars.
 */
import fs from "node:fs";
import path from "node:path";

const [version, tag, repo, bodyFile = "release_body.md", webhookArg] = process.argv.slice(2);

if (!version || !tag || !repo) {
  console.error(
    "Usage: node notify-discord-release.mjs VERSION TAG REPO [BODY_FILE] [WEBHOOK_URL]",
  );
  process.exit(1);
}

const webhook =
  webhookArg || process.env.DISCORD_WEBHOOK || process.env.DISCORD_RELEASE_WEBHOOK_URL || "";

if (!webhook) {
  console.log(
    "Discord webhook not set; skipping (set DISCORD_WEBHOOK, DISCORD_RELEASE_WEBHOOK_URL, or pass URL as 5th argument)",
  );
  process.exit(0);
}

const bodyPath = path.resolve(bodyFile);
if (!fs.existsSync(bodyPath)) {
  console.warn(`::warning::${bodyFile} not found; skipping Discord notification`);
  process.exit(0);
}

const releaseUrl = `https://github.com/${repo}/releases/tag/${tag}`;
const bodyText = fs.readFileSync(bodyPath, "utf8");

function extractWhatsChanged(markdown) {
  const lines = markdown.split(/\r?\n/);
  const out = [];
  let found = false;

  for (const line of lines) {
    if (/^## What/.test(line)) {
      found = true;
      continue;
    }
    if (found && /^## /.test(line)) {
      break;
    }
    if (found) {
      out.push(line);
    }
  }

  let notes = out.join("\n").replace(/^\s*\n+/, "").trim();
  if (notes.length > 3500) {
    notes = notes.slice(0, 3500);
  }
  return notes || "See the GitHub release for details.";
}

const notes = extractWhatsChanged(bodyText);
const downloadField = `Download **tbh-companion-setup-${version}.exe** from [GitHub Releases](${releaseUrl}) (Assets section).`;

const payload = {
  username: "TBH Companion Releases",
  embeds: [
    {
      title: `TBH Companion ${version}`,
      url: releaseUrl,
      description: notes,
      color: 5814783,
      fields: [{ name: "Download", value: downloadField }],
    },
  ],
};

const response = await fetch(webhook, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

if (!response.ok) {
  const detail = await response.text().catch(() => "");
  console.warn(`::warning::Failed to post release notification to Discord (${response.status})${detail ? `: ${detail}` : ""}`);
  process.exit(0);
}

console.log("Posted release notification to Discord");
