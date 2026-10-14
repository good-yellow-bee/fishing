// @vitest-environment jsdom
import { JSDOM } from "jsdom";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BADGES,
  FIELD_ARCHIVE_REFUSAL,
  FIELD_ARCHIVE_TOO_LARGE,
  FISH,
  LAKE_HOUR_BLURB,
  LAKE_HOUR_LABELS,
  levelUnlock,
  LURE_CLASSES,
  lureClass,
  MAX_SKILL,
  sampleLogbook,
  sampleTackle,
  SKILL_LABELS,
  SKY_BLURB,
  SKY_LABELS,
  SPOT_LABELS,
  STANCE_LABELS,
  WATER_LABELS,
  WIND_LABELS,
  type DailyRequest,
} from "@stillwater/shared";
import { reloadLang, setLang } from ".";
import { bestBeatText, dailyRequestText, measureText, skillUnlockText, weatherText } from "./content";
import { PL } from "./pl";

const browser = new JSDOM("", { url: "http://localhost" });
afterAll(() => browser.window.close());

beforeEach(() => {
  vi.stubGlobal("localStorage", browser.window.localStorage);
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  reloadLang();
});

function missing(values: Iterable<string>): string[] {
  return [...new Set(values)].filter((value) => typeof PL[value] !== "string");
}

describe("Polish game content", () => {
  it("names every species and tells its lore", () => {
    expect(missing(FISH.map((fish) => fish.name))).toEqual([]);
    expect(missing(FISH.map((fish) => fish.lore))).toEqual([]);
    expect(missing(FISH.map((fish) => fish.rarity))).toEqual([]);
  });

  it("has every shared label and blurb", () => {
    const records: Record<string, string>[] = [
      SKILL_LABELS,
      SPOT_LABELS,
      STANCE_LABELS,
      SKY_LABELS,
      SKY_BLURB,
      WIND_LABELS,
      WATER_LABELS,
      LAKE_HOUR_LABELS,
      LAKE_HOUR_BLURB,
    ];
    expect(missing(records.flatMap((record) => Object.values(record)))).toEqual([]);
  });

  it("has every level unlock and badge", () => {
    const unlocks = Array.from({ length: 20 }, (_, level) => levelUnlock(level)).filter((line): line is string => line !== null);
    expect(unlocks.length).toBeGreaterThan(0);
    expect(missing(unlocks)).toEqual([]);
    expect(missing(BADGES.flatMap((badge) => [badge.label, badge.blurb]))).toEqual([]);
  });

  it("has every lure class and sample piece of tackle", () => {
    expect(missing([...LURE_CLASSES.map((one) => one.label), lureClass("nothing known").label])).toEqual([]);
    expect(missing(sampleTackle().map((item) => item.label))).toEqual([]);
  });

  it("has the sample field log", () => {
    const book = sampleLogbook(new Date(2026, 5, 1));
    const lines = [
      ...book.spots.flatMap((spot) => [spot.name, spot.notes, spot.bestConditions]),
      ...book.trips.flatMap((trip) => [trip.title, trip.note]),
      ...book.catches.flatMap((entry) => [entry.species, entry.lure, entry.note]),
    ];
    expect(missing(lines)).toEqual([]);
    expect(missing([FIELD_ARCHIVE_REFUSAL, FIELD_ARCHIVE_TOO_LARGE])).toEqual([]);
  });
});

describe("content sentences in Polish", () => {
  const perch: DailyRequest = { id: "perch-heavy", speciesId: "perch", minWeight: 0.9, count: 1, reward: 22 };
  const shiners: DailyRequest = { id: "shiner-dock", speciesId: "golden-shiner", spot: "dock", count: 3, reward: 15 };

  it("stays English by default", () => {
    expect(dailyRequestText(perch)).toBe("A yellow perch over 0.9 lb");
    expect(dailyRequestText(shiners)).toBe("3 × golden shiner at the Dock");
  });

  it("builds daily requests, weather, measures, unlocks and beats in Polish", () => {
    setLang("pl");
    expect(dailyRequestText(perch)).toBe("1 × okoń żółty powyżej 0,9 lb");
    expect(dailyRequestText(shiners)).toBe("3 × złotawiec — Pomost");
    expect(weatherText({ sky: "overcast", wind: "light-north", waterTempF: 52.5 })).toBe("Pochmurno · Słaby z północy · 52,5°F");
    expect(measureText({ kind: "weight", pounds: 2.4 })).toBe("2,4 lb");
    const fresh = { strength: 1, accuracy: 1, patience: 1 };
    expect(skillUnlockText(fresh, "strength")).toBe("Siła 2: Pstrąg źródlany, Bass małogębowy, Pstrąg tęczowy, Bass wielkogębowy");
    expect(skillUnlockText({ strength: MAX_SKILL, accuracy: MAX_SKILL, patience: 1 }, "strength")).toBeNull();
    expect(bestBeatText({ scope: "book", previousPounds: 2.1, previousSpecies: "Walleye", line: "" })).toBe(
      "Bije wpis z dziennika połowów: Sandacz amerykański, 2,1 lb",
    );
    expect(bestBeatText({ scope: "species", previousPounds: 2.1, previousSpecies: "Walleye", line: "" })).toBe(
      "Bije twój wpis z dziennika połowów: Sandacz amerykański, 2,1 lb",
    );
  });
});
