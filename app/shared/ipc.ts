/** IPC channel names — single source of truth for main + preload. */
export const IPC = {
  // Push (main → renderer)
  STATS: "stats",
  INVENTORY: "inventory",
  CHESTS: "chests",
  BOX_TIMERS: "box-timers",
  PRICES_PROGRESS: "prices-progress",

  // Invoke (renderer → main)
  GET_STATS: "get-stats",
  GET_INVENTORY: "get-inventory",
  GET_CHESTS: "get-chests",
  GET_BOX_TIMERS: "get-box-timers",
  MARK_BOX_DROPPED: "mark-box-dropped",
  CLEAR_BOX_TIMER: "clear-box-timer",
  SET_BOX_TRACKER_BOXES: "set-box-tracker-boxes",
  GET_CONFIG: "get-config",
  SAVE_CONFIG: "save-config",
  GAMEDATA_STATUS: "gamedata-status",
  GAMEDATA_REFRESH: "gamedata-refresh",
  PRICES_STATUS: "prices-status",
  PRICES_REFRESH: "prices-refresh",
  SET_CURRENCY: "set-currency",

  // Send (renderer → main, no response)
  RESET: "reset",
  OPEN_OVERLAY: "open-overlay",
  OPEN_BOX_TRACKER: "open-box-tracker",
  CLOSE_BOX_TRACKER: "close-box-tracker",
  SHOW_MAIN: "show-main",
  CLOSE_OVERLAY: "close-overlay",
  PRICES_CANCEL: "prices-cancel",
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];

/** All channels that must have preload wiring (for contract tests). */
export const IPC_INVOKE_CHANNELS = [
  IPC.GET_STATS,
  IPC.GET_INVENTORY,
  IPC.GET_CHESTS,
  IPC.GET_BOX_TIMERS,
  IPC.MARK_BOX_DROPPED,
  IPC.CLEAR_BOX_TIMER,
  IPC.SET_BOX_TRACKER_BOXES,
  IPC.GET_CONFIG,
  IPC.SAVE_CONFIG,
  IPC.GAMEDATA_STATUS,
  IPC.GAMEDATA_REFRESH,
  IPC.PRICES_STATUS,
  IPC.PRICES_REFRESH,
  IPC.SET_CURRENCY,
] as const;

export const IPC_SEND_CHANNELS = [
  IPC.RESET,
  IPC.OPEN_OVERLAY,
  IPC.OPEN_BOX_TRACKER,
  IPC.CLOSE_BOX_TRACKER,
  IPC.SHOW_MAIN,
  IPC.CLOSE_OVERLAY,
  IPC.PRICES_CANCEL,
] as const;

export const IPC_PUSH_CHANNELS = [
  IPC.STATS,
  IPC.INVENTORY,
  IPC.CHESTS,
  IPC.BOX_TIMERS,
  IPC.PRICES_PROGRESS,
] as const;
