import * as THREE from "three";
import { LAKE_SEASONS } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import { isLeafColor, seasonGroundColor, seasonPlantColor, seasonWaterColor, shoreIce } from "./seasonLook.ts";

const LEAF = new THREE.Color("#4d8a3e");
const TRUNK = new THREE.Color("#7a5236");

function hue(color: THREE.Color) {
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  return hsl;
}

describe("season look", () => {
  it("keeps summer as the models' own colours", () => {
    expect(seasonPlantColor(LEAF, "summer", "leafy").getHex()).toBe(LEAF.getHex());
    expect(seasonGroundColor("#4d6c48", "summer")).toBe("#4d6c48");
  });

  it("only turns foliage, never trunks or rocks", () => {
    expect(isLeafColor(LEAF)).toBe(true);
    expect(isLeafColor(TRUNK)).toBe(false);
    for (const season of LAKE_SEASONS) {
      expect(seasonPlantColor(TRUNK, season, "leafy").getHex()).toBe(TRUNK.getHex());
    }
  });

  it("turns broadleaves red to orange in fall, and keeps pines green", () => {
    for (const variant of [0, 0.5, 1]) {
      const leaf = hue(seasonPlantColor(LEAF, "fall", "leafy", variant));
      expect(leaf.h).toBeLessThan(0.12);
      expect(leaf.s).toBeGreaterThan(0.5);
    }
    expect(hue(seasonPlantColor(LEAF, "fall", "leafy", 0)).h).toBeLessThan(hue(seasonPlantColor(LEAF, "fall", "leafy", 1)).h);
    expect(isLeafColor(seasonPlantColor(LEAF, "fall", "evergreen"))).toBe(true);
  });

  it("frosts everything in winter, broadleaves palest", () => {
    const pine = hue(seasonPlantColor(LEAF, "winter", "evergreen"));
    const oak = hue(seasonPlantColor(LEAF, "winter", "leafy"));
    expect(oak.s).toBeLessThan(pine.s);
    expect(oak.l).toBeGreaterThan(hue(LEAF).l);
    const ground = new THREE.Color(seasonGroundColor("#4d6c48", "winter"));
    expect(ground.b).toBeGreaterThan(new THREE.Color("#4d6c48").b);
    // A winter night stays darker than a winter day.
    expect(hue(new THREE.Color(seasonGroundColor("#3a5240", "winter"))).l).toBeLessThan(hue(ground).l);
  });

  it("puts ice on the shore in winter only", () => {
    expect(LAKE_SEASONS.filter(shoreIce)).toEqual(["winter"]);
  });
});

describe("season water", () => {
  const luma = (hex: string) => {
    const c = new THREE.Color(hex);
    return c.r + c.g + c.b;
  };

  it("leaves summer water as it is", () => {
    expect(seasonWaterColor("#357795", "summer")).toBe("#357795");
  });

  it("turns winter water toward cold grey: less saturated, about as bright", () => {
    const summer = new THREE.Color("#357795");
    const winter = new THREE.Color(seasonWaterColor("#357795", "winter"));
    const spread = (c: THREE.Color) => Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
    expect(spread(winter)).toBeLessThan(spread(summer) * 0.75);
    expect(luma(seasonWaterColor("#357795", "winter"))).toBeCloseTo(luma("#357795"), 1);
  });

  it("stains fall water toward tea and greens spring water", () => {
    const fall = new THREE.Color(seasonWaterColor("#357795", "fall"));
    const spring = new THREE.Color(seasonWaterColor("#357795", "spring"));
    const summer = new THREE.Color("#357795");
    expect(fall.r - fall.b).toBeGreaterThan(summer.r - summer.b);
    expect(spring.g - spring.b).toBeGreaterThan(summer.g - summer.b);
  });

  it("keeps a night lake dark", () => {
    expect(luma(seasonWaterColor("#1a3a48", "winter"))).toBeCloseTo(luma("#1a3a48"), 1);
  });
});
