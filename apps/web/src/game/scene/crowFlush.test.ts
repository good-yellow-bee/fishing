import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge } from "@stillwater/shared";
import { CROWS, FLIGHT_SEC, crowAt, crowHome, crowsOut, sinceFlushed } from "./crowFlush";
import { joggerAt } from "./jogRun";

/** Up the bank from the drawn waterline. */
function onLand(x: number, z: number) {
  const nx = x / LAKE_RX;
  const nz = (z - LAKE_CENTER_Z) / LAKE_RZ;
  return Math.hypot(nx, nz) > lakeEdge(Math.atan2(-nz, nx)) + 0.01;
}

describe("winter crows", () => {
  it("are about on winter mornings and days", () => {
    expect(crowsOut("day", "clear", "winter")).toBe(true);
    expect(crowsOut("dawn", "overcast", "winter")).toBe(true);
    expect(crowsOut("day", "fog", "winter")).toBe(false);
    expect(crowsOut("dusk", "clear", "winter")).toBe(false);
    expect(crowsOut("day", "clear", "fall")).toBe(false);
  });

  it("feed on the far shore, just up from the water", () => {
    for (let i = 0; i < CROWS; i++) {
      const home = crowHome(i);
      expect(onLand(home.x, home.z)).toBe(true);
      expect(home.z).toBeLessThan(-14);
      expect(Math.abs(home.x)).toBeLessThan(3);
    }
  });

  it("fly up as the jogger comes running by and drop back once they are past", () => {
    let flights = 0;
    for (let t = 0; t < 120; t += 0.1) {
      const since = sinceFlushed(t, true);
      if (since !== null && since < 0.1) {
        flights++;
        const j = joggerAt(t);
        const home = crowHome(1);
        expect(Math.hypot(j.x - home.x, j.z - home.z)).toBeLessThan(3.4);
        expect(crowAt(1, t + 2, sinceFlushed(t + 2, true)).flying).toBe(true);
        expect(crowAt(1, t + 2, sinceFlushed(t + 2, true)).y).toBeGreaterThan(1);
      }
    }
    expect(flights).toBeGreaterThan(4);
    expect(sinceFlushed(50, false)).toBeNull();
  });

  it("moves each crow smoothly through take-off, the loop and landing", () => {
    for (let i = 0; i < CROWS; i++) {
      let last = crowAt(i, 0, sinceFlushed(0, true));
      for (let t = 1 / 30; t < 90; t += 1 / 30) {
        const crow = crowAt(i, t, sinceFlushed(t, true));
        expect(Math.hypot(crow.x - last.x, crow.y - last.y, crow.z - last.z)).toBeLessThan(0.25);
        if (crow.flying) expect(crow.y).toBeGreaterThanOrEqual(0);
        last = crow;
      }
    }
  });

  it("stands still on the shore when motion is reduced", () => {
    const a = crowAt(0, 3, 1, true);
    expect(a.flying).toBe(false);
    expect(a).toEqual(crowAt(0, 60, 2, true));
    expect(FLIGHT_SEC).toBeGreaterThan(3);
  });
});
