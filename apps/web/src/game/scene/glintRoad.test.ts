import { describe, expect, it } from "vitest";
import { MOON_ROAD_FAR, MOON_ROAD_NEAR, roadBands, roadFrom } from "./glintRoad";
import { moonRoadGlints } from "./moonDisc";
import { glitterDirection } from "./water";

const MOON: [number, number, number] = [-28, 30, -50];

describe("light roads on the water", () => {
  it("run from wherever the eye stands toward the disc", () => {
    const dock = moonRoadGlints(roadFrom({ x: 0.45, z: 13.7 }), MOON, () => true, MOON_ROAD_NEAR, MOON_ROAD_FAR);
    const east = moonRoadGlints(roadFrom({ x: 18, z: 0 }), MOON, () => true, MOON_ROAD_NEAR, MOON_ROAD_FAR);
    // From the east bank the road starts east of the dock's and still heads up the lake toward the moon.
    expect(east[0]!.x).toBeGreaterThan(dock[0]!.x + 10);
    expect(east.at(-1)!.x).toBeLessThan(east[0]!.x);
    expect(east.at(-1)!.z).toBeLessThan(east[0]!.z);
  });

  it("start a few meters out and reach the far water", () => {
    const from = { x: 0, z: 10 };
    const road = moonRoadGlints(from, [0, 30, -60], () => true, MOON_ROAD_NEAR, MOON_ROAD_FAR);
    const dists = road.map((glint) => Math.hypot(glint.x - from.x, glint.z - from.z));
    expect(Math.min(...dists)).toBeGreaterThan(MOON_ROAD_NEAR - 1);
    expect(Math.max(...dists)).toBeLessThan(MOON_ROAD_FAR + 5);
  });

  it("aim the sun's glitter from the eye, not the middle of the lake", () => {
    const west = glitterDirection([38, 34, -62], { x: -20, z: -2 });
    const middle = glitterDirection([38, 34, -62]);
    expect(west.x).toBeGreaterThan(middle.x);
  });

  it("split glints into bands without losing any", () => {
    const glints = [0, 1, 2, 0, 1].map((band) => ({ band }));
    const bands = roadBands(glints, 3);
    expect(bands.map((b) => b.length)).toEqual([2, 2, 1]);
  });
});
