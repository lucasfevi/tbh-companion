import { describe, it, expect } from "vitest";
import { platform } from "node:os";
import { dirname, join } from "node:path";
import { parseGetBoxCountItemKeys, playerLogPathFromSave } from "../../src/core/playerLog";

describe("playerLog", () => {
  it("derives Player.log path from save path", () => {
    const savePath = join(
      "AppData",
      "LocalLow",
      "TesseractStudio",
      "TaskbarHero",
      "SaveFile_Live.es3",
    );
    expect(playerLogPathFromSave(savePath)).toBe(
      join("AppData", "LocalLow", "TesseractStudio", "TaskbarHero", "Player.log"),
    );
  });

  it.skipIf(platform() !== "win32")(
    "derives Player.log path from native Windows save paths",
    () => {
      const savePath =
        "C:\\Users\\me\\AppData\\LocalLow\\TesseractStudio\\TaskbarHero\\SaveFile_Live.es3";
      expect(playerLogPathFromSave(savePath)).toBe(join(dirname(savePath), "Player.log"));
    },
  );

  it("parses GetBoxCount Success lines", () => {
    const chunk = `
GetBoxCount Success Count : 1 // ItemKey : 920501
UnityEngine.Debug:Log(Object)
GetBoxCount Success Count : 1 // ItemKey : 920151
`;
    expect(parseGetBoxCountItemKeys(chunk)).toEqual([920501, 920151]);
  });

  it("ignores unrelated log lines", () => {
    expect(parseGetBoxCountItemKeys("Some other log line\n")).toEqual([]);
  });
});
