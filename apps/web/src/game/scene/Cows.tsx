import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COWS, COW_SCALE, cowAt } from "./cowGraze";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const HIDE = "#f2efe8";
const PATCH = "#2a2624";
const MUZZLE = "#d9a8a0";
const HOOF = "#3a3330";
/** Where the neck meets the body, from the cow's ground under its middle, facing +z. */
const NECK = new THREE.Vector3(0, 0.42, 0.3);
/** How far the head drops to the grass, in radians. */
const GRAZE_DIP = 1.05;

/** A cow's body on its four legs, facing +z: white with black patches. */
export function cowBodyShape() {
  return mergePainted([
    { geometry: new THREE.BoxGeometry(0.3, 0.26, 0.62), position: [0, 0.42, 0], color: HIDE },
    { geometry: new THREE.BoxGeometry(0.31, 0.18, 0.2), position: [0, 0.46, -0.12], color: PATCH },
    { geometry: new THREE.BoxGeometry(0.2, 0.12, 0.15), position: [0.06, 0.5, 0.17], color: PATCH },
    { geometry: new THREE.CylinderGeometry(0.012, 0.02, 0.24, 4), position: [0, 0.46, -0.38], rotation: [0.4, 0, 0], color: PATCH },
    ...[-1, 1].flatMap((side) =>
      [-1, 1].map((end) => ({ geometry: new THREE.BoxGeometry(0.07, 0.3, 0.07), position: [side * 0.1, 0.15, end * 0.22] as const, color: end > 0 && side > 0 ? PATCH : HIDE })),
    ),
    ...[-1, 1].flatMap((side) => [-1, 1].map((end) => ({ geometry: new THREE.BoxGeometry(0.075, 0.04, 0.075), position: [side * 0.1, 0.02, end * 0.22] as const, color: HOOF }))),
  ]);
}

/** A cow's head from the neck, looking along +z, with its pink muzzle and two short horns. */
export function cowHeadShape() {
  return mergePainted([
    { geometry: new THREE.BoxGeometry(0.14, 0.14, 0.2), position: [0, 0.02, 0.1], rotation: [0.25, 0, 0], color: PATCH },
    { geometry: new THREE.BoxGeometry(0.13, 0.09, 0.08), position: [0, -0.03, 0.22], rotation: [0.25, 0, 0], color: MUZZLE },
    ...[-1, 1].map((side) => ({ geometry: new THREE.ConeGeometry(0.015, 0.06, 4), position: [side * 0.06, 0.11, 0.05] as const, rotation: [0, 0, -side * 0.6] as const, color: HIDE })),
  ]);
}

/** A few cows grazing the pasture on the hills behind the far bank (cowGraze.ts): a draw for the bodies, one for the heads. */
export function Cows() {
  const still = useReducedMotion();
  const bodies = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const shapes = useMemo(() => ({ body: cowBodyShape(), head: cowHeadShape() }), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      [shapes.body, shapes.head, material].forEach((item) => item.dispose());
    },
    [shapes, material],
  );
  const scratch = useMemo(() => ({ body: new THREE.Matrix4(), neck: new THREE.Matrix4(), place: new THREE.Object3D() }), []);
  useFrame(({ clock }) => {
    const body = bodies.current;
    const head = heads.current;
    if (!body || !head) return;
    COWS.forEach((_, i) => {
      const pose = cowAt(i, clock.elapsedTime, still);
      const { place } = scratch;
      place.position.set(pose.x, pose.y + 0.02 * Math.abs(pose.stride), pose.z);
      place.rotation.set(0, (pose.facing * Math.PI) / 2, 0);
      place.scale.setScalar(COW_SCALE);
      place.updateMatrix();
      scratch.body.copy(place.matrix);
      body.setMatrixAt(i, scratch.body);
      scratch.neck.makeRotationX(pose.graze * GRAZE_DIP).setPosition(NECK);
      head.setMatrixAt(i, scratch.body.multiply(scratch.neck));
    });
    body.instanceMatrix.needsUpdate = true;
    head.instanceMatrix.needsUpdate = true;
  });
  return (
    <group name="cows">
      <instancedMesh ref={bodies} args={[shapes.body, material, COWS.length]} frustumCulled={false} />
      <instancedMesh ref={heads} args={[shapes.head, material, COWS.length]} frustumCulled={false} />
    </group>
  );
}
