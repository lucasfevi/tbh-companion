import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("electron", () => ({
  app: { getPath: () => "/tmp/tbh-test" },
}));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});

vi.mock("../../core/bundledData", () => ({
  readBundledJson: vi.fn(() => ({})),
}));

import {
  getSteamItemNameIdService,
  parseNameIdFromListingHtml,
} from "../../src/main/services/steamItemNameId";

describe("parseNameIdFromListingHtml", () => {
  it("parses Market_LoadOrderSpread id", () => {
    expect(
      parseNameIdFromListingHtml("<script>Market_LoadOrderSpread( 176628565 );</script>"),
    ).toBe(176628565);
  });

  it("returns null when legacy embed is missing", () => {
    expect(parseNameIdFromListingHtml("<html>beta spa</html>")).toBeNull();
  });
});

describe("SteamItemNameIdService", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => "<script>Market_LoadOrderSpread( 176628565 );</script>",
      }),
    );
  });

  it("sends bMarketOptOut cookie on legacy listing fetch", async () => {
    const service = getSteamItemNameIdService();
    const result = await service.resolve("Wood");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.nameId).toBe(176628565);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/market/listings/3678970/Wood"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: "bMarketOptOut=1",
        }),
      }),
    );
  });

  it("returns 429 without caching", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => "",
      }),
    );
    const service = getSteamItemNameIdService();
    const result = await service.resolve("Rare Item");
    expect(result).toEqual({ ok: false, status: 429 });
  });
});
