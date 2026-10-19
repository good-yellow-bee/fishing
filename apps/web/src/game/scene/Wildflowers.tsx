import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { LakeSeason } from "@stillwater/shared";
import { mergePainted } from "./mergeParts";
import { BEE_COUNT, beeAt, flowersIn, type Flower } from "./meadowFlowers";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const STEM = "#5f8f45";
const BLACK = "#1f1c18";
const AMBER = "#e8b62e";
const BUFF = "#f1e4c4";
const WING = "#e8eef2";
/** Bumblebees are drawn several times life size, so they read from the shack. */
const BEE_SCALE = 5;

/** Every flower's stem and head in one painted shape. */
export function flowersShape(flowers: readonly Flower[]) {
  return mergePainted(
    flowers.flatMap((flower) => [
      { geometry: new THREE.CylinderGeometry(0.006, 0.008, flower.height, 4), position: [flower.x, flower.height / 2, flower.z] as const, color: STEM },
      { geometry: new THREE.SphereGeometry(1, 8, 4), position: [flower.x, flower.height, flower.z] as const, scale: [0.04, 0.014, 0.04] as const, color: flower.color },
      { geometry: new THREE.SphereGeometry(0.011, 6, 4), position: [flower.x, flower.height + 0.009, flower.z] as const, color: AMBER },
    ]),
  );
}

/** A bumblebee facing +z: banded amber and black with a pale tail, and its wings apart so they can whirr. */
export function beeShapes() {
  return {
    body: mergePainted([
      { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0, 0.004], scale: [0.007, 0.007, 0.006], color: AMBER },
      { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0, -0.004], scale: [0.0075, 0.0072, 0.006], color: BLACK },
      { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0, -0.01], scale: [0.0062, 0.006, 0.005], color: BUFF },
      { geometry: new THREE.SphereGeometry(0.0045, 8, 6), position: [0, 0, 0.011], color: BLACK },
    ]),
    wing: mergePainted([{ geometry: new THREE.BoxGeometry(0.012, 0.0008, 0.007), position: [0.006, 0, 0], color: WING }]),
  };
}

/** Where each bee's two wings hinge on its back, in the bee's own size. */
const WING_HINGE = [new THREE.Vector3(0.003, 0.006, 0.002), new THREE.Vector3(-0.003, 0.006, 0.002)];

/** The season's wildflowers round the shack, and bumblebees working them while `bees`: three draws, the bees' bodies and wings each one instanced mesh. */
export function Wildflowers({ season, bees }: { season: LakeSeason; bees: boolean }) {
  const still = useReducedMotion();
  const flowers = useMemo(() => flowersIn(season), [season]);
  const shape = useMemo(() => (flowers.length > 0 ? flowersShape(flowers) : null), [flowers]);
  const bee = useMemo(beeShapes, []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const bodies = useRef<THREE.InstancedMesh>(null);
  const wings = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => ({ root: new THREE.Matrix4(), wing: new THREE.Matrix4(), turn: new THREE.Euler(), quat: new THREE.Quaternion(), scale: new THREE.Vector3(BEE_SCALE, BEE_SCALE, BEE_SCALE), at: new THREE.Vector3(), hidden: new THREE.Matrix4().makeScale(0, 0, 0) }), []);
  useEffect(() => () => shape?.dispose(), [shape]);
  useEffect(
    () => () => {
      [bee.body, bee.wing, material].forEach((item) => item.dispose());
    },
    [bee, material],
  );
  useFrame(({ clock }) => {
    const body = bodies.current;
    const wing = wings.current;
    if (!bees || !body || !wing) return;
    const time = still ? 0.5 : clock.elapsedTime;
    for (let i = 0; i < BEE_COUNT; i += 1) {
      const pose = beeAt(i, time, flowers);
      if (!pose) {
        body.setMatrixAt(i, scratch.hidden);
        wing.setMatrixAt(i * 2, scratch.hidden);
        wing.setMatrixAt(i * 2 + 1, scratch.hidden);
        continue;
      }
      scratch.turn.set(0, pose.yaw, 0);
      scratch.root.compose(scratch.at.set(pose.x, pose.y, pose.z), scratch.quat.setFromEuler(scratch.turn), scratch.scale);
      body.setMatrixAt(i, scratch.root);
      // A blur of wings in flight; on a flower they twitch now and then.
      const beat = pose.flying ? Math.sin(time * 90 + i) * 0.7 : Math.max(0, Math.sin(time * 3 + i)) * 0.3;
      WING_HINGE.forEach((hinge, side) => {
        scratch.turn.set(0, side === 0 ? -0.3 : Math.PI + 0.3, beat * (side === 0 ? 1 : -1));
        scratch.wing.makeRotationFromEuler(scratch.turn).setPosition(hinge);
        wing.setMatrixAt(i * 2 + side, scratch.wing.premultiply(scratch.root));
      });
    }
    body.instanceMatrix.needsUpdate = true;
    wing.instanceMatrix.needsUpdate = true;
  });
  return (
    <group name="wildflowers">
      {shape && <mesh geometry={shape} material={material} />}
      {bees && (
        <>
          {/* The bees roam the meadow, so they are never culled by a stale bound. */}
          <instancedMesh ref={bodies} args={[bee.body, material, BEE_COUNT]} frustumCulled={false} />
          <instancedMesh ref={wings} args={[bee.wing, material, BEE_COUNT * 2]} frustumCulled={false} />
        </>
      )}
    </group>
  );
}
