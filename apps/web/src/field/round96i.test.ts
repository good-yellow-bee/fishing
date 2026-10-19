import { afterEach, describe, expect, it } from "vitest";
import { setLang, t } from "../i18n";
import { NEWS_ITEMS } from "../game/whatsNew";
import { FIELD_NEWS } from "./fieldNews";

afterEach(() => setLang("en"));

describe("round 96 ideas: words in Polish", () => {
  it("says the last outing, the weekly need, this year's sheet and the last copy", () => {
    setLang("pl");
    expect(t("Last out: {day}", { day: "śr., 14 paź" })).toBe("Ostatnio nad wodą: śr., 14 paź");
    expect(t("{left} to go, about {n} a week", { left: 6, n: 2 })).toBe("brakuje 6, ok. 2 tygodniowo");
    expect(t("This year's catches ({year})", { year: "2026" })).toBe("Połowy z tego roku (2026)");
    expect(t("Last copy: {day} · {fish}.", { day: "pon., 19 paź", fish: "42 ryby" })).toBe("Ostatnia kopia: pon., 19 paź · 42 ryby.");
  });

  it("puts the field log's news on Home", () => {
    const line = NEWS_ITEMS.find((item) => item.startsWith("Home's What's new keeps to the field log"));
    expect(line && FIELD_NEWS.has(line)).toBe(true);
  });
});
