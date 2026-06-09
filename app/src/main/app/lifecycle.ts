import { shell } from "electron";

/** Open http(s) links in the system browser, not a blank Electron tab. */
export function attachExternalLinkHandlers(contents: Electron.WebContents): void {
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });
}
