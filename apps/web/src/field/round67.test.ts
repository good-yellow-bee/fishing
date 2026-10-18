import { describe, expect, it } from "vitest";
import { sampleLogbook, type CatchEntry, type Logbook, type TackleItem, type Trip } from "@stillwater/shared";
import { pieceRecords } from "./gear/pieceRecord";
import { spotsByLastFish } from "./spotOrder";
import { packingTips } from "./waterTips";

const local = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min).toISOString();
const ownLake = { id: "own-lake", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" } as Logbook["spots"][number];
const trip = (id: string, date: string, spotId = "own-lake"): Trip => ({ id, date, spotId, title: id, note: "" });
const fish = (id: string, caughtAt: string, tripId: string | null, lure = "Jig", spotId = "own-lake"): CatchEntry => ({
  id,
  species: "Zander",
  measure: { kind: "length", inches: 20 },
  lure,
  spotId,
  tripId,
  caughtAt,
  note: "",
  weather: null,
});
const packed = (tripId: string, label = "Jig"): TackleItem => ({ id: `${tripId}-${label}`, tripId, label, packed: true });

describe("round 67: a night session's fish in the lure record and on the map", () => {
  // A night outing on the 10th with a fish at 22:00 and one at 00:30, then two dry outings with the same jig.
  const book: Logbook = {
    spots: [ownLake],
    trips: [trip("night", "2026-10-10"), trip("next", "2026-10-11"), trip("after", "2026-10-13")],
    catches: [fish("a", local(2026, 10, 10, 22), "night"), fish("b", local(2026, 10, 11, 0, 30), "night")],
  };
  const items = [packed("night"), packed("next"), packed("after")];

  it("dates the lure's last fish by its outing, so the next day's outing counts as one since", () => {
    const [jig] = pieceRecords(book, items, "2026-10-18");
    expect(jig).toMatchObject({ fish: 2, outings: 3, lastDay: "2026-10-10", since: 2 });
  });

  it("counts today's outing as one since once it has a fish", () => {
    const today = { ...book, trips: [...book.trips, trip("today", "2026-10-18")], catches: [...book.catches, fish("c", local(2026, 10, 18, 9), "today", "Spoon")] };
    const [jig] = pieceRecords(today, [...items, packed("today")], "2026-10-18").filter((row) => row.label === "Jig");
    expect(jig?.since).toBe(3);
  });

  it("gives a water's last fish day by its outing", () => {
    expect(spotsByLastFish(book)[0]).toMatchObject({ lastFishAt: book.catches[1]!.caughtAt, lastFishDay: "2026-10-10" });
  });
});

describe("round 67: packing tips", () => {
  it("draws an own outing's tips from the angler's own fish, not the sample week's", () => {
    const sample = sampleLogbook(new Date(2026, 9, 15));
    const water = sample.catches[0]!.spotId;
    const book: Logbook = {
      ...sample,
      trips: [...sample.trips, trip("mine", "2026-10-19", water)],
      catches: [...sample.catches, fish("own-1", local(2026, 10, 12, 8), null, "Wobbler", water), fish("own-2", local(2026, 10, 13, 8), null, "Wobbler", water), fish("own-3", local(2026, 10, 14, 8), null, "Wobbler", water)],
    };
    const tips = packingTips(book, book.trips.at(-1)!, "2026-10-18");
    expect(tips.every((lure) => lure === "Wobbler")).toBe(true);
  });
});
