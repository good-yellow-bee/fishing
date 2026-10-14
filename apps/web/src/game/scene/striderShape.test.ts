import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { STRIDER_LEGS, striderBodyGeometry, striderDimpleGeometry } from "./striderShape";

describe("strider shapes", () => {
  it("puts the body and four legs in one shape that reaches each foot", () => {
    const body = striderBodyGeometry();
    body.computeBoundingBox();
    const box = body.boundingBox!;
    const reach = Math.max(...STRIDER_LEGS.map(([, length]) => length));
    expect(Math.max(-box.min.z, box.max.z, -box.min.x, box.max.x)).toBeGreaterThan(reach * 0.6);
    expect(box.max.y).toBeLessThan(0.02);
  });

  it("lays the four dimples flat at the feet", () => {
    const dimples = striderDimpleGeometry();
    const position = dimples.getAttribute("position");
    let flat = true;
    for (let i = 0; i < position.count; i += 1) if (Math.abs(position.getY(i)) > 1e-6) flat = false;
    expect(flat).toBe(true);
    const [angle, reach] = STRIDER_LEGS[0]!;
    const foot = new THREE.Vector3(0, 0, reach).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    let nearest = Infinity;
    for (let i = 0; i < position.count; i += 1) nearest = Math.min(nearest, Math.hypot(position.getX(i) - foot.x, position.getZ(i) - foot.z));
    expect(nearest).toBeLessThan(0.013);
  });
});
