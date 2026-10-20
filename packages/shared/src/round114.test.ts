import { describe, expect, it } from "vitest";
import { parseFieldArchive } from "./archive.ts";
import { FIELD_ARCHIVE_KIND, FIELD_ARCHIVE_NEWER, FIELD_ARCHIVE_VERSION } from "./archive.ts";

const file = (book: unknown) => ({ kind: FIELD_ARCHIVE_KIND, version: FIELD_ARCHIVE_VERSION, book, tackle: { items: [] }, photos: {} });
const book = (trip: Record<string, unknown>, weather: unknown) => ({
  spots: [{ id: "a", name: "Pine Pond", waterType: "pond", notes: "", bestConditions: "" }],
  trips: [{ id: "t", spotId: "a", title: "", note: "", ...trip }],
  catches: [{ id: "c", species: "Perch", measure: { kind: "length", inches: 9 }, lure: "Jig", spotId: "a", tripId: "t", caughtAt: "2026-02-20T08:00:00.000Z", note: "", weather }],
});

describe("round 114: a book file read in", () => {
  it("takes a real day and readable weather", () => {
    expect(parseFieldArchive(file(book({ date: "2026-02-20" }, null))).ok).toBe(true);
  });
  it("refuses a day the calendar doesn't have", () => {
    expect(parseFieldArchive(file(book({ date: "2026-02-31" }, null))).ok).toBe(false);
  });

});

describe("round 114: a book file from a newer version", () => {
  it("says so", () => {
    const result = parseFieldArchive({ ...file(book({ date: "2026-02-20" }, null)), version: FIELD_ARCHIVE_VERSION + 1 });
    expect(result.ok ? "" : result.message).toBe(FIELD_ARCHIVE_NEWER);
  });
});
