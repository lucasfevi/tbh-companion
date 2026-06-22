/** Bundled game item icon, served by the main-process tbh-asset protocol handler. */
export function iconSrc(iconPath: string): string {
  return `tbh-asset://icon/${encodeURIComponent(iconPath)}`;
}
