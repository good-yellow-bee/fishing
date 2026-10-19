import { afterEach, describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { setLang, t } from "../i18n";
import { inSentence } from "./MonthBars";
import { gpxFor } from "./gpx";

afterEach(() => setLang("en"));

describe("round 99: Polish lower-cases only a label's first letter mid-line", () => {
  it("keeps the unit's capital", () => {
    setLang("pl");
    expect(inSentence("Od 10°C do 16°C")).toBe("od 10°C do 16°C");
    expect(inSentence("Wrzesień")).toBe("wrzesień");
    expect(inSentence("")).toBe("");
  });
});

describe("round 99: GPX writes a place on the equator as a plain decimal", () => {
  it("never in exponent form", () => {
    const spot = { ...sampleLogbook(new Date(2026, 9, 1)).spots[0]!, place: { lat: -0.0000001, lng: 21.123456789 } };
    const gpx = gpxFor([spot]);
    expect(gpx).toContain('lat="0" lon="21.123457"');
    expect(gpx).not.toMatch(/e-\d/);
  });
});

describe("round 99: words in Polish", () => {
  it("names the sample week's waters, the game's lake and its namesake", () => {
    setLang("pl");
    expect(t("From the sample week ({n})", { n: 5 })).toBe("Z przykładowego tygodnia (5)");
    expect(t("The game's lake")).toBe("Jezioro z gry");
    expect(t("The game's lake is called that too; your water is kept apart from it.")).toBe("Jezioro z gry też tak się nazywa; to łowisko jest liczone osobno.");
  });
});
