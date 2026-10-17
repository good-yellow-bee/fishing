import { describe, expect, it } from "vitest";
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
    expect(records[0]).toMatchObject({ label: `${lure}s`, outings: 1, fish, lure, lastAt: newest.caughtAt, since: 0 });
    // Its biggest fish: by weight when any was weighed.
    const onLure = book.catches.filter((entry) => entry.lure.toLowerCase() === lure.toLowerCase());
    expect(records[0]!.largest?.entry.id).toBe(fish >= 2 ? personalBests({ spots: [], trips: [], catches: onLure }).heaviest?.id ?? personalBests({ spots: [], trips: [], catches: onLure }).longest?.id : undefined);
    expect(records.map((row) => row.label)).not.toContain("Pliers");
    expect(records.find((row) => row.label === "Never-used spoon")).toEqual({ label: "Never-used spoon", outings: 1, fish: 0 });
  });

  it("leaves the game's fish out of a lure's record", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const trip = book.trips[0]!;
    const items: TackleItem[] = [{ id: "a", tripId: trip.id, label: "Game spinner", packed: true }];
    const game = { ...book.catches[0]!, id: "game-1", spotId: "spot-stillwater", tripId: null, lure: "Game spinner" };
    expect(pieceRecords({ ...book, catches: [game, ...book.catches] }, items, "2026-12-31")[0]).toEqual({ label: "Game spinner", outings: 1, fish: 0 });
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

  it("keeps the sample's bags while the angler has only planned an outing or played a round", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const sample = book.trips.find((each) => book.catches.some((entry) => entry.tripId === each.id))!;
    const items: TackleItem[] = [{ id: "a", tripId: sample.id, label: book.catches.find((entry) => entry.tripId === sample.id)!.lure, packed: true }];
    const planned = { ...sample, id: "zq-plan", date: "2026-10-24" };
    const game = { ...sample, id: "zq-game", spotId: "spot-stillwater", date: "2026-10-14" };
    expect(pieceRecords({ ...book, trips: [...book.trips, planned, game] }, items, "2026-10-15")).toHaveLength(1);
  });

  it("leaves out outings still to come", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const items: TackleItem[] = [{ id: "a", tripId: book.trips[0]!.id, label: "Spoon", packed: true }];
    expect(pieceRecords(book, items, "1999-01-01")).toEqual([]);
  });
});
