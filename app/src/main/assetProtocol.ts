import { protocol } from "electron";
import { existsSync, readFileSync } from "node:fs";
import { bundledDataCandidates } from "../core/bundledData";
import { createLogger } from "./log";

const log = createLogger("assetProtocol");

export const ASSET_PROTOCOL_SCHEME = "tbh-asset";
const ICON_NAME_RE = /^[A-Za-z0-9_]+$/;

/** Must run before app.whenReady() — Electron only accepts privileged scheme registration pre-ready. */
export function registerAssetProtocolScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: ASSET_PROTOCOL_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: false },
    },
  ]);
}

/** Bundled icon PNGs live at data/icons/<iconPath>.png; reject anything outside that name shape. */
function resolveIconPath(iconPath: string): string | null {
  if (!ICON_NAME_RE.test(iconPath)) return null;
  const candidates = bundledDataCandidates(`icons/${iconPath}.png`);
  return candidates.find((p) => existsSync(p)) ?? null;
}

/** Call once after app.whenReady(). Serves bundled game item icons at tbh-asset://icon/<iconPath>. */
export function registerAssetProtocolHandler(): void {
  protocol.handle(ASSET_PROTOCOL_SCHEME, (request) => {
    const url = new URL(request.url);
    if (url.hostname !== "icon") {
      return new Response(null, { status: 404 });
    }
    const name = decodeURIComponent(url.pathname.replace(/^\//, ""));
    const filePath = resolveIconPath(name);
    if (!filePath) {
      return new Response(null, { status: 404 });
    }
    try {
      return new Response(readFileSync(filePath), { headers: { "content-type": "image/png" } });
    } catch (err) {
      log.warn(`failed to read icon "${name}": ${String(err)}`);
      return new Response(null, { status: 404 });
    }
  });
  log.info(`${ASSET_PROTOCOL_SCHEME} protocol handler registered`);
}
