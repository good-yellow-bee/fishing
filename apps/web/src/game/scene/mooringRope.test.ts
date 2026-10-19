import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { MOORING } from "./boat";
import { POST_TIES, ROPE_LENGTHS, SEGMENTS, poseMooringRopes, restTie, ropePoint, sagOf } from "./mooringRope";

describe("mooring ropes", () => {
  it("run from the pier's front post to the bow and its rear post to the stern", () => {
    const [bowPost, sternPost] = POST_TIES;
    expect(bowPost!.z).toBeLessThan(sternPost!.z);
    // The bow points out toward the lake, the lower z.
    expect(restTie(0).z).toBeLessThan(MOORING.z);
    expect(restTie(1).z).toBeGreaterThan(MOORING.z);
    for (const post of POST_TIES) expect(post.x).toBeLessThan(MOORING.x);
  });

  it("hang from end to end, lowest in the middle", () => {
    const from = { x: 0, y: 1, z: 0 };
    const to = { x: 2, y: 1, z: 0 };
    expect(ropePoint(from, to, 2.2, 0)).toEqual(from);
    expect(ropePoint(from, to, 2.2, 1)).toEqual(to);
    const middle = ropePoint(from, to, 2.2, 0.5).y;
    expect(middle).toBeLessThan(ropePoint(from, to, 2.2, 0.3).y);
    expect(middle).toBeLessThan(1);
  });

  it("sag more as the ends come together and pull straight when taut", () => {
    expect(sagOf(1.8, 2)).toBeGreaterThan(sagOf(1.95, 2));
    expect(sagOf(2, 2)).toBe(0);
    expect(sagOf(2.1, 2)).toBe(0);
    // A rope near its rest length hangs a hand's breadth or so.
    for (const [i, length] of ROPE_LENGTHS.entries()) {
      const span = Math.hypot(restTie(i).x - POST_TIES[i]!.x, restTie(i).y - POST_TIES[i]!.y, restTie(i).z - POST_TIES[i]!.z);
      expect(sagOf(span, length)).toBeGreaterThan(0.05);
      expect(sagOf(span, length)).toBeLessThan(0.3);
    }
  });

  it("lay their segments end to end from post to hull, and fold away once untied", () => {
    const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1), new THREE.MeshBasicMaterial(), POST_TIES.length * SEGMENTS);
    const hull = new THREE.Group();
    hull.position.set(MOORING.x, 0.06, MOORING.z);
    hull.rotation.y = Math.PI;
    hull.updateMatrixWorld();
    poseMooringRopes(mesh, hull, true);
    const top = new THREE.Vector3();
    const bottom = new THREE.Vector3();
    const matrix = new THREE.Matrix4();
    mesh.getMatrixAt(0, matrix);
    bottom.set(0, -0.5, 0).applyMatrix4(matrix);
    top.set(0, 0.5, 0).applyMatrix4(matrix);
    const post = POST_TIES[0]!;
    // The first segment starts at the post, one way or the other along it.
    expect(Math.min(bottom.distanceTo(new THREE.Vector3(post.x, post.y, post.z)), top.distanceTo(new THREE.Vector3(post.x, post.y, post.z)))).toBeLessThan(1e-6);
    mesh.getMatrixAt(SEGMENTS - 1, matrix);
    const tie = restTie(0);
    top.set(0, 0.5, 0).applyMatrix4(matrix);
    bottom.set(0, -0.5, 0).applyMatrix4(matrix);
    expect(Math.min(top.distanceTo(new THREE.Vector3(tie.x, tie.y, tie.z)), bottom.distanceTo(new THREE.Vector3(tie.x, tie.y, tie.z)))).toBeLessThan(1e-6);
    poseMooringRopes(mesh, hull, false);
    mesh.getMatrixAt(3, matrix);
    expect(new THREE.Vector3().setFromMatrixScale(matrix).length()).toBe(0);
  });
});
