import { describe, expect, it } from "vitest";
import type { CatchEntry } from "@stillwater/shared";
import { seasonLast } from "./seasonFirst";

const fish = (id: string, caughtAt: string): CatchEntry => ({
  id,
  species: "Walleye",
  measure: { kind: "length", inches: 18 },
  lure: "Jig",
  spotId: "w",
  tripId: null,
  caughtAt,
  note: "",
  weather: null,
});

describe("round 58 ideas", () => {
  it("finds last year's last fish of a kind", () => {
    const today = new Date(2026, 9, 18);
    const rows = [fish("a", "2025-05-01T10:00:00.000Z"), fish("b", "2025-11-03T10:00:00.000Z"), fish("c", "2026-10-01T10:00:00.000Z"), fish("d", "2024-12-20T10:00:00.000Z")];
    expect(seasonLast(rows, today)?.id).toBe("b");
    expect(seasonLast(rows.slice(2), today)).toBeNull();
  });
});
