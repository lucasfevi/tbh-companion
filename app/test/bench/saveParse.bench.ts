import { bench, describe } from "vitest";
import { parseSnapshot } from "../../src/core/save/snapshot";
import { buildLargeSaveText } from "./fixtures/syntheticSave";

const saveText = buildLargeSaveText();

describe("save parse", () => {
  bench("parseSnapshot (1500 items)", () => {
    parseSnapshot(saveText, 1_700_000_000);
  });
});
