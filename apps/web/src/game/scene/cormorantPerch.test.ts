import { inLake, LAKE_CENTER_Z, LAKE_RX, LAKE_RZ } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import {
  BOAT_SHY_M,
  CLIMB_SEC,
  cormorantAway,
  shyBlend,
  shyTarget,
  stepShy,
  SHY_SEC,
  CORMORANT_CYCLE,
  CORMORANT_ROCK,
  DRY_SEC,
  FISH_SEC,
  FOLD_SEC,
  HOP_SEC,
  ROCK_TOP,
  cormorantOut,
  cormorantStartle,
  cormorantPose,
} from "./cormorantPerch";
import { SWAN_LOOP } from "./swanGlide";
import { ANCHOR } from "./boat";

describe("cormorant", () => {
  it("is out from dawn to dusk while the lake is open", () => {
    expect(cormorantOut("day", "summer")).toBe(true);
    expect(cormorantOut("dawn", "fall")).toBe(true);
    expect(cormorantOut("night", "summer")).toBe(false);
    expect(cormorantOut("day", "winter")).toBe(false);
  });

  it("dries its wings on the rock, then folds them", () => {
    const drying = cormorantPose(DRY_SEC / 2);
    expect(drying.spread).toBeGreaterThan(0.8);
    expect(drying.y).toBe(ROCK_TOP);
    expect(drying.x).toBe(CORMORANT_ROCK.x);
    expect(cormorantPose(DRY_SEC + FOLD_SEC / 2).spread).toBe(0);
  });

  it("fishes on the water around the rock, diving now and then, and comes up before climbing out", () => {
    const fishFrom = DRY_SEC + FOLD_SEC + HOP_SEC;
    let dove = false;
    for (let into = 0; into < FISH_SEC; into += 0.25) {
      const pose = cormorantPose(fishFrom + into);
      expect(pose.swimming).toBe(true);
      expect(pose.y).toBe(0);
      if (pose.under === 1) dove = true;
      expect(Math.hypot(pose.x / LAKE_RX, (pose.z - LAKE_CENTER_Z) / LAKE_RZ)).toBeLessThan(0.9);
    }
    expect(dove).toBe(true);
    expect(cormorantPose(fishFrom + FISH_SEC - 0.5).under).toBe(0);
  });

  it("moves without jumps through a whole round, ending back on the rock", () => {
    let last = cormorantPose(0);
    for (let time = 0.05; time <= CORMORANT_CYCLE; time += 0.05) {
      const pose = cormorantPose(time);
      expect(Math.hypot(pose.x - last.x, pose.y - last.y, pose.z - last.z)).toBeLessThan(0.25);
      last = pose;
    }
    const back = cormorantPose(CORMORANT_CYCLE - CLIMB_SEC / 1000);
    expect(back.y).toBeCloseTo(ROCK_TOP, 2);
  });

  it("keeps its rock clear of the swans' loop", () => {
    const nx = (CORMORANT_ROCK.x - SWAN_LOOP.x) / (SWAN_LOOP.rx + 3);
    const nz = (CORMORANT_ROCK.z - SWAN_LOOP.z) / (SWAN_LOOP.rz + 3);
    expect(Math.hypot(nx, nz)).toBeGreaterThan(1);
  });

  it("leaves the rock at once when a cast lands close, and only then", () => {
    const time = 20;
    const near = { x: CORMORANT_ROCK.x + 1, z: CORMORANT_ROCK.z, at: time - 0.1 };
    const shift = cormorantStartle(time, 0, near);
    expect(cormorantPose(time + shift).y).toBeCloseTo(ROCK_TOP, 5);
    expect(cormorantPose(time + shift + HOP_SEC).swimming).toBe(true);
    expect(cormorantStartle(time, 0, { ...near, at: time - 3 })).toBe(0);
    expect(cormorantStartle(time, 0, { x: CORMORANT_ROCK.x + 8, z: CORMORANT_ROCK.z, at: time })).toBe(0);
    // Already in the water: nothing changes.
    const fishing = DRY_SEC + FOLD_SEC + HOP_SEC + 3;
    expect(cormorantStartle(fishing, 0, { ...near, at: fishing })).toBe(0);
  });

  it("keeps off the boat out at its anchor, fishing out on the far side over water, and comes back as it rows home", () => {
    expect(shyTarget(1, ANCHOR)).toBe(1);
    expect(shyTarget(0.7, ANCHOR)).toBe(1);
    expect(shyTarget(0.3, ANCHOR)).toBe(0);
    expect(shyTarget(1, { x: CORMORANT_ROCK.x + BOAT_SHY_M + 1, z: CORMORANT_ROCK.z })).toBe(0);
    const home = Math.hypot(CORMORANT_ROCK.x - ANCHOR.x, CORMORANT_ROCK.z - ANCHOR.z);
    for (let t = 0; t < 120; t += 0.5) {
      const away = cormorantAway(t, ANCHOR);
      expect(Math.hypot(away.x - ANCHOR.x, away.z - ANCHOR.z)).toBeGreaterThan(home + 1.5);
      expect(away.swimming).toBe(true);
      expect(inLake(away.x, away.z)).toBe(true);
    }
    expect([...Array(60)].some((_, i) => cormorantAway(i, ANCHOR).under === 1)).toBe(true);
  });

  it("goes and comes back at a steady pace, without jumps, never hanging in the air or diving on the way", () => {
    let w = 0;
    let steps = 0;
    while (w < 1) {
      w = stepShy(w, 1, 1 / 30);
      steps += 1;
    }
    expect(steps / 30).toBeCloseTo(SHY_SEC, 0);
    expect(stepShy(1, 0, 10)).toBe(0);
    // From drying on the rock and from swimming, both ways.
    for (const nearAt of [5, DRY_SEC + FOLD_SEC + HOP_SEC + 3]) {
      const near = cormorantPose(nearAt);
      const far = cormorantAway(nearAt, ANCHOR);
      expect(shyBlend(near, far, 0)).toEqual(near);
      expect(shyBlend(near, far, 1)).toEqual(far);
      for (let k = 0; k < 1; k += 0.02) {
        const a = shyBlend(near, far, k);
        const b = shyBlend(near, far, k + 0.02);
        expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeLessThan(0.25);
        if (k < 0.6) expect(a.under).toBeLessThanOrEqual(near.under + 1e-9);
        // Past the quick hop (the first quarter of the eased way) it is on the water, not hanging in the air.
        if (k > 0.4) expect(a.swimming).toBe(true);
      }
    }
  });
});
