import { bench, describe } from "vitest";
import { decryptToText } from "../../src/core/es3";
import { es3Encrypt } from "./fixtures/es3Fixture";
import { buildLargeSaveText } from "./fixtures/syntheticSave";

const encryptedSave = es3Encrypt(buildLargeSaveText());

describe("es3 decrypt", () => {
  bench("decryptToText (1500 items)", () => {
    decryptToText(encryptedSave);
  });
});
