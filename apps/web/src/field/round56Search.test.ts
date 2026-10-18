import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { t } from "../i18n";
import { findCatches } from "./CatchSearch";
import { pluralOf } from "./pluralWord";

describe("searches as people type them, round 56", () => {
  const sample = sampleLogbook(new Date(2026, 9, 15));
  const fish = sample.catches[0]!;
  const ids = (book: typeof sample, needle: string) => findCatches(book, needle, t).map((entry) => entry.id).sort();

  it("reads a phrase whose short words drop out as its one word", () => {
    expect(ids(sample, "at dawn")).toEqual(ids(sample, "dawn"));
    expect(ids(sample, "in fall")).toEqual(ids(sample, "fall"));
    expect(ids(sample, "dawn").length).toBeGreaterThan(0);
  });

  it("keeps an inch mark inside a quoted lure name", () => {
    const book = { ...sample, catches: [{ ...fish, id: "senko", lure: '4" Senko - green' }, { ...fish, id: "other", lure: "Jig" }] };
    expect(ids(book, 'lure:"4" Senko - green"')).toEqual(["senko"]);
    expect(ids(book, 'lure:"4" Senko - green" + released')).toEqual(fish.released ? ["senko"] : []);
  });

  it("finds a range typed without from, and a weight as a scale reads it", () => {
    const sized = (id: string, inches: number) => ({ ...fish, id, measure: { kind: "length" as const, inches }, alsoMeasure: undefined });
    const book = { ...sample, catches: [sized("a", 40 / 2.54), sized("b", 55 / 2.54), sized("c", 60 / 2.54), { ...fish, id: "w", measure: { kind: "weight" as const, pounds: 3.125 }, alsoMeasure: undefined }] };
    expect(ids(book, "50 to 60 cm")).toEqual(["b", "c"]);
    expect(ids(book, "3 lb 2 oz")).toEqual(["w"]);
  });

  it("puts a night session's small-hours fish on its outing's weekday for weekend", () => {
    // 2026-10-16 is a Friday; the fish came in at 01:30 on the Saturday.
    const trip = { ...sample.trips[0]!, id: "fri", date: "2026-10-16" };
    const book = { ...sample, trips: [trip], catches: [{ ...fish, id: "late", tripId: "fri", caughtAt: new Date(2026, 9, 17, 1, 30).toISOString() }] };
    expect(ids(book, "weekend")).toEqual([]);
  });

  it("opens a link made in Polish after a switch to English", () => {
    const book = { ...sample, catches: [{ ...fish, id: "pike", species: "Northern pike" }] };
    expect(ids(book, 'species:"Szczupak"')).toEqual(["pike"]);
  });

  it("reads a Polish adjective's plural", () => {
    expect(pluralOf("teczowe", "teczowy")).toBe(true);
    expect(pluralOf("zrodlane", "zrodlany")).toBe(true);
  });
});

describe("clock hours in a search", () => {
  it("reads a run of hours only with am/pm, a :00 or godz.", async () => {
    const { hourRange } = await import("./CatchSearch");
    expect(hourRange("5-8am")).toEqual({ from: 5, to: 8 });
    expect(hourRange("5-8pm")).toEqual({ from: 17, to: 20 });
    expect(hourRange("05:00-08:00")).toEqual({ from: 5, to: 8 });
    expect(hourRange("godz. 5–8")).toEqual({ from: 5, to: 8 });
    expect(hourRange("22:00-2:00")).toEqual({ from: 22, to: 2 });
    expect(hourRange("5-8")).toBeNull();
    expect(hourRange("2026-10")).toBeNull();
  });

  it("finds the fish in those hours", () => {
    const sample = sampleLogbook(new Date(2026, 9, 15));
    const at = (id: string, hour: number) => ({ ...sample.catches[0]!, id, caughtAt: new Date(2026, 9, 3, hour, 30).toISOString() });
    const book = { ...sample, catches: [at("a", 5), at("b", 7), at("c", 8), at("d", 23)] };
    expect(findCatches(book, "5-8am", t).map((entry) => entry.id).sort()).toEqual(["a", "b"]);
    expect(findCatches(book, "22:00-2:00", t).map((entry) => entry.id)).toEqual(["d"]);
  });
});
