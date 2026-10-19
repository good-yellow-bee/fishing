import { afterEach, describe, expect, it } from "vitest";
import type { Trip } from "@stillwater/shared";
import { setLang, t } from "../i18n";
import { averageParts, outingAverage } from "./outingAverage";

afterEach(() => setLang("en"));

const trip = (id: string, date: string): Trip => ({ id, date, spotId: "s", title: "", note: "" });
const trips = [trip("a", "2026-10-01"), trip("b", "2026-10-02"), trip("c", "2026-10-03")];
const fish = new Map([["a", 3], ["b", 0], ["c", 0]]);
const fishOn = (id: string) => fish.get(id) ?? 0;

describe("round 100 ideas: the average's blank outings apart, for their link", () => {
  it("says the same line as before, in two parts", () => {
    expect(averageParts(trips, fishOn, "2026-10-19")).toEqual({ average: "1 fish an outing on average", blank: "2 without a fish" });
    expect(outingAverage(trips, fishOn, "2026-10-19")).toBe("1 fish an outing on average, 2 without a fish");
    expect(averageParts(trips.slice(0, 1), fishOn, "2026-10-19")).toBeNull();
  });
});

describe("round 100 ideas: words in Polish", () => {
  it("says Out now, last night and the last time here", () => {
    setLang("pl");
    expect(t("Out now")).toBe("Teraz na wodzie");
    expect(t("last night|search word")).toBe("wczoraj wieczorem");
    expect(t("Last time here: {day} · {counts}", { day: "pt., 16 paź", counts: "0 ryb" })).toBe("Ostatnio tutaj: pt., 16 paź · 0 ryb");
  });
});
