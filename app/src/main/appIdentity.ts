// Windows AppUserModelId — load before other main modules (taskbar / notifications).
import { app } from "electron";

/** Keep in sync with `build.appId` in package.json. Do not change after release — NSIS / auto-update identity. */
const PRODUCTION_APP_ID = "com.electron.tbh-companion";

// Dev uses a distinct ID so Windows taskbar metadata is not tied to electron.exe for production.
app.setAppUserModelId(app.isPackaged ? PRODUCTION_APP_ID : `${PRODUCTION_APP_ID}.dev`);

// Do not call app.setName() here. Dev userData must stay on package.json `name` (tbh-companion).
// Packaged builds get productName from electron-builder.
