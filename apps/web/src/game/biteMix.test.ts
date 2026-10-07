import { describe, expect, it } from "vitest";
import type { Profile, SpotId } from "@stillwater/shared";
import { pickBite } from "./logic";

const starter: Profile = {
  userId: "u1",
  displayName: "Ash",
  points: 0,
  lifetimePoints: 0,
  strength: 1,
  accuracy: 1,
  patience: 1,
};

function drawn(spot: SpotId) {
  const ids = new Set<string>();
  for (let i = 0; i < 40; i++) ids.add(pickBite(spot, starter, false, () => i / 40, "day").id);
  return [...ids].sort();
}

describe("bite mix", () => {
  it("draws the point from a different pool than the dock", () => {
    const point = drawn("point");
    const dock = drawn("dock");
    expect(point).toEqual(["bluegill", "brook-trout", "pike"]);
    expect(dock).toEqual(["carp", "catfish", "golden-shiner", "perch", "smallmouth-bass"]);
    expect(point.some((id) => dock.includes(id))).toBe(false);
    expect(pickBite("point", starter, true, () => 0, "day").id).toBe("bluegill");
  });
});
