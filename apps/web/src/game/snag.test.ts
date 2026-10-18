import { describe, expect, it } from "vitest";
import { REEDS_STAND } from "./scene/bankWalk";
import { inLake, LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge, POINT_PAD } from "@stillwater/shared";
import { castSnags, inWeeds, onRocks, onShoreIce, ROCK_DEPTH, ROCK_SNAG_ODDS, SNAG_ODDS } from "./snag";
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
    expect(castSnags("reeds", x, z, false, SNAG_ODDS - 0.01)).toBe("weed");
    expect(castSnags("reeds", x, z, false, SNAG_ODDS + 0.01)).toBeNull();
    expect(castSnags("reeds", x, z, true, 0)).toBeNull();
  });

  it("let a topwater lure ride over the weed, while any other lure still fouls there", () => {
    const { x, z } = REEDS_STAND;
    expect(castSnags("reeds", x, z, false, 0, "Topwater frog")).toBeNull();
    expect(castSnags("reeds", x, z, false, 0, "Shallow crankbait")).toBe("weed");
    expect(castSnags("reeds", x, z, false, 0, "Nightcrawler")).toBe("weed");
  });

  it("lie on the point's rocks in its shallows, less often than the weed, never on a mercy cast", () => {
    // Walk out from the point's pad until the water is shallow but no longer dry land.
    let shallow: { x: number; z: number } | null = null;
    for (let step = 0; step < 200 && !shallow; step += 1)
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const x = POINT_PAD.x + dx * step * 0.1;
        const z = POINT_PAD.z + dz * step * 0.1;
        const depth = waterDepth(x, z);
        if (depth > 0.05 && depth <= ROCK_DEPTH && onRocks("point", x, z)) shallow = { x, z };
      }
    expect(shallow).not.toBeNull();
    const { x, z } = shallow!;
    expect(onRocks("reeds", x, z)).toBe(false);
    expect(ROCK_SNAG_ODDS).toBeLessThan(SNAG_ODDS);
    expect(castSnags("point", x, z, false, ROCK_SNAG_ODDS - 0.01)).toBe("rocks");
    expect(castSnags("point", x, z, false, ROCK_SNAG_ODDS + 0.01)).toBeNull();
    expect(castSnags("point", x, z, true, 0)).toBeNull();
    // A crankbait's lip bumps it off the rocks; a topwater lure still hangs up on them.
    expect(castSnags("point", x, z, false, 0, "Shallow crankbait")).toBeNull();
    expect(castSnags("point", x, z, false, 0, "Topwater frog")).toBe("rocks");
  });
});

describe("shore ice", () => {
  it("rims the lake's water just inside the shore in winter only", () => {
    const east = { x: LAKE_RX * lakeEdge(0) * 0.95, z: LAKE_CENTER_Z };
    const south = { x: 0, z: LAKE_CENTER_Z + LAKE_RZ * lakeEdge(Math.PI / 2) * 0.95 };
    for (const near of [east, south]) {
      expect(inLake(near.x, near.z)).toBe(true);
      expect(onShoreIce("winter", near.x, near.z)).toBe(true);
      expect(onShoreIce("fall", near.x, near.z)).toBe(false);
    }
    expect(onShoreIce(undefined, east.x, east.z)).toBe(false);
    expect(onShoreIce("winter", LAKE_RX * 0.8, LAKE_CENTER_Z)).toBe(false);
    expect(onShoreIce("winter", 0, LAKE_CENTER_Z)).toBe(false);
  });
});
