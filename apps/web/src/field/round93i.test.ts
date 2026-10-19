import { describe, expect, it } from "vitest";
import type { Spot } from "@stillwater/shared";
import { spotSummary } from "./summaries";

describe("round 93 ideas: a water's copied summary says where it is", () => {
  const spot = { id: "own", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" } as Spot;

  it("adds the place and a map link under the name, for a water with a place", () => {
    const lines = spotSummary({ ...spot, place: { lat: 53.8, lng: 21.6 } }, 2, [], null, null).split("\n");
    expect(lines[1]).toContain("https://www.openstreetmap.org/?mlat=53.8&mlon=21.6");
    expect(lines[1]).toMatch(/^53\.8/);
    expect(spotSummary(spot, 2, [], null, null)).not.toContain("openstreetmap");
  });
});
