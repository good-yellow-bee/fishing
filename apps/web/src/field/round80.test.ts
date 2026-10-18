import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { t } from "../i18n";
import { findCatches, splitLeftOut } from "./CatchSearch";
import { catchList, largestList } from "./catchList";
import { dateWords } from "./dateWords";
import { exactTerm } from "./findLinks";
import { largestFirst } from "./largestFirst";
import { monthOfYearTally } from "./MonthBars";
import { bookFishDay } from "./tripMonths";

const fish = (id: string, caughtAt: Date, extra: Partial<CatchEntry> = {}) =>
  ({ id, species: "Zander", lure: "Jig", spotId: "home", tripId: null, caughtAt: caughtAt.toISOString(), measure: { kind: "length", inches: 20 }, note: "", ...extra }) as unknown as CatchEntry;

const nye = { id: "nye", date: "2025-12-31", spotId: "home", title: "", note: "" };
const book = {
  spots: [{ id: "home", name: "Home", waterType: "lake", notes: "" }, { id: "spot-stillwater", name: "Stillwater", waterType: "lake", notes: "" }],
  trips: [nye],
  catches: [
    fish("late", new Date(2025, 11, 31, 22), { tripId: "nye" }),
    fish("night1", new Date(2026, 0, 1, 0, 40), { tripId: "nye", measure: { kind: "length", inches: 30 } }),
    fish("night2", new Date(2026, 0, 1, 1, 10), { tripId: "nye" }),
    fish("may", new Date(2025, 4, 10, 9)),
    fish("june", new Date(2025, 5, 1, 9), { species: "Northern pike" }),
    fish("lake", new Date(2025, 5, 2, 9), { spotId: "spot-stillwater", species: "Northern pike" }),
  ],
} as unknown as Logbook;
const ids = (needle: string) => findCatches(book, needle, t).map((entry) => entry.id).sort();

describe("round 80: a night fish's month is its outing's", () => {
  it("finds New Year's Eve's small-hours fish under December, not January", () => {
    expect(ids("January")).toEqual([]);
    expect(ids("December")).toEqual(["late", "night1", "night2"]);
    expect(ids(exactTerm("month", "December"))).toEqual(["late", "night1", "night2"]);
  });

  it("counts the bars by the outing's day too", () => {
    const zander = book.catches.filter((entry) => entry.species === "Zander");
    const rows = monthOfYearTally(zander, (entry) => bookFishDay(book, entry).slice(0, 7));
    expect(rows[11]!.count).toBe(3);
    expect(rows[0]!.count).toBe(0);
  });

  it("never reads a year typed alone as a month", () => {
    expect(ids("2026")).toEqual([]);
  });
});

describe("round 80: largest first on a species or water page keeps its list", () => {
  it("steps largest first and leads back to the page in that order", () => {
    const list = catchList(book, "species-largest:Zander", "night1", t, () => false);
    expect(list?.rows.map((entry) => entry.id)).toEqual(largestFirst(list!.rows).map((entry) => entry.id));
    expect(list?.rows[0]!.id).toBe("night1");
    expect(list?.back).toMatch(/\?order=largest$/);
    expect(largestList("species-largest:Zander")).toBe(true);
    expect(catchList(book, "water-largest:home", "may", t, () => false)?.back).toBe("/spots/home?order=largest");
  });
});

describe("round 80: dates with a year, as cards write them, and in numbers", () => {
  const now = new Date(2026, 9, 18, 10);
  const day = (text: string) => dateWords(text, now)?.from ?? null;

  it("reads each as that one day", () => {
    expect(day("Wed, Dec 31, 2025")).toBe("2025-12-31");
    expect(day("śr., 31 gru 2025")).toBe("2025-12-31");
    expect(day("1 czerwca 2025")).toBe("2025-06-01");
    expect(day("Jun 1 2025")).toBe("2025-06-01");
    expect(day("31.12.2025")).toBe("2025-12-31");
    expect(day("12/31/2025")).toBe("2025-12-31");
    expect(day("31/12")).toBe("2025-12-31");
    expect(day("3.5")).toBeNull();
  });

  it("finds the fish of that day", () => {
    expect(ids("Jun 1 2025")).toEqual(["june"]);
    expect(ids("pike Jun 1 2025")).toEqual(["june"]);
  });
});

describe("round 80: leaving out a year, and the game's fish", () => {
  it("drops a year but keeps a temperature", () => {
    expect(splitLeftOut(["pike -2025"])).toEqual({ keep: ["pike"], drop: ["2025"] });
    expect(splitLeftOut(["pike -2025-06"])).toEqual({ keep: ["pike"], drop: ["2025-06"] });
    expect(splitLeftOut(["-5°C"]).keep).toEqual(["-5°C"]);
  });

  it("knows the game's fish by game or gra", () => {
    expect(ids("gra")).toEqual(["lake"]);
    expect(ids("pike -game")).toEqual(["june"]);
  });
});

describe("round 80: the rename box under a search stays in the page", () => {
  const search = readFileSync(`${import.meta.dirname}/search.css`, "utf8");
  const field = readFileSync(`${import.meta.dirname}/field.css`, "utf8");

  it("gives the search one shrinkable column and keeps its label style to its own label", () => {
    expect(search).toMatch(/\.catch-search \{[^}]*grid-template-columns: minmax\(0, 1fr\);/);
    expect(search).toMatch(/\.catch-search > label \{/);
    expect(field).toMatch(/\.rename-kind-form label \{[^}]*overflow-wrap: anywhere;/);
  });
});
