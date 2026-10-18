import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, inLake, lakeEdge } from "@stillwater/shared";
import { BROLLY_ROUND_SEC, FLOAT_AT, SEAT_AT, brollyAt, brollyOut, brollyTilt, rodTip } from "./brollyFishing";
import { PLAYERS } from "./discToss";
import { walkPath } from "./dogWalk";

function onLand({ x, z }: { x: number; z: number }) {
  const nx = x / LAKE_RX;
  const nz = (z - LAKE_CENTER_Z) / LAKE_RZ;
  return Math.hypot(nx, nz) > lakeEdge(Math.atan2(-nz, nx)) + 0.03;
}

describe("angler under the brolly", () => {
  it("sits it out in the rain at dawn and by day", () => {
    expect(brollyOut("day", "rain")).toBe(true);
    expect(brollyOut("dawn", "rain")).toBe(true);
    expect(brollyOut("night", "rain")).toBe(false);
    expect(brollyOut("day", "overcast")).toBe(false);
  });

  it("sits on the bank with the float out on the water, clear of the dog walker's path", () => {
    expect(onLand(SEAT_AT)).toBe(true);
    expect(inLake(FLOAT_AT.x, FLOAT_AT.z)).toBe(true);
    expect(Math.hypot(FLOAT_AT.x - SEAT_AT.x, FLOAT_AT.z - SEAT_AT.z)).toBeGreaterThan(4);
    const path = Array.from({ length: 81 }, (_, i) => walkPath(i / 80));
    expect(Math.min(...path.map((p) => Math.hypot(p.x - SEAT_AT.x, p.z - SEAT_AT.z)))).toBeGreaterThan(1.2);
    // The disc tossers' bank is a summer one, but the seat sits off their pitch anyway.
    for (const player of PLAYERS) expect(Math.hypot(player.x - SEAT_AT.x, player.z - SEAT_AT.z)).toBeGreaterThan(1.5);
  });

  it("tips the umbrella into the wind, further the windier it is, and holds it upright when calm", () => {
    expect(brollyTilt({ x: 0, z: 0 })).toEqual({ x: 0, z: 0 });
    const light = brollyTilt({ x: 0.04, z: 0 });
    const strong = brollyTilt({ x: 0.13, z: 0 });
    expect(light.x).toBeLessThan(0);
    expect(strong.x).toBeLessThan(light.x);
    expect(Math.abs(strong.x)).toBeLessThan(0.5);
    expect(brollyTilt({ x: 0, z: -0.08 }).z).toBeGreaterThan(0);
  });

  it("sips now and then, and leans in to a bite that nods the rod and dips the float, all smoothly", () => {
    let last = brollyAt(0);
    let sipped = false;
    let leaned = false;
    let nodded = false;
    for (let t = 0.02; t < BROLLY_ROUND_SEC; t += 0.02) {
      const pose = brollyAt(t);
      expect(Math.abs(pose.sip - last.sip)).toBeLessThan(0.1);
      expect(Math.abs(pose.lean - last.lean)).toBeLessThan(0.1);
      expect(Math.abs(pose.nod - last.nod)).toBeLessThan(0.02);
      if (pose.sip > 0.95) sipped = true;
      if (pose.lean > 0.95) leaned = true;
      if (pose.nod > 0.05) {
        nodded = true;
        expect(pose.lean).toBeGreaterThan(0.5);
        expect(pose.sip).toBe(0);
      }
      last = pose;
    }
    expect(sipped && leaned && nodded).toBe(true);
    // The rod tip stays up over the water as it nods.
    expect(rodTip(0.09).y).toBeGreaterThan(1);
    expect(rodTip(0.09).y).toBeLessThan(rodTip(0).y);
  });

  it("sits quietly under reduced motion", () => {
    expect(brollyAt(19.5, true)).toEqual({ sip: 0, lean: 0, nod: 0, dip: 0 });
  });
});
