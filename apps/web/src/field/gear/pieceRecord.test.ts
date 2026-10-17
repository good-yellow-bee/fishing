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

  it("leaves out outings still to come", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const items: TackleItem[] = [{ id: "a", tripId: book.trips[0]!.id, label: "Spoon", packed: true }];
    expect(pieceRecords(book, items, "1999-01-01")).toEqual([]);
  });
});
