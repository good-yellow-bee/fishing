import { describe, expect, it } from "vitest";
import { DOCK_PLANKS } from "@stillwater/shared";
import { mouseOut } from "./mouseScurry";
import { TOAD_FROM, TOAD_TO, TOAD_Y, VISIT_EVERY_SEC, VISIT_SEC, toadAt, toadOut } from "./toadHop";

describe("toad on the dock", () => {
  it("comes out on wet dawns, dusks and nights from spring to fall, never with the mouse", () => {
    expect(toadOut("dusk", "rain", "summer")).toBe(true);
    expect(toadOut("night", "rain", "fall")).toBe(true);
    expect(toadOut("day", "rain", "summer")).toBe(false);
    expect(toadOut("dusk", "clear", "summer")).toBe(false);
    expect(toadOut("dusk", "rain", "winter")).toBe(false);
    for (const hour of ["dawn", "day", "dusk", "night"] as const) expect(toadOut(hour, "rain", "summer") && mouseOut(hour, "rain", "summer")).toBe(false);
  });

  it("climbs up, crosses the boards edge to edge and drops off, without jumps", () => {
    let last = toadAt(0);
    let seen = 0;
    let minX = Infinity;
    let maxX = -Infinity;
    for (let t = 0; t < VISIT_EVERY_SEC * 2; t += 1 / 60) {
      const pose = toadAt(t);
      if (pose.here) {
        seen += 1 / 60;
        minX = Math.min(minX, pose.x);
        maxX = Math.max(maxX, pose.x);
        expect(pose.z).toBeLessThan(DOCK_PLANKS.maxZ - 0.1);
        if (last.here) expect(Math.hypot(pose.x - last.x, pose.y - last.y, pose.z - last.z)).toBeLessThan(0.03);
      }
      last = pose;
    }
    expect(minX).toBeCloseTo(TOAD_FROM.x, 2);
    expect(maxX).toBeGreaterThan(TOAD_TO.x);
    expect(seen).toBeGreaterThan(VISIT_SEC * 1.9);
    expect(seen).toBeLessThan(VISIT_SEC * 2 + 0.1);
  });

  it("spends far longer sitting, throat pumping and blinking, than hopping", () => {
    let hopping = 0;
    let sitting = 0;
    let blinks = 0;
    for (let t = 0; t < VISIT_EVERY_SEC; t += 1 / 60) {
      const pose = toadAt(t);
      if (!pose.here || pose.y < TOAD_Y) continue;
      if (pose.kick > 0) hopping += 1;
      else if (pose.throat > 0) sitting += 1;
      if (pose.blink) blinks += 1;
    }
    expect(sitting).toBeGreaterThan(hopping * 3);
    expect(blinks).toBeGreaterThan(0);
  });

  it("sits still in the middle of the boards with reduced motion", () => {
    const sat = toadAt(3, true);
    expect(sat).toEqual(toadAt(300, true));
    expect(sat.here).toBe(true);
    expect(sat.x).toBeGreaterThan(TOAD_FROM.x);
    expect(sat.x).toBeLessThan(TOAD_TO.x);
  });
});
