import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { fastVertexNormals } from "./waterNormals";

function bumpy() {
  const geometry = new THREE.PlaneGeometry(10, 10, 24, 24);
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i += 1) position.setZ(i, Math.sin(position.getX(i) * 1.3) * Math.cos(position.getY(i) * 0.7) * 0.4);
  return geometry;
}

describe("fast water normals", () => {
  it("match three's own smooth normals", () => {
    const ours = bumpy();
    const theirs = bumpy();
    fastVertexNormals(ours);
    theirs.computeVertexNormals();
    const a = ours.getAttribute("normal").array;
    const b = theirs.getAttribute("normal").array;
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i += 1) expect(a[i]).toBeCloseTo(b[i]!, 5);
  });
});
