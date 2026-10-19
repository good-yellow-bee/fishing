import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge } from "@stillwater/shared";
import { SHOW_SEC, WATCHERS, eyePair, eyesOut } from "./eyeShine";

function onLand(x: number, z: number) {
  const nx = x / LAKE_RX;
  const nz = (z - LAKE_CENTER_Z) / LAKE_RZ;
  return Math.hypot(nx, nz) > lakeEdge(Math.atan2(-nz, nx)) + 0.02;
}

describe("eyeshine", () => {
  it("shows at night unless it is foggy", () => {
    expect(eyesOut("night", "clear")).toBe(true);
    expect(eyesOut("night", "rain")).toBe(true);
    expect(eyesOut("night", "fog")).toBe(false);
    expect(eyesOut("dusk", "clear")).toBe(false);
  });

  it("puts pairs of eyes on the far bank in view, glowing a while and gone between", () => {
    let shown = 0;
    let gone = 0;
    for (let t = 0; t < 300; t += 0.5) {
      for (let i = 0; i < WATCHERS; i++) {
        const pair = eyePair(i, t);
        if (!pair) {
          gone++;
          continue;
        }
        shown++;
        expect(onLand(pair.x, pair.z)).toBe(true);
        expect(pair.z).toBeLessThan(LAKE_CENTER_Z - 10);
        expect(Math.abs(pair.x)).toBeLessThan(17);
        expect(pair.glow).toBeGreaterThanOrEqual(0);
        expect(pair.glow).toBeLessThanOrEqual(1);
      }
    }
    expect(shown).toBeGreaterThan(200);
    expect(gone).toBeGreaterThan(shown);
    expect(eyePair(0, 10, true)).toBeNull();
    expect(SHOW_SEC).toBeLessThan(15);
  });
});
