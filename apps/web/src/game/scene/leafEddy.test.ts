import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, inLake } from "@stillwater/shared";
import { EVENT_SEC, WHIRL_EVERY_SEC, WHIRL_LEAVES, WHIRL_SEC, WHIRL_TALL, leafWhirl, leafWhirlOut, whirlLeaf } from "./leafEddy";

/** The start of the next whirl after `from`. */
const nextWhirl = (from: number) => {
  for (let t = from; t < from + WHIRL_EVERY_SEC + 1; t += 0.05) if (leafWhirl(t) && !leafWhirl(t - 0.05)) return t - 0.05;
  throw new Error("no whirl");
};

describe("leaf whirl", () => {
  it("springs up on dry fall days", () => {
    expect(leafWhirlOut("day", "clear", "fall")).toBe(true);
    expect(leafWhirlOut("day", "overcast", "fall")).toBe(true);
    expect(leafWhirlOut("day", "rain", "fall")).toBe(false);
    expect(leafWhirlOut("dusk", "clear", "fall")).toBe(false);
    expect(leafWhirlOut("day", "clear", "summer")).toBe(false);
  });

  it("starts on the far bank and wanders out over the water", () => {
    for (let n = 0; n < 4; n++) {
      const start = nextWhirl(n * WHIRL_EVERY_SEC);
      const first = leafWhirl(start + 0.1)!;
      const last = leafWhirl(start + WHIRL_SEC - 0.1)!;
      expect(first.z).toBeLessThan(LAKE_CENTER_Z - 5);
      expect(inLake(first.x, first.z)).toBe(false);
      expect(inLake(last.x, last.z)).toBe(true);
      expect(first.strength).toBeLessThan(0.2);
      expect(leafWhirl(start + WHIRL_SEC / 2)!.strength).toBeCloseTo(1);
      expect(leafWhirl(start + WHIRL_SEC + 0.1)).toBeNull();
    }
    expect(leafWhirl(30, true)).toBeNull();
  });

  it("spins its leaves up the column, then drops them onto the lake to float and sink", () => {
    const start = nextWhirl(0);
    const mid = start + WHIRL_SEC / 2;
    const foot = leafWhirl(mid)!;
    let highest = 0;
    for (let i = 0; i < WHIRL_LEAVES; i++) {
      const leaf = whirlLeaf(i, mid)!;
      expect(leaf).not.toBeNull();
      expect(Math.hypot(leaf.x - foot.x, leaf.z - foot.z)).toBeLessThan(1.4);
      expect(leaf.height).toBeLessThanOrEqual(WHIRL_TALL);
      highest = Math.max(highest, leaf.height);
    }
    expect(highest).toBeGreaterThan(1.6);
    for (let i = 0; i < WHIRL_LEAVES; i++) {
      const leaf = whirlLeaf(i, start + EVENT_SEC - 2)!;
      expect(leaf.afloat).toBe(true);
      expect(inLake(leaf.x, leaf.z)).toBe(true);
    }
    expect(whirlLeaf(0, start + EVENT_SEC + 0.1)).toBeNull();
    expect(whirlLeaf(0, mid, true)).toBeNull();
  });

  it("moves each leaf smoothly from the spin to the fall to the water", () => {
    const start = nextWhirl(0);
    for (let i = 0; i < WHIRL_LEAVES; i++) {
      let last: ReturnType<typeof whirlLeaf> = null;
      for (let t = start; t < start + EVENT_SEC; t += 1 / 30) {
        const leaf = whirlLeaf(i, t);
        if (leaf && last) {
          expect(Math.hypot(leaf.x - last.x, leaf.z - last.z, leaf.height - last.height)).toBeLessThan(0.45);
        }
        last = leaf;
      }
    }
  });
});
