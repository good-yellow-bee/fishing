import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { pitchTurn } from "./bodyPitch";

function noseHeight(pitch: number, yaw: number) {
  const body = new THREE.Object3D();
  body.rotation.set(pitchTurn(pitch), yaw, 0, "YXZ");
  return new THREE.Vector3(0, 0, 1).applyEuler(body.rotation).y;
}

describe("pitchTurn", () => {
  it("tips a diving creature nose first, whichever way it faces", () => {
    for (const yaw of [0, 1, -2, Math.PI]) {
      expect(noseHeight(-1, yaw)).toBeLessThan(-0.5);
      expect(noseHeight(0.5, yaw)).toBeGreaterThan(0.3);
      expect(noseHeight(0, yaw)).toBeCloseTo(0, 6);
    }
  });
});
