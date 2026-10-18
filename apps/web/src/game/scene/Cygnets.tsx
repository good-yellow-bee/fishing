import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CYGNET_COUNT, cygnetPose } from "./cygnetBrood";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const DOWN = "#9c958a";
const BILL = "#3b3632";
/** Drawn a little larger than life, so the brood reads from the dock across the lake. */
const CYGNET_SCALE = 1.4;

/** A cygnet, facing +z: a round ball of grey down, a small head held up, and a dark bill. */
export function cygnetGeometry() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.06, 0], scale: [0.09, 0.07, 0.13], color: DOWN },
    { geometry: new THREE.SphereGeometry(1, 8, 6), position: [0, 0.15, 0.09], scale: 0.045, color: DOWN },
    { geometry: new THREE.ConeGeometry(0.015, 0.05, 5), position: [0, 0.145, 0.15], rotation: [Math.PI / 2 + 0.2, 0, 0], color: BILL },
  ]);
}

/** Summer's grey cygnets paddling in a line behind the swans, in one draw (cygnetBrood.ts). */
export function Cygnets() {
  const still = useReducedMotion();
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(cygnetGeometry, []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() }), []);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame(({ clock }) => {
    const brood = mesh.current;
    if (!brood) return;
    const time = clock.elapsedTime;
    for (let i = 0; i < CYGNET_COUNT; i += 1) {
      const pose = cygnetPose(i, time, still);
      scratch.position.set(pose.x, waterHeight(pose.x, pose.z, time) - 0.02 + pose.bob * 0.008, pose.z);
      scratch.rotation.set(pose.bob * 0.06, pose.yaw, 0, "YXZ");
      scratch.scale.setScalar(CYGNET_SCALE);
      scratch.updateMatrix();
      brood.setMatrixAt(i, scratch.matrix);
    }
    brood.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} name="cygnets" args={[geometry, material, CYGNET_COUNT]} frustumCulled={false} />;
}
