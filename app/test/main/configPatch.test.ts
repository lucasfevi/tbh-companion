import { describe, it, expect, vi } from "vitest";
import { applyConfigPatch } from "../../src/main/ipc/configPatch";
import type { Config } from "../../src/main/config";
import { XpTracker } from "../../src/core/tracker";

function baseConfig(): Config {
  return {
    savePath: "%USERPROFILE%\\save.es3",
    es3Password: "test",
    pollIntervalSeconds: 5,
    rollingWindowMinutes: 5,
    startTopmost: true,
    logHistoryCsv: true,
    currency: "USD",
  };
}

describe("applyConfigPatch", () => {
  it("re-fetches prices when currency changes", () => {
    let cfg = baseConfig();
    const ensureOwnedPrices = vi.fn();
    const market = { setCurrency: vi.fn() };

    applyConfigPatch(
      {
        getConfig: () => cfg,
        setConfig: (c) => {
          cfg = c;
        },
        saveConfig: vi.fn(),
        getTracker: () => new XpTracker(300),
        setTracker: vi.fn(),
        getMarket: () => market as never,
        restartWatcher: vi.fn(),
        setAlwaysOnTop: vi.fn(),
        pushStats: vi.fn(),
        resolveAndPushInventory: vi.fn(),
        ensureOwnedPrices,
      },
      { currency: "BRL" },
    );

    expect(market.setCurrency).toHaveBeenCalledWith("BRL");
    expect(ensureOwnedPrices).toHaveBeenCalledWith(true);
  });

  it("updates CSV logger without recreating tracker when only logHistoryCsv toggles", () => {
    let cfg = baseConfig();
    const tracker = new XpTracker(300);
    tracker.onHistory = () => {};
    const setTracker = vi.fn();

    applyConfigPatch(
      {
        getConfig: () => cfg,
        setConfig: (c) => {
          cfg = c;
        },
        saveConfig: vi.fn(),
        getTracker: () => tracker,
        setTracker,
        getMarket: () => ({ setCurrency: vi.fn() }) as never,
        restartWatcher: vi.fn(),
        setAlwaysOnTop: vi.fn(),
        pushStats: vi.fn(),
        resolveAndPushInventory: vi.fn(),
        ensureOwnedPrices: vi.fn(),
      },
      { logHistoryCsv: false },
    );

    expect(setTracker).not.toHaveBeenCalled();
    expect(tracker.onHistory).toBeNull();
  });

  it("fills notificationVolume when patching legacy config missing the field", () => {
    let cfg = baseConfig();

    const next = applyConfigPatch(
      {
        getConfig: () => cfg,
        setConfig: (c) => {
          cfg = c;
        },
        saveConfig: vi.fn(),
        getTracker: () => new XpTracker(300),
        setTracker: vi.fn(),
        getMarket: () => ({ setCurrency: vi.fn() }) as never,
        restartWatcher: vi.fn(),
        setAlwaysOnTop: vi.fn(),
        pushStats: vi.fn(),
        resolveAndPushInventory: vi.fn(),
        ensureOwnedPrices: vi.fn(),
      },
      { currency: "EUR" },
    );

    expect(next.notificationVolume).toBe(100);
    expect(cfg.notificationVolume).toBe(100);
  });
});
