import { describe, expect, it } from "vitest";
import type { CatchEntry } from "@stillwater/shared";
import { bookLureName } from "./pieceTally";
import { spotSummary } from "./summaries";

const fish = (id: string, lure: string): CatchEntry => ({ id, species: "Perch", measure: { kind: "length", inches: 9 }, lure, spotId: "a", tripId: null, caughtAt: "2026-08-20T08:00:00.000Z", note: "", weather: null });

describe("round 111 ideas: lures named as the book writes them", () => {
  it("by the spelling most of the book's fish carry", () => {
    const catches = [fish("1", "Spinner"), fish("2", "Spinner"), fish("3", "spinner")];
    expect(bookLureName(catches)("spinner ")).toBe("Spinner");
  });
});

describe("round 111 ideas: a water's copied summary", () => {
  it("says the next outing and the fish lost or missed, lures named as the book has them", () => {
    const spot = { id: "a", name: "Pine Pond", waterType: "pond" as const, notes: "", bestConditions: "" };
    const text = spotSummary(spot, 2, [fish("1", "spinner"), fish("2", "spinner")], null, null, null, { hooks: "Lost 2 · missed 3", next: "Next outing here: Sat", lureName: () => "Spinner" });
    expect(text).toContain("Next outing here: Sat");
    expect(text).toContain("Lost 2 · missed 3");
    expect(text).toContain("Spinner (2)");
  });
});
