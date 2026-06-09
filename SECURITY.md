# Security Policy

TBH Companion is a **read-only** desktop companion for *Task Bar Hero*. It
decrypts and reads your local save file, displays stats, and optionally queries
**public** Steam Market price endpoints. It does not modify your save, inject into
the game, or authenticate to Steam on your behalf.

Thank you for helping keep users safe. Please report security issues **privately**
— do not open public GitHub issues for exploitable vulnerabilities.

## Supported versions

| Version | Supported |
| ------- | --------- |
| Latest [GitHub Release](https://github.com/lucasfevi/tbh-companion/releases/latest) | Yes |
| `main` branch (pre-release) | Best effort |
| Older releases | No — upgrade to the latest release |

## How to report a vulnerability

**Preferred:** [GitHub Private vulnerability reporting](https://github.com/lucasfevi/tbh-companion/security/advisories/new)
for this repository (Security → Advisories → *Report a vulnerability*).

If private reporting is unavailable, contact the maintainer through GitHub
(@lucasfevi) and ask for a private channel — do **not** post exploit details
in public issues, discussions, or pull requests.

### What to include

A good report helps us fix issues quickly:

1. **Summary** — what goes wrong and why it matters.
2. **Affected versions** — release tag, installer build, or commit hash.
3. **Steps to reproduce** — minimal, reliable steps (screenshots or a short video help).
4. **Impact** — e.g. local file read/write, RCE, IPC sandbox escape, SSRF, XSS → main process.
5. **Environment** — OS version, install path (dev vs packaged installer).
6. **Your suggestion** (optional) — mitigation or fix idea.

Please allow reasonable time for triage before public disclosure (see below).

## Scope

This section defines **what counts as a security bug in this project** — not what
the app is designed to do. We do **not** intend to execute untrusted code, modify
your save, or reach arbitrary files/network hosts. If a flaw lets someone do that,
we want to know.

### Please report (in scope)

Security defects in **this repository’s code and release artifacts** — examples:

| If you find… | That means… |
| ------------ | ----------- |
| **Code execution** via the UI, save data, or catalog/market responses | A bug broke Electron’s sandbox or our IPC boundaries. |
| **Sandbox escape** (renderer gets Node/Electron APIs it shouldn’t) | Same — unintended privilege escalation. |
| **Reading/writing files** outside the configured save, config, and app data dirs | Path handling bug; we only intend to read *your* save path. |
| **The app writing to the game save** | Critical bug — we are read-only by design. |
| **IPC handlers** doing dangerous work on untrusted input | Missing validation in main/preload. |
| **XSS in the UI** that reaches `window.tbh` or main process | Renderer isolation failure. |
| **Catalog/market fetch** reaching unexpected hosts (SSRF, `file://`, internal URLs) | Network allowlist bug — we only intend Steam + the catalog refresh URL. |
| **Tampered releases or build pipeline** | Supply-chain issue in our repo/CI. |

### Not security reports (out of scope)

- Bugs that only affect **correctness** (wrong XP, inventory counts, prices) without
  a security impact.
- The game’s **ES3 password** being documented or configurable — it is required to
  read the save locally and is not treated as a companion secret.
- Vulnerabilities in **TBH: Task Bar Hero**, Steam, Electron/Chromium, or other
  upstream dependencies (report those to the respective vendors; we still want to
  know if a dependency CVE affects our shipped version so we can bump releases).
- **Denial of service** from very large save files or Steam rate limits (unless they
  indicate a clear security boundary failure).
- **Social engineering**, physical access, or malware already running on the user’s PC.

## Security model (what we intend)

- **Main process** holds file I/O, decryption, and network access.
- **Renderer** has no direct Node integration; access is via a narrow `contextBridge`
  API (`window.tbh`).
- **Content Security Policy** restricts renderer scripts and network connections
  (Steam market hosts + bundled app assets).
- **No** game server credentials, Steam login, or write access to the save file.

Reports that show a violation of this model are high priority.

## Response expectations

This is a small, volunteer-maintained project. Targets (not guarantees):

| Stage | Target |
| ----- | ------ |
| Acknowledgment | Within **5 business days** |
| Initial triage / severity assessment | Within **10 business days** |
| Fix or mitigation plan | Depends on severity; critical issues prioritized |

We may ask for clarification. If we cannot reproduce the issue, we will say so.

## Disclosure policy

We follow **coordinated disclosure**:

1. We confirm the issue and work on a fix (often via a private security advisory).
2. We notify you when a fix is ready or when we need more time.
3. We publish an advisory and release containing the fix.
4. We credit reporters who wish to be named (unless you prefer anonymity).

Please **do not** disclose publicly until we have released a fix or agreed on a
timeline. Industry practice is often **90 days** from report to public disclosure;
we will try to meet that for confirmed vulnerabilities and will communicate if we
need longer.

## Safe harbor

We consider good-faith security research on your own installations to be authorized,
provided you:

- Do not access others’ data or systems without permission.
- Do not degrade service for other users.
- Do not exfiltrate personal data beyond what is needed to demonstrate the issue.

We will not pursue legal action against researchers who comply with this policy.

## Recommendations for users

- Download releases only from
  [official GitHub Releases](https://github.com/lucasfevi/tbh-companion/releases)
  for this repository.
- Keep the app updated to the latest release.
- Use a normal (non-admin) Windows account for daily play; point `savePath` only at
  your own TBH save file.
