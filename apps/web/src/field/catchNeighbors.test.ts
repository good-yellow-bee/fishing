import { describe, expect, it } from "vitest";
import { catchesNewestFirst, sampleLogbook } from "@stillwater/shared";
import { catchNeighbors, tripNeighbors } from "./catchNeighbors";

describe("catch neighbours", () => {
  const book = sampleLogbook(new Date(2026, 9, 1));
  const rows = catchesNewestFirst(book);

  it("links the newest fish only to an older one", () => {
    expect(catchNeighbors(book, rows[0]!.id)).toEqual({ newer: null, older: rows[1] });
  });

  it("links a middle fish both ways", () => {
    expect(catchNeighbors(book, rows[1]!.id)).toEqual({ newer: rows[0], older: rows[2] });
  });

  it("links the oldest fish only to a newer one", () => {
    const last = rows.length - 1;
    expect(catchNeighbors(book, rows[last]!.id)).toEqual({ newer: rows[last - 1], older: null });
  });

  it("finds nothing for a missing fish", () => {
    expect(catchNeighbors(book, "gone")).toEqual({ newer: null, older: null });
  });
});

describe("trip neighbours", () => {
  const book = sampleLogbook(new Date(2026, 9, 1));
  const rows = [...book.trips].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));

  it("orders outings by date, newest first", () => {
    expect(tripNeighbors(book, rows[0]!.id)).toEqual({ newer: null, older: rows[1] ?? null });
    const last = rows.length - 1;
    expect(tripNeighbors(book, rows[last]!.id)).toEqual({ newer: rows[last - 1] ?? null, older: null });
  });

  it("finds nothing for a missing outing", () => {
    expect(tripNeighbors(book, "gone")).toEqual({ newer: null, older: null });
  });
});

describe("outing neighbours and game days", () => {
  const trip = (id: string, date: string, spotId = "spot-cedar") => ({ id, date, spotId, title: id, note: "" });
  const book = { spots: [], catches: [], trips: [trip("a", "2026-10-01"), trip("play", "2026-10-02", "spot-stillwater"), trip("b", "2026-10-03")] };

  it("steps over game days from a real outing, and among game days from one", () => {
    expect(tripNeighbors(book, "a").newer?.id).toBe("b");
    expect(tripNeighbors(book, "play")).toEqual({ newer: null, older: null });
  });
});

describe("catch neighbours and game fish", () => {
  const base = sampleLogbook(new Date(2026, 9, 1)).catches[0]!;
  const fish = (id: string, day: number, spotId = "spot-cedar") => ({ ...base, id, spotId, caughtAt: new Date(2026, 9, day, 9).toISOString() });
  const book = { spots: [], trips: [], catches: [fish("a", 1), fish("g", 2, "spot-stillwater"), fish("b", 3)] };

  it("steps over game fish from a real one", () => {
    expect(catchNeighbors(book, "a").newer?.id).toBe("b");
    expect(catchNeighbors(book, "g")).toEqual({ newer: null, older: null });
  });
});
