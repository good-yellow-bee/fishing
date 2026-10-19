import { describe, expect, it } from "vitest";
import { hillFront } from "./farHills";
import { FIELDS } from "./hayField";
import { RUN_FOOT, RUN_TOP } from "./sledRun";
import { CARS, CAR_HEIGHT, LOOP_SEC, PORTAL_EAST, PORTAL_WEST, PUFFS, RUN_SEC, TRACK_Y, carAt, puffAt, trainOut, windowsLit } from "./trainLine";

describe("the hillside railway", () => {
  it("runs in any weather the hills show through, its windows lit from dusk to dawn", () => {
    expect(trainOut("clear")).toBe(true);
    expect(trainOut("rain")).toBe(true);
    expect(trainOut("fog")).toBe(false);
    expect(windowsLit("day")).toBe(false);
    expect(windowsLit("dusk")).toBe(true);
    expect(windowsLit("night")).toBe(true);
  });

  it("keeps its cars between the tunnels, in front of the hills' face, coupled in a line", () => {
    let seen = 0;
    for (let t = 0; t < LOOP_SEC; t += 0.5) {
      const cars = Array.from({ length: CARS }, (_, i) => carAt(i, t));
      cars.forEach((car) => {
        if (!car) return;
        seen += 1;
        expect(car.x).toBeGreaterThan(PORTAL_WEST);
        expect(car.x).toBeLessThan(PORTAL_EAST);
        expect(car.z).toBeGreaterThan(hillFront(car.x, TRACK_Y + CAR_HEIGHT)!);
        expect(car.z).toBeGreaterThan(hillFront(car.x, TRACK_Y)!);
      });
      for (let i = 1; i < CARS; i += 1) {
        const [a, b] = [cars[i - 1], cars[i]];
        if (a && b) expect(Math.abs(a.x - b.x)).toBeCloseTo(0.83, 2);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("goes east, waits, comes back west, and waits again", () => {
    const east = carAt(0, RUN_SEC / 2)!;
    expect(Math.sin(east.yaw)).toBeGreaterThan(0.8);
    expect(carAt(0, RUN_SEC + 5)).toBeNull();
    const back = carAt(0, LOOP_SEC / 2 + RUN_SEC / 2)!;
    expect(Math.sin(back.yaw)).toBeLessThan(-0.8);
    expect(carAt(0, LOOP_SEC - 5)).toBeNull();
  });

  it("runs below the hay fields and the foot of the sled run", () => {
    const top = TRACK_Y + CAR_HEIGHT;
    FIELDS.forEach((field) => expect(field.y - field.halfY).toBeGreaterThan(top));
    // The sled run comes down to its foot east of the line's tunnel, so wherever they share an x it is well above the train.
    expect(RUN_FOOT.x).toBeGreaterThan(PORTAL_EAST + 0.5);
    for (let x = RUN_TOP.x; x <= PORTAL_EAST; x += 0.1) {
      const runY = RUN_TOP.y + ((x - RUN_TOP.x) / (RUN_FOOT.x - RUN_TOP.x)) * (RUN_FOOT.y - RUN_TOP.y);
      expect(runY).toBeGreaterThan(top + 0.3);
    }
  });

  it("lets its steam out at the chimney, rising as it goes, and none while the train is away", () => {
    for (let j = 0; j < PUFFS; j += 1) {
      const puff = puffAt(j, RUN_SEC / 2, { x: 0.05, z: 0 });
      if (!puff) continue;
      expect(puff.y).toBeGreaterThan(TRACK_Y + 0.3);
      expect(puff.age).toBeGreaterThanOrEqual(0);
      expect(puff.age).toBeLessThanOrEqual(1);
    }
    for (let j = 0; j < PUFFS; j += 1) expect(puffAt(j, RUN_SEC + 20, { x: 0, z: 0 })).toBeNull();
  });
});
