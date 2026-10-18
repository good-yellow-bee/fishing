import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { FIRE_AT } from "./campfireSmoke";
import { PUDDLES } from "./rainPuddles";
import { BEE_COUNT, PATCHES, beeAt, beesOut, flowersIn } from "./meadowFlowers";

describe("wildflowers", () => {
  it("bloom from spring to fall, fewest in fall and none in winter", () => {
    expect(flowersIn("winter")).toEqual([]);
    expect(flowersIn("summer").length).toBeGreaterThan(flowersIn("fall").length);
    expect(flowersIn("fall").length).toBeGreaterThan(0);
  });

  it("change colour with the season", () => {
    const colours = (season: "spring" | "summer" | "fall") => new Set(flowersIn(season).map((flower) => flower.color));
    expect(colours("spring")).not.toEqual(colours("fall"));
    expect(colours("summer").size).toBeGreaterThan(1);
  });

  it("grow on dry land, clear of the campfire and the rain puddles", () => {
    for (const flower of flowersIn("summer")) {
      expect(inLake(flower.x, flower.z)).toBe(false);
      expect(Math.hypot(flower.x - FIRE_AT.x, flower.z - FIRE_AT.z)).toBeGreaterThan(0.8);
      for (const puddle of PUDDLES) expect(Math.hypot(flower.x - puddle.x, flower.z - puddle.z)).toBeGreaterThan(puddle.rx);
    }
    expect(PATCHES.length).toBeGreaterThan(1);
  });

  it("are the same every visit", () => {
    expect(flowersIn("spring")).toEqual(flowersIn("spring"));
  });
});

describe("bumblebees", () => {
  it("are out on dry days in spring and summer", () => {
    expect(beesOut("day", "clear", "summer")).toBe(true);
    expect(beesOut("day", "overcast", "spring")).toBe(true);
    expect(beesOut("day", "rain", "summer")).toBe(false);
    expect(beesOut("day", "fog", "summer")).toBe(false);
    expect(beesOut("dusk", "clear", "summer")).toBe(false);
    expect(beesOut("day", "clear", "fall")).toBe(false);
  });

  it("settle on flowers and fly between them without jumps", () => {
    const flowers = flowersIn("summer");
    for (let i = 0; i < BEE_COUNT; i += 1) {
      let settled = 0;
      let last = beeAt(i, 0, flowers)!;
      for (let t = 0.02; t < 30; t += 0.02) {
        const pose = beeAt(i, t, flowers)!;
        expect(Math.hypot(pose.x - last.x, pose.y - last.y, pose.z - last.z)).toBeLessThan(0.15);
        if (!pose.flying) {
          settled += 1;
          expect(flowers.some((flower) => Math.hypot(flower.x - pose.x, flower.z - pose.z) < 1e-9)).toBe(true);
        }
        last = pose;
      }
      expect(settled).toBeGreaterThan(0);
    }
  });

  it("have nowhere to go with no flowers", () => {
    expect(beeAt(0, 3, [])).toBeNull();
  });
});
