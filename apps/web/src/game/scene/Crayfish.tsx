import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CRAYFISH_HOMES, crayfishAt } from "./crayfishCrawl";
import { mergePainted, type PaintedPart } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { bedHeight } from "./water";

/** Drawn larger than life: a true-size crayfish under the water is a speck from the dock. */
const CRAYFISH_SCALE = 2.6;
const SHELL = "#6e3b22";
const CLAW = "#8c4828";
const TAIL = "#5c321d";

function egg(sx: number, sy: number, sz: number) {
  return new THREE.SphereGeometry(1, 8, 6).scale(sx, sy, sz);
}

/** A crayfish about 12 cm long, facing +z: a shell, a jointed tail ending in a fan, and two claws held out in front. */
export function crayfishGeometry() {
  const parts: PaintedPart[] = [
    { geometry: egg(0.018, 0.013, 0.03), position: [0, 0.013, 0.012], color: SHELL },
    { geometry: egg(0.014, 0.01, 0.014), position: [0, 0.011, -0.022], color: TAIL },
    { geometry: egg(0.012, 0.008, 0.012), position: [0, 0.009, -0.038], color: TAIL },
    { geometry: egg(0.01, 0.006, 0.01), position: [0, 0.007, -0.052], color: TAIL },
    { geometry: egg(0.016, 0.003, 0.01), position: [0, 0.006, -0.066], color: TAIL },
  ];
  for (const side of [-1, 1]) {
    parts.push(
      { geometry: egg(0.004, 0.004, 0.016), position: [side * 0.016, 0.01, 0.044], color: CLAW },
      { geometry: egg(0.009, 0.006, 0.018), position: [side * 0.022, 0.011, 0.07], color: CLAW },
      // Feelers, swept back over the shoulders.
      { geometry: new THREE.CylinderGeometry(0.0012, 0.0006, 0.07, 3).rotateX(Math.PI / 2).rotateY(side * 0.35), position: [side * 0.018, 0.016, 0.07], color: TAIL },
    );
  }
  return mergePainted(parts);
}

/** Crayfish creeping over the bed round the dock and darting back, spring to fall, in one draw (crayfishCrawl.ts). */
export function Crayfish() {
  const still = useReducedMotion();
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(crayfishGeometry, []);
  // Seen through the water: drawn after it (renderOrder), part see-through so the water's tint shows.
  const material = useMemo(() => new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp(), transparent: true, opacity: 0.8 }), []);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame(({ clock }) => {
    const crayfish = mesh.current;
    if (!crayfish) return;
    CRAYFISH_HOMES.forEach((_, i) => {
      const pose = crayfishAt(i, clock.elapsedTime, still);
      scratch.position.set(pose.x, bedHeight(pose.x, pose.z), pose.z);
      // A dart throws the tail down and the head up.
      scratch.rotation.set(pose.darting ? -0.25 : 0, pose.yaw, 0, "YXZ");
      scratch.scale.setScalar(CRAYFISH_SCALE);
      scratch.updateMatrix();
      crayfish.setMatrixAt(i, scratch.matrix);
    });
    crayfish.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} name="crayfish" args={[geometry, material, CRAYFISH_HOMES.length]} frustumCulled={false} renderOrder={2} />;
}
