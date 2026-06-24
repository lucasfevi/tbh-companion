# Windows development environment

This project is developed and run on **Windows + PowerShell**. When something behaves oddly, suspect the environment (encoding, paths, line endings, file locking, shell) **before** assuming a logic bug — several "bugs" here turned out to be Windows/PowerShell quirks.

## JSON must be BOM-free

PowerShell 5.1 `Set-Content -Encoding UTF8` writes a UTF-8 **BOM** that breaks `JSON.parse` ("Unexpected token '\uFEFF'"). This silently broke the bundled `data/*.json` catalogs. To write JSON use Node `fs.writeFileSync`, or `[System.IO.File]::WriteAllText($p,$txt,(New-Object System.Text.UTF8Encoding($false)))`. Readers strip a leading BOM defensively, but don't rely on it.

## Shell is PowerShell, not bash

- Chain commands with `;` (not `&&`).
- Quote paths with spaces (the repo path has one).
- Heredocs don't work — pass commit messages with multiple `-m` flags.

## Invoke-WebRequest

Hangs/parses slowly on large HTML in PS 5.1 (legacy DOM parsing). Always pass `-UseBasicParsing`.

## Save file locking

The save file is locked / atomically rewritten by the game while playing. Reads can hit sharing violations or catch a mid-write (ciphertext length not % 16) — retry briefly and treat as transient (see `readBytesShared`).

## Paths

- Game save: `%USERPROFILE%\AppData\LocalLow\...`
- App `userData`: `%APPDATA%`
- Expand env vars (`expandPath`); never hard-code a home dir.

## Line endings

Keep files LF; avoid tools that rewrite to CRLF.

## Electron binary

If `pnpm install` doesn't fetch it (some sandboxes block the postinstall extraction), run `node node_modules/electron/install.js`, or download the matching `electron-v<ver>-win32-x64.zip` and extract it into `node_modules/electron/dist/` with `path.txt` containing `electron.exe`.

pnpm blocks dependency build/postinstall scripts by default — allow-listed packages live in `app/pnpm-workspace.yaml`'s `allowBuilds`; if a new dependency's script gets silently skipped, check the `pnpm install` output for "Ignored build scripts" and add it there (`pnpm approve-builds --all` writes the same file interactively).

## Big numbers

Save ids like `UniqueId` exceed JS safe-integer range and collide after `JSON.parse`; parse losslessly (string/bigint) if you must use them. (Not Windows-specific, but a recurring "why don't these match" trap.)

## PR bodies on PowerShell

Never use inline `gh pr create --body "..."` — see [PULL-REQUEST.md](PULL-REQUEST.md).
