import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { HOOT_BOB_SEC, LOOK_SEC, OWL_TREE, hootBob, owlHead, owlOut } from "./owlMotion";

describe("owl", () => {
  it("sits out after dark outside winter", () => {
    expect(owlOut("night", "summer")).toBe(true);
    expect(owlOut("night", "fall")).toBe(true);
    expect(owlOut("night", "winter")).toBe(false);
    expect(owlOut("dusk", "summer")).toBe(false);
  });

  it("perches on the bank, not in the lake", () => {
    expect(inLake(OWL_TREE.x, OWL_TREE.z)).toBe(false);
  });

  it("turns its head now and then and holds each look", () => {
    const looks = new Set(Array.from({ length: 30 }, (_, k) => owlHead(k * LOOK_SEC + LOOK_SEC / 2).toFixed(2)));
    expect(looks.size).toBeGreaterThan(2);
    expect(owlHead(LOOK_SEC * 3 + 1)).toBe(owlHead(LOOK_SEC * 3 + 3));
    for (let t = 0; t < 120; t += 0.1) expect(Math.abs(owlHead(t))).toBeLessThanOrEqual(1.5);
    expect(owlHead(37, true)).toBe(0);
  });

  it("bows with a hoot and is still otherwise", () => {
    expect(hootBob(HOOT_BOB_SEC / 4)).toBeGreaterThan(0);
    expect(hootBob(-1)).toBe(0);
    expect(hootBob(HOOT_BOB_SEC + 0.1)).toBe(0);
  });
});
