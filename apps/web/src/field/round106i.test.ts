import { describe, expect, it } from "vitest";
import type { CatchEntry, Trip } from "@stillwater/shared";
import { tripSummary } from "./summaries";

const fish = (id: string): CatchEntry => ({ id, species: "Perch", measure: { kind: "length", inches: 9 }, lure: "Jig", spotId: "own", tripId: "t", caughtAt: "2026-08-20T08:00:00.000Z", note: "", weather: null });

describe("round 106 ideas: a copied outing", () => {
  it("says how many of the fish hooked were landed", () => {
    const trip: Trip = { id: "t", date: "2026-08-20", spotId: "own", title: "Dawn", note: "", lost: 2 };
    expect(tripSummary(trip, "Home Lake", [fish("a"), fish("b"), fish("c")])).toContain("Landed 3 of 5 hooked.");
    expect(tripSummary({ ...trip, lost: undefined }, "Home Lake", [fish("a")])).not.toContain("Landed");
  });
});
