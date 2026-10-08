import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { BANK_BOARDS, BANK_STAND_LIFT, BANK_THICK, BANK_TOP } from "./bankWalk.ts";
import { bankPlankMatrix } from "./LakeWorld.tsx";

describe("bank plank instancing", () => {
  it("preserves every board's placement, dimensions, and stand lift", () => {
    for (const [index, board] of BANK_BOARDS.entries()) {
      const matrix = bankPlankMatrix(board, index);
      const position = new THREE.Vector3();
      const rotation = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      matrix.decompose(position, rotation, scale);

      expect(position.x).toBeCloseTo(board.x);
      expect(position.z).toBeCloseTo(board.z);
      expect(position.y).toBeCloseTo(BANK_TOP - BANK_THICK / 2 + (board.kind === "stand" ? BANK_STAND_LIFT : 0) + (index % 2) * 0.001);
      expect(scale.x).toBeCloseTo(board.halfX * 2);
      expect(scale.y).toBeCloseTo(BANK_THICK);
      expect(scale.z).toBeCloseTo(board.halfZ * 2);
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(rotation);
      const expectedForward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), board.yaw);
      expect(forward.x).toBeCloseTo(expectedForward.x);
      expect(forward.z).toBeCloseTo(expectedForward.z);
    }
  });
});
