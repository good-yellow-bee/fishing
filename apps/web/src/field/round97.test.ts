import { afterEach, describe, expect, it, vi } from "vitest";
import { sampleLogbook, type CatchEntry, type Logbook, type TackleItem } from "@stillwater/shared";
import { setLang } from "../i18n";
import { bookSpelling, pieceName, shownPieceKey } from "./gear/pieceKey";
import { pieceRecords } from "./gear/pieceRecord";
import { notYetThisYear } from "./bests/notYet";
import { gpxFor } from "./gpx";

afterEach(() => {
  vi.useRealTimers();
  setLang("en");
});

const sample = sampleLogbook(new Date(2026, 9, 1));
const base = sample.catches[0]!;
const fish = (id: string, at: Date, lure: string, tripId: string | null): CatchEntry => ({ ...base, id, caughtAt: at.toISOString(), lure, tripId, spotId: "own" });

describe("round 97: a lure however it was typed", () => {
  it("reads the same in Polish with a trailing space, another case or a plural", () => {
    setLang("pl");
    expect(shownPieceKey("spoon ")).toBe(shownPieceKey("Spoon"));
    expect(shownPieceKey("Spoons")).toBe(shownPieceKey("Spoon"));
    expect(pieceName("spoon ")).toBe("Wahadłówka");
    expect(bookSpelling("Some odd fly ")).toBe("Some odd fly");
    setLang("en");
    // English keeps the angler's own spelling on the list.
    expect(pieceName("spoons ")).toBe("spoons");
  });

  it("counts every spelling's fish against the packed lure in Polish", () => {
    setLang("pl");
    const book: Logbook = {
      spots: [{ ...sample.spots[0]!, id: "own" }],
      trips: [
        { id: "a", date: "2026-09-12", spotId: "own", title: "A", note: "" },
        { id: "b", date: "2026-10-16", spotId: "own", title: "B", note: "" },
      ],
      catches: [fish("1", new Date(2026, 8, 12, 7), "Spoon", "a"), fish("2", new Date(2026, 9, 16, 7), "spoon ", "b"), fish("3", new Date(2026, 9, 16, 8), "Spoon ", "b")],
    };
    const items: TackleItem[] = [
      { id: "i1", tripId: "a", label: "Spoon", packed: true },
      { id: "i2", tripId: "b", label: "Spoon", packed: true },
    ];
    expect(pieceRecords(book, items, "2026-10-19")[0]).toMatchObject({ outings: 2, fish: 3, since: 0 });
  });

  it("names a lure in Not yet this year only when no spelling of it took a fish this year", () => {
    const quiet = notYetThisYear([fish("1", new Date(2025, 5, 1, 9), "Spinnerbaits", null), fish("2", new Date(2026, 5, 1, 9), "Spinnerbait", null)], new Date(2026, 9, 19), (entry) => entry.lure, undefined, (name) => shownPieceKey(name));
    expect(quiet).toEqual([]);
  });
});

describe("round 97: last evening's outing still going", () => {
  it("is no outing without a fish in the lure record until it is over", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 20, 0, 20));
    const book: Logbook = {
      spots: [{ ...sample.spots[0]!, id: "own" }],
      trips: [
        { id: "a", date: "2026-10-12", spotId: "own", title: "A", note: "" },
        { id: "eve", date: "2026-10-19", spotId: "own", title: "Evening", note: "" },
      ],
      catches: [fish("1", new Date(2026, 9, 12, 7), "Spoon", "a")],
    };
    const items: TackleItem[] = [
      { id: "i1", tripId: "a", label: "Spoon", packed: true },
      { id: "i2", tripId: "eve", label: "Spoon", packed: true },
    ];
    expect(pieceRecords(book, items, "2026-10-20")[0]).toMatchObject({ outings: 1, since: 0 });
    vi.setSystemTime(new Date(2026, 9, 20, 10));
    expect(pieceRecords(book, items, "2026-10-20")[0]).toMatchObject({ outings: 2, since: 1 });
  });
});

describe("round 97: water names", () => {
  it("trims a water's name in the GPX", () => {
    expect(gpxFor([{ ...sample.spots[0]!, name: "Own lake ", place: { lat: 53.8, lng: 21.6 } }])).toContain("<name>Own lake</name>");
  });
});
