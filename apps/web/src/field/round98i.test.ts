import { afterEach, describe, expect, it } from "vitest";
import { setLang, t } from "../i18n";
import { NEWS_ITEMS } from "../game/whatsNew";
import { FIELD_NEWS } from "./fieldNews";

afterEach(() => setLang("en"));

describe("round 98 ideas: words in Polish", () => {
  it("names a water's best, a new record, the season's lure and a goal past last year", () => {
    setLang("pl");
    expect(t("Best here: {species}, {size}", { species: "Szczupak", size: "83,8 cm" })).toBe("Największa tutaj: Szczupak, 83,8 cm");
    expect(t("New best")).toBe("Nowy rekord");
    expect(t("Best lure: {lure} ({count})", { lure: "Jig", count: 4 })).toBe("Najlepsza przynęta: Jig (4)");
    expect(t("Beat last year ({n})", { n: 7 })).toBe("Więcej niż w zeszłym roku (7)");
  });

  it("puts the news on Home", () => {
    const line = NEWS_ITEMS.find((item) => item.startsWith("On Bests, a water's card names its biggest fish"));
    expect(line && FIELD_NEWS.has(line)).toBe(true);
  });
});
