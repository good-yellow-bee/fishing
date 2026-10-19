import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { paintedFishShapes } from "./ArticulatedFish";
import { PLAIN_BUILD, type FishBuild } from "./fishBuild";

const hexes = (geometry: THREE.BufferGeometry) => {
  const colours = geometry.getAttribute("color");
  const out = new Set<number>();
  for (let i = 0; i < colours.count; i += 1) out.add(new THREE.Color(colours.getX(i), colours.getY(i), colours.getZ(i)).getHex());
  return out;
};

describe("painted fish", () => {
  it("paints the front in the body, eye, fin, mark and whisker colours, and the tail in body and accent", () => {
    const build: FishBuild = { ...PLAIN_BUILD, barbels: 2, marks: "bars" };
    const shapes = paintedFishShapes(build, "#c97945", "#e9bc72");
    const front = hexes(shapes.front);
    for (const colour of ["#c97945", "#101719", "#465754", "#2f3424", "#3a332c", "#e9bc72"]) expect(front).toContain(new THREE.Color(colour).getHex());
    expect([...hexes(shapes.middle)]).toEqual([new THREE.Color("#c97945").getHex()]);
    expect(hexes(shapes.tail)).toEqual(new Set([new THREE.Color("#c97945").getHex(), new THREE.Color("#e9bc72").getHex()]));
  });

  it("lays every shape out alike, so one skinned mesh can carry all three", () => {
    const shapes = paintedFishShapes(PLAIN_BUILD, "#c97945", "#e9bc72");
    const layout = (geometry: THREE.BufferGeometry) => Object.keys(geometry.attributes).sort().join();
    expect(layout(shapes.middle)).toBe(layout(shapes.front));
    expect(layout(shapes.tail)).toBe(layout(shapes.front));
  });

  it("puts the middle and the tail where ArticulatedFish puts them, about their joints", () => {
    const shapes = paintedFishShapes(PLAIN_BUILD, "#c97945", "#e9bc72");
    shapes.middle.computeBoundingBox();
    expect(shapes.middle.boundingBox!.getCenter(new THREE.Vector3()).z).toBeCloseTo(-0.15, 2);
  });
});
