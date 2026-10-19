import { afterEach, describe, expect, it, vi } from "vitest";
import { personalBests, sampleLogbook, type TackleItem } from "@stillwater/shared";
import { pieceRecords } from "./pieceRecord";

describe("pieceRecords", () => {
  it("counts each lure's outings and every fish logged on it, tools left out", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const trip = book.trips.find((each) => book.catches.some((entry) => entry.tripId === each.id))!;
    const lure = book.catches.find((entry) => entry.tripId === trip.id)!.lure;
    const items: TackleItem[] = [
      { id: "a", tripId: trip.id, label: `${lure}s`, packed: true },
      { id: "b", tripId: trip.id, label: "Pliers", packed: true },
      { id: "c", tripId: trip.id, label: "Never-used spoon", packed: false },
    ];
    const records = pieceRecords(book, items, "2026-12-31");
    const fish = book.catches.filter((entry) => entry.lure.toLowerCase() === lure.toLowerCase()).length;
    const newest = book.catches.filter((entry) => entry.lure.toLowerCase() === lure.toLowerCase()).sort((a, b) => b.caughtAt.localeCompare(a.caughtAt))[0]!;
    // Shown as its fish were logged, packed as the list wrote it.
    expect(records[0]).toMatchObject({ label: `${lure}s`, name: lure, outings: 1, fish, lure, lastAt: newest.caughtAt, since: 0 });
    // Its biggest fish: by weight when any was weighed.
    const onLure = book.catches.filter((entry) => entry.lure.toLowerCase() === lure.toLowerCase());
    expect(records[0]!.largest?.entry.id).toBe(fish >= 2 ? personalBests({ spots: [], trips: [], catches: onLure }).heaviest?.id ?? personalBests({ spots: [], trips: [], catches: onLure }).longest?.id : undefined);
    expect(records.map((row) => row.label)).not.toContain("Pliers");
    expect(records.find((row) => row.label === "Never-used spoon")).toMatchObject({ label: "Never-used spoon", name: "Never-used spoon", outings: 1, fish: 0 });
  });

  it("counts today's outing once it has a fish, not while it is still to come", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const own = { ...book.trips[0]!, id: "zq-today", date: "2026-10-15" };
    const items: TackleItem[] = [{ id: "a", tripId: own.id, label: "Jig", packed: true }];
    const planned = { ...book, trips: [...book.trips, own] };
    expect(pieceRecords(planned, items, "2026-10-15")).toEqual([]);
    const fish = { ...book.catches[0]!, id: "zq-fish", tripId: own.id, lure: "Spoon" };
    expect(pieceRecords({ ...planned, catches: [...book.catches, fish] }, items, "2026-10-15")).toMatchObject([{ label: "Jig", name: "Jig", outings: 1, fish: 0 }]);
  });

  it("leaves the game's fish out of a lure's record", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const trip = book.trips[0]!;
    const items: TackleItem[] = [{ id: "a", tripId: trip.id, label: "Game spinner", packed: true }];
    const game = { ...book.catches[0]!, id: "game-1", spotId: "spot-stillwater", tripId: null, lure: "Game spinner" };
    expect(pieceRecords({ ...book, catches: [game, ...book.catches] }, items, "2026-12-31")[0]).toMatchObject({ label: "Game spinner", name: "Game spinner", outings: 1, fish: 0 });
  });

  it("leaves the sample week's bags out once the book has an outing of its own", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const sample = book.trips[0]!;
    const own = { ...sample, id: "zq-own", date: "2026-10-01" };
    const items: TackleItem[] = [
      { id: "a", tripId: sample.id, label: "Spinnerbait", packed: true },
      { id: "b", tripId: own.id, label: "Jig", packed: true },
    ];
    const rows = pieceRecords({ ...book, trips: [...book.trips, own] }, items, "2026-10-15");
    expect(rows.map((row) => row.label)).toEqual(["Jig"]);
  });

  it("counts no sample fish against an outing of the angler's own", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const fished = book.catches.find((entry) => entry.tripId)!;
    const own = { ...book.trips.find((each) => each.id === fished.tripId)!, id: "zq-own", date: "2026-10-15" };
    const items: TackleItem[] = [{ id: "a", tripId: own.id, label: fished.lure, packed: true }];
    expect(pieceRecords({ ...book, trips: [...book.trips, own] }, items, "2026-10-16")[0]).toMatchObject({ label: fished.lure, name: fished.lure, outings: 1, fish: 0 });
  });

  it("keeps the sample's bags while the angler has only played a round, and drops them with a first outing planned", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const sample = book.trips.find((each) => book.catches.some((entry) => entry.tripId === each.id))!;
    const items: TackleItem[] = [{ id: "a", tripId: sample.id, label: book.catches.find((entry) => entry.tripId === sample.id)!.lure, packed: true }];
    const planned = { ...sample, id: "zq-plan", date: "2026-10-24" };
    const game = { ...sample, id: "zq-game", spotId: "spot-stillwater", date: "2026-10-14" };
    expect(pieceRecords({ ...book, trips: [...book.trips, game] }, items, "2026-10-15")).toHaveLength(1);
    // As countedBook takes it: a planned outing of the angler's own already starts their book, so no made-up lure is offered.
    expect(pieceRecords({ ...book, trips: [...book.trips, planned, game] }, items, "2026-10-15")).toEqual([]);
  });

  it("leaves out outings still to come", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const items: TackleItem[] = [{ id: "a", tripId: book.trips[0]!.id, label: "Spoon", packed: true }];
    expect(pieceRecords(book, items, "1999-01-01")).toEqual([]);
  });
});

describe("pieceRecords in the small hours", () => {
  afterEach(() => vi.useRealTimers());

  it("counts last evening's outing still going once it has a fish", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 20, 1, 0));
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12);
    const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const trip = { id: "night", date: ymd(yesterday), spotId: "own", title: "", note: "" };
    const caughtAt = new Date(now.getTime() - 30 * 60_000).toISOString();
    const book = { spots: [], trips: [trip], catches: [{ id: "f", species: "Pike", measure: { kind: "length" as const, inches: 30 }, lure: "Spinner", spotId: "own", tripId: "night", caughtAt, note: "", weather: null }] };
    const records = pieceRecords(book, [{ id: "a", tripId: "night", label: "Spinner", packed: true }], ymd(now));
    expect(records[0]).toMatchObject({ outings: 1, fish: 1 });
  });
});
