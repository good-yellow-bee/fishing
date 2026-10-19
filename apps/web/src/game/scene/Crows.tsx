import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CROWS, crowAt, sinceFlushed } from "./crowFlush";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const PLUMAGE = "#1d1d23";
const SHEEN = "#2c3040";
const BEAK = "#2a2622";
const LEGS = "#3a3633";
/** Drawn larger than life, so they read across the lake. */
const CROW_SCALE = 1.8;
/** Where the head and the wings join the body. */
const NECK = new THREE.Vector3(0, 0.23, 0.12);
const SHOULDER = { x: 0.07, y: 0.19, z: 0.02 };

/** The body standing on its legs, facing +z, with its tail. */
export function crowBodyShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.17, 0], scale: [0.085, 0.08, 0.16], color: PLUMAGE },
    { geometry: new THREE.SphereGeometry(1, 8, 6), position: [0, 0.2, -0.02], scale: [0.07, 0.04, 0.12], color: SHEEN },
    { geometry: new THREE.BoxGeometry(0.08, 0.02, 0.13), position: [0, 0.15, -0.19], rotation: [0.25, 0, 0], color: PLUMAGE },
    { geometry: new THREE.CylinderGeometry(0.008, 0.008, 0.11, 4), position: [0.03, 0.055, 0.01], color: LEGS },
    { geometry: new THREE.CylinderGeometry(0.008, 0.008, 0.11, 4), position: [-0.03, 0.055, 0.01], color: LEGS },
  ]);
}

/** The head from the neck, beak along +z. */
export function crowHeadShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(0.06, 8, 6), position: [0, 0.02, 0.02], color: PLUMAGE },
    { geometry: new THREE.ConeGeometry(0.022, 0.09, 5), position: [0, 0.015, 0.1], rotation: [Math.PI / 2, 0, 0], color: BEAK },
  ]);
}

/** One wing out along +x from the shoulder. */
export function crowWingShape() {
  return mergePainted([
    { geometry: new THREE.BoxGeometry(0.3, 0.012, 0.13), position: [0.15, 0, 0], color: PLUMAGE },
    { geometry: new THREE.BoxGeometry(0.1, 0.01, 0.09), position: [0.33, 0, -0.01], rotation: [0, 0.3, 0], color: SHEEN },
  ]);
}

/** A few crows feeding on the snowy far shore that fly a loop out over the water when the jogger runs by (crowFlush.ts). */
export function Crows({ jogging }: { jogging: boolean }) {
  const still = useReducedMotion();
  const bodies = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const wings = useRef<THREE.InstancedMesh>(null);
  const shapes = useMemo(() => ({ body: crowBodyShape(), head: crowHeadShape(), wing: crowWingShape() }), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      [...Object.values(shapes), material].forEach((item) => item.dispose());
    },
    [shapes, material],
  );
  const scratch = useMemo(() => ({ root: new THREE.Object3D(), part: new THREE.Object3D(), out: new THREE.Matrix4(), hidden: new THREE.Matrix4().makeScale(0, 0, 0) }), []);
  useFrame(({ clock }) => {
    const b = bodies.current;
    const h = heads.current;
    const w = wings.current;
    if (!b || !h || !w) return;
    const time = clock.elapsedTime;
    const flushed = sinceFlushed(time, jogging && !still);
    const { root, part, out } = scratch;
    for (let i = 0; i < CROWS; i++) {
      const crow = crowAt(i, time, flushed, still);
      root.position.set(crow.x, crow.y, crow.z);
      // Nose a little down as it beats along in the air.
      root.rotation.set(crow.flying ? 0.15 : 0, crow.yaw, 0, "YXZ");
      root.scale.setScalar(CROW_SCALE);
      root.updateMatrix();
      b.setMatrixAt(i, root.matrix);
      // Dipping to peck, or head up and back to caw.
      part.position.copy(NECK);
      part.rotation.set(0.9 * crow.peck - 0.5 * crow.caw, 0, 0);
      part.scale.setScalar(1);
      part.updateMatrix();
      h.setMatrixAt(i, out.multiplyMatrices(root.matrix, part.matrix));
      for (const side of [1, -1]) {
        const slot = i * 2 + (side > 0 ? 0 : 1);
        if (!crow.flying) {
          w.setMatrixAt(slot, scratch.hidden);
          continue;
        }
        part.position.set(side * SHOULDER.x, SHOULDER.y, SHOULDER.z);
        part.rotation.set(0, side > 0 ? 0 : Math.PI, 0.7 * crow.flap, "YXZ");
        part.updateMatrix();
        w.setMatrixAt(slot, out.multiplyMatrices(root.matrix, part.matrix));
      }
    }
    b.instanceMatrix.needsUpdate = true;
    h.instanceMatrix.needsUpdate = true;
    w.instanceMatrix.needsUpdate = true;
  });
  return (
    <group name="crows">
      <instancedMesh ref={bodies} args={[shapes.body, material, CROWS]} frustumCulled={false} />
      <instancedMesh ref={heads} args={[shapes.head, material, CROWS]} frustumCulled={false} />
      <instancedMesh ref={wings} args={[shapes.wing, material, CROWS * 2]} frustumCulled={false} />
    </group>
  );
}
