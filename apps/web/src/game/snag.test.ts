import { describe, expect, it } from "vitest";
import { REEDS_STAND } from "./scene/bankWalk";
import { castSnags, inWeeds, SNAG_ODDS } from "./snag";
import { waterDepth } from "./scene/water";

describe("snags", () => {
  it("grow only in the reeds' shallow water", () => {
    // Step out from the reeds stand until the water is past the weed.
    const shallow = { x: REEDS_STAND.x, z: REEDS_STAND.z };
    expect(waterDepth(shallow.x, shallow.z)).toBeLessThan(0.45);
    expect(inWeeds("reeds", shallow.x, shallow.z)).toBe(true);
    expect(inWeeds("dock", shallow.x, shallow.z)).toBe(false);
  });

  it("catch some casts in the weed, never a new angler's mercy cast", () => {
    const { x, z } = REEDS_STAND;
    expect(castSnags("reeds", x, z, false, SNAG_ODDS - 0.01)).toBe(true);
    expect(castSnags("reeds", x, z, false, SNAG_ODDS + 0.01)).toBe(false);
    expect(castSnags("reeds", x, z, true, 0)).toBe(false);
  });
});
