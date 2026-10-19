import { describe, expect, it } from "vitest";
import { spotAt } from "@stillwater/shared";
import { midgeLike, MIDGE_REACH, underMidges } from "./midgeClouds";
import { LEAN, MIDGE_CLOUDS, SPREAD, STILL_AIR } from "./scene/midgeDance";

const calm = { x: 0, z: 0 };
const cloud = MIDGE_CLOUDS[0]!;

describe("underMidges", () => {
  it("lands under a midge cloud on a still dry dusk in late spring and summer", () => {
    expect(underMidges("dusk", "clear", "summer", calm, cloud.x, cloud.z)).toBe(true);
    expect(underMidges("dusk", "overcast", "spring", calm, cloud.x + SPREAD + MIDGE_REACH - 0.05, cloud.z)).toBe(true);
    expect(underMidges("dusk", "clear", "summer", calm, cloud.x + SPREAD + MIDGE_REACH + 0.2, cloud.z)).toBe(false);
  });

  it("finds no midges by day, in fall, in rain or fog, in a breeze, or without a season", () => {
    expect(underMidges("day", "clear", "summer", calm, cloud.x, cloud.z)).toBe(false);
    expect(underMidges("dusk", "clear", "fall", calm, cloud.x, cloud.z)).toBe(false);
    expect(underMidges("dusk", "rain", "summer", calm, cloud.x, cloud.z)).toBe(false);
    expect(underMidges("dusk", "fog", "summer", calm, cloud.x, cloud.z)).toBe(false);
    expect(underMidges("dusk", "clear", "summer", { x: STILL_AIR * 2, z: 0 }, cloud.x, cloud.z)).toBe(false);
    expect(underMidges("dusk", "clear", undefined, calm, cloud.x, cloud.z)).toBe(false);
  });

  it("follows a cloud as a breath of wind leans it", () => {
    const wind = { x: STILL_AIR * 0.9, z: 0 };
    expect(underMidges("dusk", "clear", "summer", wind, cloud.x + wind.x * LEAN, cloud.z)).toBe(true);
  });

  it("hangs every cloud over water a cast can reach from the dock or the point", () => {
    for (const one of MIDGE_CLOUDS) expect(["dock", "point"]).toContain(spotAt(one.x, one.z));
  });
});

describe("midgeLike", () => {
  it("takes a dry fly, not a popper, a sinking lure or bait", () => {
    expect(midgeLike("Elk hair caddis")).toBe(true);
    expect(midgeLike("Popper")).toBe(false);
    expect(midgeLike("#5 Mepps")).toBe(false);
    expect(midgeLike("Nightcrawlers")).toBe(false);
    expect(midgeLike(undefined)).toBe(false);
  });
});
