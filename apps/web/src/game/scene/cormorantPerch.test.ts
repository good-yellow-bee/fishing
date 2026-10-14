import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import {
  CLIMB_SEC,
  CORMORANT_CYCLE,
  CORMORANT_ROCK,
  DRY_SEC,
  FISH_SEC,
  FOLD_SEC,
  HOP_SEC,
  ROCK_TOP,
  cormorantOut,
  cormorantPose,
} from "./cormorantPerch";
import { SWAN_LOOP } from "./swanGlide";

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
});
