import { afterEach, describe, expect, it } from "vitest";
import { sampleLogbook, type CatchEntry, type Logbook, type TackleItem, type Trip } from "@stillwater/shared";
import { reloadLang, setLang, t } from "../i18n";
import { outingFish } from "./outingFish";
import { isPlanned } from "./TripMonthHead";
import { tripSummary } from "./summaries";
import { pieceTally } from "./pieceTally";
import { packingText } from "./gear/packingText";

afterEach(() => {
  setLang("en");
  reloadLang();
});

const sample = sampleLogbook(new Date(2026, 9, 1));
const base = sample.catches[0]!;
const fish = (id: string, at: Date, tripId: string | null, spotId = "own", lure = "spoon", species = "Northern pike"): CatchEntry => ({
  ...base,
  id,
  caughtAt: at.toISOString(),
  species,
  lure,
  tripId,
  spotId,
});
const trip = (id: string, date: string, spotId = "own", more: Partial<Trip> = {}): Trip => ({ id, date, spotId, title: id, note: "", ...more });
const book: Logbook = {
  ...sample,
  spots: [
    { ...sample.spots[0]!, id: "own", name: "Own Lake" },
    { ...sample.spots[0]!, id: "east", name: "East Pond" },
  ],
  trips: [trip("dawn", "2026-10-15"), trip("dusk", "2026-10-15"), trip("solo", "2026-10-10"), trip("moved", "2026-10-08", "east")],
  catches: [
    fish("a", new Date(2026, 9, 15, 6), "dawn"),
    // Logged loose on a day the water had two outings: neither's until filed.
    fish("b", new Date(2026, 9, 15, 19), null),
    fish("c", new Date(2026, 9, 10, 8), "solo"),
    fish("d", new Date(2026, 9, 10, 9), null),
    // The East Pond outing's fish, logged on Own Lake.
    fish("e", new Date(2026, 9, 8, 9), "moved"),
  ],
};

describe("round 100: a loose fish on a water fished twice that day", () => {
  it("counts on neither outing, and on the day's one outing otherwise", () => {
    const fishOn = outingFish(book);
    expect(fishOn("dawn")).toBe(1);
    expect(fishOn("dusk")).toBe(0);
    expect(fishOn("solo")).toBe(2);
  });

  it("on its water, an outing counts only the fish taken there", () => {
    expect(outingFish(book)("moved")).toBe(1);
    expect(outingFish(book, true)("moved")).toBe(0);
    expect(outingFish(book, true)("solo")).toBe(2);
  });
});

describe("round 100: today's outing with a fish lost is under way, not planned", () => {
  it("stays planned ahead, and before its day", () => {
    expect(isPlanned(trip("t", "2026-10-19", "own", { lost: 1 }), "2026-10-19", 0)).toBe(false);
    expect(isPlanned(trip("t", "2026-10-19", "own", { missed: 2 }), "2026-10-19", 0)).toBe(false);
    expect(isPlanned(trip("t", "2026-10-19"), "2026-10-19", 0)).toBe(true);
    expect(isPlanned(trip("t", "2026-10-24", "own", { lost: 1 }), "2026-10-19", 0)).toBe(true);
  });
});

describe("round 100: names as the pages write them, and counts inside a line", () => {
  it("copies a blank day with lost fish as 0 fish", () => {
    const text = tripSummary(trip("hd", "2026-10-16", "east", { title: "Hard day", lost: 2, missed: 3 }), "East Pond", []);
    expect(text.split("\n")[1]).toBe("0 fish");
    expect(tripSummary(trip("hd", "2026-10-16", "east", { title: "Hard day" }), "East Pond", []).split("\n")[1]).toBe("Nothing logged");
  });

  it("writes a tie of lure spellings with its capital", () => {
    expect(pieceTally([fish("x", new Date(), null, "own", "jig"), fish("y", new Date(), null, "own", "Jig")], 1)[0]!.lure).toBe("Jig");
  });

  it("reads a lure and a kind typed in lower case in Polish", () => {
    setLang("pl");
    const rows = [{ label: "spoon", packed: false }] as TackleItem[];
    expect(packingText("Plan", rows)).toBe("Plan\n[ ] Wahadłówka");
    const summary = tripSummary(trip("tr", "2026-10-04"), "Own Lake", [fish("z", new Date(2026, 9, 4, 18), "tr", "own", "spoons", "northern pike")]);
    expect(summary).toContain("Szczupak");
    expect(summary).toContain("Wahadłówka");
    expect(t("No fish logged yet tonight.")).toBe("Tej nocy jeszcze nic nie zapisano.");
  });
});
