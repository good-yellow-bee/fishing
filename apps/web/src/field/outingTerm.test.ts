import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { t } from "../i18n";
import { exactTerm, findCatches } from "./CatchSearch";

describe("the outing exact term", () => {
  const book = sampleLogbook(new Date(2026, 9, 15));

  it("finds one outing's fish, including one landed after midnight, and not a same-day outing's", () => {
    const trip = book.trips.find((row) => book.catches.some((entry) => entry.tripId === row.id))!;
    const [y, m, d] = trip.date.split("-").map(Number) as [number, number, number];
    const late = { ...book.catches[0]!, id: "late", tripId: trip.id, spotId: trip.spotId, caughtAt: new Date(y, m - 1, d + 1, 0, 30).toISOString() };
    const other = { id: "other", date: trip.date, spotId: trip.spotId, title: "Second go", note: "" };
    const elsewhere = { ...book.catches[0]!, id: "elsewhere", tripId: "other", spotId: trip.spotId, caughtAt: new Date(y, m - 1, d, 20).toISOString() };
    const withLate = { ...book, trips: [...book.trips, other], catches: [...book.catches, late, elsewhere] };
    const found = findCatches(withLate, exactTerm("outing", `${trip.date} ${trip.title}`), t).map((entry) => entry.id).sort();
    expect(found).toEqual(withLate.catches.filter((entry) => entry.tripId === trip.id).map((entry) => entry.id).sort());
    expect(found).toContain("late");
  });
});
