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
