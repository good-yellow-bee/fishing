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
import { bankPlankColor, bankPlankMatrix, pierPlankColor, pierPlankMatrix, placeBankPlanks } from "./LakeWorld.tsx";
import { PIER_BOARDS, PIER_THICK, PIER_TOP } from "./pierDeck.ts";

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

  it("draws every board in one mesh, each in its old colour", () => {
    const mesh = new THREE.InstancedMesh(UNIT_BOX, undefined, BANK_BOARDS.length);
    placeBankPlanks(mesh);
    const colour = new THREE.Color();
    BANK_BOARDS.forEach((board, index) => {
      expect(bankPlankColor(board, index)).toBe((board.kind === "stand" ? BANK_STAND_PLANK : BANK_WALK_PLANK)[index % 2]);
      mesh.getColorAt(index, colour);
      expect(colour.getHex()).toBe(new THREE.Color(bankPlankColor(board, index)).getHex());
    });
  });

  it("refits culling bounds around the placed planks", () => {
    const mesh = new THREE.InstancedMesh(UNIT_BOX, undefined, BANK_BOARDS.length);
    // A frame rendered before placement caches bounds around the identity matrices at the origin.
    mesh.computeBoundingSphere();
    placeBankPlanks(mesh);
    BANK_BOARDS.forEach((board, index) => {
      for (const corner of corners(UNIT_BOX, bankPlankMatrix(board, index))) {
        expect(mesh.boundingSphere!.distanceToPoint(corner)).toBeLessThan(1e-6);
        expect(mesh.boundingBox!.distanceToPoint(corner)).toBeLessThan(1e-6);
      }
    });
  });
});

describe("pier deck", () => {
  it("puts every pier board where its own mesh used to be", () => {
    PIER_BOARDS.forEach((board, index) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(board.halfX * 2, PIER_THICK, board.halfZ * 2));
      mesh.position.set(board.x, PIER_TOP - PIER_THICK / 2 + (index % 2) * 0.001, board.z);
      mesh.rotation.set(0, board.yaw, 0);
      mesh.updateMatrixWorld();
      const before = corners(mesh.geometry, mesh.matrixWorld);
      const after = corners(UNIT_BOX, pierPlankMatrix(index));
      after.forEach((corner, i) => expect(corner.distanceTo(before[i]!)).toBeLessThan(1e-6));
    });
  });

  it("colours the boards in their two alternating colours, soaked darker in rain and paled by frost", () => {
    const dry = [0, 1].map((i) => pierPlankColor(i, 1, 0));
    expect(dry[0]!.equals(dry[1]!)).toBe(false);
    expect(pierPlankColor(2, 1, 0).equals(dry[0]!)).toBe(true);
    expect(pierPlankColor(0, 0.7, 0).r).toBeLessThan(dry[0]!.r);
    const frosted = pierPlankColor(0, 1, 1);
    expect(pierPlankColor(1, 1, 1).equals(frosted)).toBe(true);
  });
});
