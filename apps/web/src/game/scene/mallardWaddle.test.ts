import { describe, expect, it } from "vitest";
import { DOCK_PLANKS } from "@stillwater/shared";
import { MALLARD_FROM, MALLARD_TO, VISIT_EVERY_SEC, VISIT_SEC, mallardAt, mallardOut } from "./mallardWaddle";
import { snailAt, LOOP_SEC } from "./snailCrawl";
import { toadOut } from "./toadHop";
import { dogOut } from "./dogMood";

describe("mallard on the dock", () => {
  it("comes by day in the rain from spring to fall, when the dog and the toad are not out", () => {
    expect(mallardOut("day", "rain", "summer")).toBe(true);
    expect(mallardOut("day", "rain", "winter")).toBe(false);
    expect(mallardOut("day", "clear", "summer")).toBe(false);
    expect(mallardOut("dusk", "rain", "summer")).toBe(false);
    for (const season of ["spring", "summer", "fall"] as const)
      for (const hour of ["dawn", "day", "dusk", "night"] as const) {
        expect(mallardOut(hour, "rain", season) && dogOut(hour, "rain", season)).toBe(false);
        expect(mallardOut(hour, "rain", season) && toadOut(hour, "rain", season)).toBe(false);
      }
  });

  it("flaps up, crosses the boards, and flaps off the far side, without jumps", () => {
    let last = mallardAt(0);
    let seen = 0;
    let maxX = -Infinity;
    for (let t = 0; t < VISIT_EVERY_SEC * 2; t += 1 / 60) {
      const pose = mallardAt(t);
      if (pose.here) {
        seen += 1 / 60;
        maxX = Math.max(maxX, pose.x);
        expect(pose.z).toBeLessThan(DOCK_PLANKS.maxZ - 0.2);
        if (last.here) {
          expect(Math.hypot(pose.x - last.x, pose.y - last.y, pose.z - last.z)).toBeLessThan(0.05);
          expect(Math.abs(pose.waddle - last.waddle)).toBeLessThan(0.3);
          expect(Math.abs(pose.preen - last.preen)).toBeLessThan(0.15);
        }
      }
      last = pose;
    }
    expect(maxX).toBeGreaterThan(MALLARD_TO.x);
    expect(seen).toBeGreaterThan(VISIT_SEC * 1.9);
    expect(seen).toBeLessThan(VISIT_SEC * 2 + 0.1);
  });

  it("stops on the way to preen and to shake off the rain", () => {
    let preening = 0;
    let shaking = 0;
    for (let t = 0; t < VISIT_EVERY_SEC; t += 1 / 30) {
      const pose = mallardAt(t);
      if (pose.preen > 0.5) preening += 1 / 30;
      if (Math.abs(pose.shake) > 0.3) shaking += 1 / 30;
    }
    expect(preening).toBeGreaterThan(3);
    expect(shaking).toBeGreaterThan(0.2);
  });

  it("keeps clear of the snail, out in the same rain", () => {
    for (let t = 0; t < LOOP_SEC; t += 0.5) {
      const snail = snailAt(t);
      for (let k = 0; k <= 1; k += 0.05) {
        const x = MALLARD_FROM.x + (MALLARD_TO.x - MALLARD_FROM.x) * k;
        const z = MALLARD_FROM.z + (MALLARD_TO.z - MALLARD_FROM.z) * k;
        expect(Math.hypot(snail.x - x, snail.z - z)).toBeGreaterThan(0.2);
      }
    }
  });

  it("stands still on the boards with reduced motion", () => {
    expect(mallardAt(3, true)).toEqual(mallardAt(300, true));
    expect(mallardAt(3, true).here).toBe(true);
  });
});
