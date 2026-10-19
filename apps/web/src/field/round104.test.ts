import { afterEach, describe, expect, it } from "vitest";
import { setLang, t } from "../i18n";
import { bookSpelling, pieceName } from "./gear/pieceKey";

afterEach(() => setLang("en"));

describe("round 104: a kind typed in the plural with -es", () => {
  it("reads as the dictionary's kind", () => {
    expect(bookSpelling("Perches")).toBe("Perch");
    expect(bookSpelling("spinners")).toBe("Spinner");
    expect(bookSpelling("Glasses")).toBe("Glasses");
    setLang("pl");
    expect(pieceName("perches ")).toBe(t("Perch"));
  });
});
