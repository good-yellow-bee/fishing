import { onDockPlanks } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import { lureClearsDock } from "./fightMotion.ts";
import { hookWindowMs } from "../logic.ts";
import { waterHeight } from "./water.ts";
import {
  STRIKE_DUNK_M,
  STRIKE_DUNK_SEC,
  STRIKE_DROPS,
  STRIKE_RING_LIFT,
  STRIKE_RING_OPACITY,
  STRIKE_RING_OPEN_SEC,
  STRIKE_SPRAY_SEC,
  strikeDrop,
  strikeDunk,
  strikeRing,
  strikeSpray,
} from "./strikeSplash.ts";

const WINDOW_SEC = hookWindowMs(0) / 1000;
const OPEN = { x: 0, z: -6 };

describe("strike splash", () => {
  it("opens with the bite and stays readable for the whole hookset", () => {
    expect(STRIKE_SPRAY_SEC).toBeLessThan(STRIKE_RING_OPEN_SEC);
    expect(STRIKE_DUNK_SEC).toBeLessThan(WINDOW_SEC);
    expect(STRIKE_RING_OPACITY).toBeGreaterThan(0.6);

    expect(strikeRing("hookset", -0.01, OPEN.x, OPEN.z, 1)).toBeNull();
    expect(strikeSpray("hookset", -0.01, OPEN.x, OPEN.z, 1)).toBeNull();
    expect(strikeDrop("hookset", 0, -0.01)).toBeNull();
    expect(strikeDunk("hookset", -0.01)).toBe(0);

    const born = strikeRing("hookset", 0.02, OPEN.x, OPEN.z, 1);
    const mid = strikeRing("hookset", STRIKE_RING_OPEN_SEC * 0.55, OPEN.x, OPEN.z, 1);
    const held = strikeRing("hookset", WINDOW_SEC * 0.85, OPEN.x, OPEN.z, 1);
    const late = strikeRing("hookset", 1.35, OPEN.x, OPEN.z, 1);
    expect(born).not.toBeNull();
    expect(mid).not.toBeNull();
    expect(held).not.toBeNull();
    expect(late).not.toBeNull();
    expect(mid!.radius).toBeGreaterThan(born!.radius + 0.4);
    expect(mid!.open).toBeGreaterThan(born!.open);
    expect(held!.open).toBe(1);
    expect(late!.radius).toBeCloseTo(held!.radius, 5);
    expect(born!.opacity).toBe(STRIKE_RING_OPACITY);
    expect(held!.opacity).toBe(STRIKE_RING_OPACITY);
    expect(late!.opacity).toBeGreaterThan(0.6);
    for (const age of [0, 0.2, STRIKE_RING_OPEN_SEC, WINDOW_SEC, 2]) {
      expect(strikeRing("hookset", age, OPEN.x, OPEN.z, 1)!.radius).toBeLessThanOrEqual(1.5);
    }

    const spray = strikeSpray("hookset", 0.04, OPEN.x, OPEN.z, 1);
    const fading = strikeSpray("hookset", STRIKE_SPRAY_SEC * 0.75, OPEN.x, OPEN.z, 1);
    const sprayLate = strikeSpray("hookset", 1.35, OPEN.x, OPEN.z, 1);
    expect(spray).not.toBeNull();
    expect(fading).not.toBeNull();
    expect(sprayLate).not.toBeNull();
    expect(fading!.strength).toBeLessThan(spray!.strength);
    expect(sprayLate!.strength).toBeGreaterThan(0.5);
    expect(strikeRing("hookset", STRIKE_SPRAY_SEC + 0.04, OPEN.x, OPEN.z, 1)).not.toBeNull();

    const burst = strikeDrop("hookset", 0, 0.02);
    const falling = strikeDrop("hookset", 0, STRIKE_SPRAY_SEC * 0.92);
    const dropLate = strikeDrop("hookset", 0, 1.35);
    expect(burst).not.toBeNull();
    expect(burst!.y).toBeGreaterThan(0.25);
    expect(falling).not.toBeNull();
    expect(falling!.y).toBeLessThan(burst!.y);
    expect(falling!.opacity).toBeGreaterThan(0.5);
    expect(dropLate).toBeNull();
    expect(strikeDrop("hookset", 0, STRIKE_SPRAY_SEC)).toBeNull();
    for (let i = 0; i < STRIKE_DROPS; i += 1) {
      const drop = strikeDrop("hookset", i, STRIKE_SPRAY_SEC * 0.5)!;
      expect(Math.hypot(drop.x, drop.z)).toBeLessThan(0.8);
      expect(drop.y).toBeLessThan(1);
    }
    for (let i = 0; i < STRIKE_DROPS; i += 1) expect(strikeDrop("hookset", i, 0.08)).not.toBeNull();

    const sunk = strikeDunk("hookset", 0.3);
    expect(sunk).toBeCloseTo(STRIKE_DUNK_M);
    expect(sunk).toBeGreaterThan(0.4);
    expect(strikeDunk("hookset", STRIKE_DUNK_SEC)).toBe(0);
    expect(strikeDunk("hookset", WINDOW_SEC)).toBe(0);
    const surface = waterHeight(OPEN.x, OPEN.z, 1.7);
    const bobberY = 0.07 + surface - sunk;
    expect(bobberY).toBeLessThan(surface - 0.2);
  });

  it("sets the ring and the spray on the chop, not on flat water", () => {
    const earlyTime = 0.4;
    const laterTime = 2.3;
    const age = 0.12;
    const early = strikeRing("hookset", age, OPEN.x, OPEN.z, earlyTime);
    const later = strikeRing("hookset", age, OPEN.x, OPEN.z, laterTime);
    expect(early).not.toBeNull();
    expect(later).not.toBeNull();
    expect(early!.y).toBeCloseTo(waterHeight(early!.x, early!.z, earlyTime) + STRIKE_RING_LIFT, 5);
    expect(later!.y).toBeCloseTo(waterHeight(later!.x, later!.z, laterTime) + STRIKE_RING_LIFT, 5);
    expect(Math.abs(early!.y - later!.y)).toBeGreaterThan(0.02);
    expect(early!.y).not.toBeCloseTo(0, 2);
    expect(later!.y).not.toBeCloseTo(0, 2);

    const spray = strikeSpray("hookset", age, OPEN.x, OPEN.z, earlyTime);
    expect(spray).not.toBeNull();
    expect(spray!.x).toBeCloseTo(early!.x);
    expect(spray!.z).toBeCloseTo(early!.z);
    expect(spray!.y).toBeCloseTo(early!.y, 5);
    expect(spray!.y).toBeCloseTo(waterHeight(spray!.x, spray!.z, earlyTime) + STRIKE_RING_LIFT, 5);
  });

  it("keeps the splash off the dock planks", () => {
    const lip = [
      [0, 6.8],
      [0.35, 7.2],
      [-0.45, 5.7],
      [0, 5.25],
      [1.12, 6.3],
    ] as const;
    for (const [x, z] of lip) {
      expect(onDockPlanks(x, z) || !lureClearsDock(x, z)).toBe(true);
      const ring = strikeRing("hookset", 0.14, x, z, 1.4);
      const spray = strikeSpray("hookset", 0.1, x, z, 1.4);
      expect(ring).not.toBeNull();
      expect(spray).not.toBeNull();
      expect(onDockPlanks(ring!.x, ring!.z)).toBe(false);
      expect(lureClearsDock(ring!.x, ring!.z)).toBe(true);
      expect(onDockPlanks(spray!.x, spray!.z)).toBe(false);
      expect(lureClearsDock(spray!.x, spray!.z)).toBe(true);
      expect(spray!.x).toBeCloseTo(ring!.x);
      expect(spray!.z).toBeCloseTo(ring!.z);
      expect(spray!.y).toBeCloseTo(waterHeight(spray!.x, spray!.z, 1.4) + STRIKE_RING_LIFT, 5);
    }

    const open = strikeRing("hookset", 0.14, OPEN.x, OPEN.z, 1.4);
    expect(open!.x).toBeCloseTo(OPEN.x);
    expect(open!.z).toBeCloseTo(OPEN.z);
    const beside = strikeRing("hookset", 0.14, 4.2, -1.5, 1.4);
    expect(beside!.x).toBeCloseTo(4.2);
    expect(beside!.z).toBeCloseTo(-1.5);
  });

  it("stays off through the wait, the fight, and the miss", () => {
    const age = STRIKE_DUNK_SEC * 0.32;
    for (const phase of ["idle", "casting", "waiting", "fight", "result"] as const) {
      expect(strikeRing(phase, age, OPEN.x, OPEN.z, 1.2)).toBeNull();
      expect(strikeSpray(phase, age, 0, 6.8, 1.2)).toBeNull();
      expect(strikeDrop(phase, 1, age)).toBeNull();
      expect(strikeDunk(phase, age)).toBe(0);
    }
    expect(strikeDunk("hookset", age)).toBeGreaterThan(0.4);
    expect(strikeRing("fight", 0.05, OPEN.x, OPEN.z, 1)).toBeNull();
    expect(strikeSpray("waiting", 0.05, OPEN.x, OPEN.z, 1)).toBeNull();
  });
});
