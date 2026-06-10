#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:?RELEASE_VERSION required}"
TAG="${2:?RELEASE_TAG required}"
OUT="${3:-release_body.md}"

PREV=""
if PREV=$(git describe --tags --abbrev=0 "${TAG}^" 2>/dev/null); then
  CHANGES=$(git log "${PREV}..${TAG}" --pretty=format:"- %s" || true)
else
  CHANGES="- See commit history on main"
fi

if [ -z "${CHANGES}" ]; then
  CHANGES="- Maintenance and fixes"
fi

cat > "${OUT}" <<EOF
## What's changed

${CHANGES}

## Download

Download **TBH Companion Setup ${VERSION}.exe** from the **Assets** section below (Windows installer).

## Install (Windows)

1. Download the \`.exe\` installer from this release.
2. Run the installer and choose an install folder if prompted.
3. If Windows SmartScreen appears, click **More info** → **Run anyway** (this build is not code-signed yet).
4. Launch **TBH Companion** from the Start menu.
5. On first launch, open **Settings** and confirm your save file path points to \`SaveFile_Live.es3\`.

## Upgrade

Run the new installer over your existing version. Settings and cached data stay in \`%APPDATA%\\TBH Companion\\\`.

## Troubleshooting

- Config and cache files live in \`%APPDATA%\\TBH Companion\\\`.
- Closing the main window keeps the app running in the system tray — use **Quit** from the tray menu to exit fully.
- If stats or inventory look stale after a game update, restart the app.
EOF
