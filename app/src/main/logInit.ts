// Initialize electron-log path before any other main modules call createLogger().
import { initDiagnosticLog } from "./log";

initDiagnosticLog();
