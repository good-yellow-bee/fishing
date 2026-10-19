import { afterEach, describe, expect, it } from "vitest";
import { setLang, t } from "../i18n";
import { NEWS_ITEMS } from "../game/whatsNew";
import { FIELD_NEWS } from "./fieldNews";

afterEach(() => setLang("en"));

describe("round 97 ideas: words in Polish", () => {
  it("says what Undo puts back and the outing out now", () => {
    setLang("pl");
    expect(t("All unpacked.")).toBe("Wszystko rozpakowane.");
    expect(t("{piece} taken off the list.", { piece: "Podbierak" })).toBe("Podbierak: zdjęte z listy.");
    expect(t("Out now: {outing}", { outing: "Night now" })).toBe("Teraz na wodzie: Night now");
  });

  it("puts the news on Home", () => {
    const line = NEWS_ITEMS.find((item) => item.startsWith("An outing's tackle list offers Undo"));
    expect(line && FIELD_NEWS.has(line)).toBe(true);
  });
});
