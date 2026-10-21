import { describe, expect, it } from "vitest";
import { BIN_AT, BIN_INSIDE } from "./binWorms";
import { BILL, BIN_BIRD_SCALE, BIN_VISIT_EVERY_SEC, BIN_VISIT_SEC, DIP_PITCH, HELD_WORM, PERCH, SOIL_Y, billAt, binBirdAt, binBirdOut, binVisit } from "./binVisit";
import { birdHeadShape } from "./DockRobin";

const FIRST = 16;
const poses = (from: number, to: number) => Array.from({ length: Math.round((to - from) / 0.05) }, (_, i) => binBirdAt(from + i * 0.05));

describe("the worm bin's blackbird", () => {
  it("comes at dawn and by day from spring to fall, but not in the rain or in winter", () => {
    expect(binBirdOut("day", "clear", "summer")).toBe(true);
    expect(binBirdOut("dawn", "fog", "spring")).toBe(true);
    expect(binBirdOut("day", "overcast", "fall")).toBe(true);
    expect(binBirdOut("day", "rain", "summer")).toBe(false);
    expect(binBirdOut("day", "clear", "winter")).toBe(false);
    expect(binBirdOut("dusk", "clear", "summer")).toBe(false);
    expect(binBirdOut("night", "clear", "summer")).toBe(false);
  });

  it("is away before its first visit and between visits", () => {
    expect(binBirdAt(FIRST - 1).here).toBe(false);
    expect(binBirdAt(FIRST + BIN_VISIT_SEC + 1).here).toBe(false);
    expect(binBirdAt(FIRST + 5).here).toBe(true);
    expect(binBirdAt(FIRST + BIN_VISIT_EVERY_SEC + 5).here).toBe(true);
    expect(binVisit(FIRST + BIN_VISIT_EVERY_SEC + 5).index).toBe(1);
  });

  it("perches on the crate's left wall, facing in", () => {
    expect(PERCH.x).toBeCloseTo(BIN_AT.x - BIN_INSIDE.width / 2 - 0.0125);
    const perched = binBirdAt(FIRST + 3);
    expect(perched).toMatchObject({ x: PERCH.x, y: PERCH.y, z: PERCH.z, flying: 0, worm: 0 });
    expect(perched.yaw).toBeCloseTo(Math.PI / 2);
  });

  it("knows where its bill is from the head it is drawn with", () => {
    const head = birdHeadShape();
    head.computeBoundingBox();
    // The head sits 0.088 up and 0.012 forward on the body; its bill's tip is the shape's front.
    expect(BILL.out).toBeCloseTo(0.012 + head.boundingBox!.max.z, 3);
    expect(BILL.up).toBeCloseTo(0.088 + 0.01, 3);
  });

  it("bows its bill to the soil inside the crate", () => {
    const bill = billAt(DIP_PITCH);
    expect(PERCH.y + bill.up).toBeCloseTo(SOIL_Y, 2);
    const reach = PERCH.x + bill.out;
    expect(reach).toBeGreaterThan(BIN_AT.x - BIN_INSIDE.width / 2);
    expect(reach).toBeLessThan(BIN_AT.x + BIN_INSIDE.width / 2);
    expect(Math.max(...poses(FIRST, FIRST + BIN_VISIT_SEC).map((pose) => pose.pitch))).toBeCloseTo(DIP_PITCH, 1);
  });

  it("tugs a worm up out of the soil, its bill never below the soil, and flies off with it", () => {
    const visit = poses(FIRST, FIRST + BIN_VISIT_SEC);
    for (const pose of visit) {
      if (pose.flying) continue;
      expect(PERCH.y + billAt(pose.pitch).up).toBeGreaterThan(SOIL_Y - 0.01);
      // A worm stretched from the bill reaches no deeper than the soil.
      if (pose.worm > HELD_WORM) expect(PERCH.y + billAt(pose.pitch).up - pose.worm).toBeGreaterThan(SOIL_Y - 0.01);
    }
    const stretched = Math.max(...visit.map((pose) => pose.worm));
    expect(stretched).toBeGreaterThan(HELD_WORM * 1.5);
    const first = visit.findIndex((pose) => pose.worm > 0);
    expect(visit.slice(0, first).every((pose) => pose.worm === 0)).toBe(true);
    const leaving = visit.filter((pose, i) => i > first && pose.flying);
    expect(leaving.length).toBeGreaterThan(0);
    expect(leaving.every((pose) => pose.worm === HELD_WORM)).toBe(true);
    expect(leaving.at(-1)!.y).toBeGreaterThan(PERCH.y + 1.5);
  });

  it("is held perched on the rim, looking in, with no worm, under reduced motion", () => {
    const pose = binBirdAt(FIRST - 10, true);
    expect(pose).toMatchObject({ here: true, x: PERCH.x, y: PERCH.y, flying: 0, pitch: 0, worm: 0, look: 0 });
    expect(binBirdAt(500, true)).toEqual(pose);
  });

  it("is drawn smaller than the bank blackbird", () => {
    expect(BIN_BIRD_SCALE).toBeLessThan(2.6);
  });
});
