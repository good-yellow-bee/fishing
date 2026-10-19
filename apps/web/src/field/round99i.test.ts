import { afterEach, describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { setLang, t } from "../i18n";
import { NEWS_ITEMS } from "../game/whatsNew";
import { FIELD_NEWS } from "./fieldNews";
import { spotSummary } from "./summaries";

afterEach(() => setLang("en"));

describe("round 99 ideas: a water's copied summary", () => {
  it("says when it was last fished, and copies a water fished only blank", () => {
    const spot = { ...sampleLogbook(new Date(2026, 9, 1)).spots[0]!, name: "Dry Lake", place: undefined };
    const text = spotSummary(spot, 2, [], null, null, "Last fished here: Wed, Oct 14 · 0 fish");
    expect(text).toContain("2 outings · 0 fish");
    expect(text).toContain("Last fished here: Wed, Oct 14 · 0 fish");
    setLang("pl");
    expect(t("Last fished here: {day}", { day: "śr., 14 paź" })).toBe("Ostatnio łowione tu: śr., 14 paź");
  });

  it("puts the news on Home", () => {
    const line = NEWS_ITEMS.find((item) => item.startsWith("On Waters, each card names the water's best fish"));
    expect(line && FIELD_NEWS.has(line)).toBe(true);
  });
});
