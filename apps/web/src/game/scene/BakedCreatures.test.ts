import { describe, expect, it } from "vitest";
import type * as THREE from "three";
import { beaverShapes } from "./Beaver";
import { grebeShapes } from "./Grebes";
import { heronShapes } from "./Heron";
import { loonShapes } from "./Loon";
import { ospreyShapes } from "./Osprey";
import { otterShape } from "./Otter";
import { owlShapes, owlTreeShape } from "./Owl";
import { ternShapes } from "./Terns";

function tones(shape: THREE.BufferGeometry) {
  const color = shape.getAttribute("color");
  expect(color.count).toBe(shape.getAttribute("position").count);
  const seen = new Set<string>();
  for (let i = 0; i < color.count; i += 1) seen.add([color.getX(i), color.getY(i), color.getZ(i)].map((v) => v.toFixed(3)).join());
  return seen.size;
}

describe("baked creatures", () => {
  it("keeps each creature's colours in its painted shapes", () => {
    const loon = loonShapes();
    expect(tones(loon.body)).toBe(2);
    expect(tones(loon.neck)).toBe(4);
    const heron = heronShapes();
    expect(tones(heron.body)).toBe(2);
    expect(tones(heron.neck)).toBe(3);
    const owl = owlShapes();
    expect(tones(owl.body)).toBe(2);
    expect(tones(owl.head)).toBe(3);
    expect(tones(ternShapes().body)).toBe(3);
    expect(tones(grebeShapes().head)).toBe(4);
    const osprey = ospreyShapes();
    expect(tones(osprey.body)).toBe(3);
    expect(tones(osprey.left)).toBe(2);
    expect(tones(beaverShapes().body)).toBe(4);
    expect(tones(otterShape())).toBe(3);
  });

  it("reaches the heron's legs down to its feet and the owl's tree up past its perch", () => {
    const { legs } = heronShapes();
    legs.computeBoundingBox();
    expect(legs.boundingBox!.min.y).toBeCloseTo(-0.66, 3);
    const tree = owlTreeShape();
    tree.computeBoundingBox();
    expect(tree.boundingBox!.max.y).toBeGreaterThan(3.3);
    const { left, right } = ternShapes();
    left.computeBoundingBox();
    right.computeBoundingBox();
    expect(left.boundingBox!.min.x).toBeCloseTo(-right.boundingBox!.max.x, 6);
    // The beaver's branch trails out to its right side.
    const { body } = beaverShapes();
    body.computeBoundingBox();
    expect(body.boundingBox!.max.x).toBeGreaterThan(0.2);
  });
});
