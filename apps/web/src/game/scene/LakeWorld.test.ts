import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  BANK_BOARDS,
  BANK_STAND_LIFT,
  BANK_STAND_PLANK,
  BANK_THICK,
  BANK_TOP,
  BANK_WALK_PLANK,
  type BankBoard,
} from "./bankWalk.ts";
import { BANK_PLANK_BATCHES, bankPlankMatrix, placeBankPlanks } from "./LakeWorld.tsx";

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

function corners(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4) {
  const position = geometry.getAttribute("position");
  return Array.from({ length: position.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(matrix));
}

/** Corners of the per-board mesh that BankWalks drew before instancing. */
function previousCorners(board: BankBoard, index: number) {
  const stand = board.kind === "stand";
  const y = BANK_TOP - BANK_THICK / 2 + (stand ? BANK_STAND_LIFT : 0) + (index % 2) * 0.001;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(board.halfX * 2, BANK_THICK, board.halfZ * 2));
  mesh.position.set(board.x, y, board.z);
  mesh.rotation.set(0, board.yaw, 0);
  mesh.updateMatrixWorld();
  return corners(mesh.geometry, mesh.matrixWorld);
}

describe("bank plank instancing", () => {
  it("puts every board exactly where its own mesh used to be", () => {
    BANK_BOARDS.forEach((board, index) => {
      const before = previousCorners(board, index);
      const after = corners(UNIT_BOX, bankPlankMatrix(board, index));
      expect(after).toHaveLength(before.length);
      after.forEach((corner, i) => expect(corner.distanceTo(before[i]!)).toBeLessThan(1e-6));
    });
  });

  it("draws each board once, in its old color, in four batches", () => {
    expect(BANK_PLANK_BATCHES).toHaveLength(4);
    const drawn: number[] = [];
    for (const { color, planks } of BANK_PLANK_BATCHES) {
      for (const { board, index } of planks) {
        expect(board).toBe(BANK_BOARDS[index]);
        expect(color).toBe((board.kind === "stand" ? BANK_STAND_PLANK : BANK_WALK_PLANK)[index % 2]);
        drawn.push(index);
      }
    }
    expect(drawn.sort((a, b) => a - b)).toEqual(BANK_BOARDS.map((_, index) => index));
  });

  it("refits culling bounds around the placed planks", () => {
    for (const { planks } of BANK_PLANK_BATCHES) {
      const mesh = new THREE.InstancedMesh(UNIT_BOX, undefined, planks.length);
      // A frame rendered before placement caches bounds around the identity matrices at the origin.
      mesh.computeBoundingSphere();
      placeBankPlanks(mesh, planks);
      for (const { board, index } of planks) {
        for (const corner of corners(UNIT_BOX, bankPlankMatrix(board, index))) {
          expect(mesh.boundingSphere!.distanceToPoint(corner)).toBeLessThan(1e-6);
          expect(mesh.boundingBox!.distanceToPoint(corner)).toBeLessThan(1e-6);
        }
      }
    }
  });
});
