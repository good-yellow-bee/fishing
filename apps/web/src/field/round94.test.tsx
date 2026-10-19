import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { parseTripDraft, sampleLogbook, type CatchEntry, type Logbook, type Trip } from "@stillwater/shared";
import { setLang, t } from "../i18n";
import { isSamplePlan } from "./bookCopy";
import { tripNeighbors } from "./catchNeighbors";
import { dateWords } from "./dateWords";
import { outingFish } from "./outingFish";
import { pieceTally } from "./pieceTally";
import { tripSummary } from "./summaries";
import { outingDay } from "./tripDates";
import { TripMonthHead } from "./TripMonthHead";
import { findTrips } from "./tripSearch";

const trip = (id: string, date: string, spotId = "own-lake", title = ""): Trip => ({ id, date, spotId, title, note: "" }) as Trip;
const fish = (id: string, caughtAt: string, over: Partial<CatchEntry> = {}): CatchEntry => ({
  id,
  species: "Zander",
  measure: { kind: "length", inches: 20 },
  lure: "Jig",
  spotId: "own-lake",
  tripId: null,
  caughtAt,
  note: "",
  weather: null,
  ...over,
});

afterEach(() => setLang("en"));

describe("round 94: an evening outing is still going in the small hours", () => {
  it("dates the day still being fished by its evening until four", () => {
    expect(outingDay("2026-10-20", new Date(2026, 9, 20, 0, 30))).toBe("2026-10-19");
    expect(outingDay("2026-10-20", new Date(2026, 9, 20, 4, 0))).toBe("2026-10-20");
    // Any other day is taken as given.
    expect(outingDay("2026-10-25", new Date(2026, 9, 20, 0, 30))).toBe("2026-10-25");
  });
});

describe("round 94: Find an outing reads a weekday both ways, with the form's own words", () => {
  const now = new Date(2026, 9, 19, 10);
  const book: Logbook = {
    spots: [{ id: "own-lake", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" }] as Logbook["spots"],
    trips: [trip("hard", "2026-10-17", "own-lake", "Hard day"), trip("next", "2026-10-24", "own-lake", "Plan"), trip("wed", "2026-10-14", "own-lake", "Wednesday window")],
    catches: [],
  };
  const find = (typed: string) => findTrips(book, typed, () => 0, "2026-10-19", t, now).map((each) => each.id).sort();

  it("finds the Saturday just gone and the one coming", () => {
    expect(find("saturday")).toEqual(["hard", "next"]);
    expect(find("on saturday")).toEqual(["hard", "next"]);
    expect(find("last saturday")).toEqual(["hard"]);
    expect(find("next saturday")).toEqual(["next"]);
    setLang("pl");
    expect(find("w sobotę")).toEqual(["hard", "next"]);
    expect(find("w zeszłą sobotę")).toEqual(["hard"]);
    expect(find("za tydzień w sobotę")).toEqual(["next"]);
  });

  it("reads last night as the evening before", () => {
    expect(dateWords("last night", now)).toEqual({ from: "2026-10-18", to: "2026-10-18" });
    expect(dateWords("wczoraj wieczorem", now)).toEqual({ from: "2026-10-18", to: "2026-10-18" });
  });
});

describe("round 94: the sample week's plans stay made up once their day has passed", () => {
  const sample = sampleLogbook(new Date(2026, 9, 19));
  const book: Logbook = { ...sample, spots: [...sample.spots, { id: "own-lake", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" } as Logbook["spots"][number]], trips: [...sample.trips, trip("mine", "2026-10-20")] };

  it("hides them from the steps and the search a week on", () => {
    const dawn = book.trips.find((each) => each.id === "trip-dawn")!;
    expect(isSamplePlan(book, dawn)).toBe(true);
    expect(isSamplePlan(book, book.trips.find((each) => each.id === "trip-mill")!)).toBe(false);
    expect(isSamplePlan(sample, dawn)).toBe(false);
    const ids = (typed: string) => findTrips(book, typed, (id) => book.catches.filter((entry) => entry.tripId === id).length, "2026-10-26", t, new Date(2026, 9, 26, 10)).map((each) => each.id);
    expect(ids("dawn patrol")).toEqual([]);
    const steps = tripNeighbors(book, "mine", "2026-10-26");
    expect(steps.older?.id).toBe("trip-mill");
  });
});

describe("round 94: one lure written two ways is one on an outing", () => {
  it("as the chips and the plan count it", () => {
    const catches = [fish("a", "2026-10-10T08:00"), fish("b", "2026-10-10T09:00", { lure: "Spinnerbait" }), fish("c", "2026-10-10T10:00", { lure: "Spinnerbaits" })];
    expect(pieceTally(catches, Infinity)).toEqual([
      { lure: "Spinnerbait", count: 2 },
      { lure: "Jig", count: 1 },
    ]);
  });
});

describe("round 94: fish logged without their outing count for it", () => {
  it("on the day and water of the outing", () => {
    const book: Logbook = {
      spots: [],
      trips: [trip("o", "2026-10-10")],
      catches: [fish("a", new Date(2026, 9, 10, 8).toISOString(), { tripId: "o" }), fish("b", new Date(2026, 9, 10, 9).toISOString()), fish("c", new Date(2026, 9, 11, 9).toISOString())],
    };
    expect(outingFish(book)("o")).toBe(2);
  });
});

describe("round 94: wording", () => {
  it("says a month of only the game's rounds as the game's", () => {
    const html = renderToStaticMarkup(<TripMonthHead month="2026-10" trips={[trip("g", "2026-10-06", "spot-stillwater")]} fishOn={() => 3} counted={() => false} />);
    expect(html).toContain("October 2026 · 1 from the game");
    setLang("pl");
    expect(renderToStaticMarkup(<TripMonthHead month="2026-10" trips={[trip("a", "2026-10-01"), trip("s", "2026-10-02", "spot-mill")]} fishOn={() => 0} counted={(each) => each.id === "a"} />)).toContain("+1 z przykładowego tygodnia");
  });

  it("counts no fish as 0 among other counts", () => {
    const html = renderToStaticMarkup(<TripMonthHead month="2020-10" trips={[trip("a", "2020-10-01"), trip("b", "2020-10-02")]} fishOn={() => 0} />);
    expect(html).toContain("October 2020 · 2 outings · 0 fish");
  });

  it("asks to check the year of a slip of the keys", () => {
    const book: Logbook = { spots: [{ id: "own-lake", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" }] as Logbook["spots"], trips: [], catches: [] };
    const parsed = parseTripDraft({ date: "0202-10-10", spotId: "own-lake", title: "", note: "" }, book);
    expect(parsed.ok ? null : parsed.message).toBe("Check the year.");
  });

  it("dates a night's fish past New Year with its year in the copy", () => {
    const text = tripSummary(trip("n", "2026-12-31"), "Own Lake", [fish("a", new Date(2026, 11, 31, 22, 10).toISOString()), fish("b", new Date(2027, 0, 1, 0, 40).toISOString())]);
    expect(text).toMatch(/2027, /);
  });
});
