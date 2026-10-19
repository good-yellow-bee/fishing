import type { LakeSeason } from "@stillwater/shared";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { EWES, LAMB_MOTHERS, LAMB_SCALE, SHEEP_SCALE, eweAt, lambAt } from "./sheepFlock";
import { toonRamp } from "./toon";

const FLEECE = "#ece8de";
const FACE = "#2e2a28";

/** A sheep facing +z: a woolly body on four dark legs, its dark face down to the grass. */
export function sheepShape() {
  return mergePainted([
    { geometry: new THREE.BoxGeometry(0.26, 0.2, 0.4), position: [0, 0.24, 0], color: FLEECE },
    { geometry: new THREE.BoxGeometry(0.22, 0.06, 0.34), position: [0, 0.36, 0], color: FLEECE },
    { geometry: new THREE.BoxGeometry(0.11, 0.12, 0.14), position: [0, 0.2, 0.24], rotation: [0.7, 0, 0], color: FACE },
    ...[-1, 1].map((side) => ({ geometry: new THREE.BoxGeometry(0.06, 0.03, 0.04), position: [side * 0.07, 0.27, 0.2] as const, color: FACE })),
    ...[-1, 1].flatMap((side) => [-1, 1].map((end) => ({ geometry: new THREE.BoxGeometry(0.045, 0.16, 0.045), position: [side * 0.08, 0.08, end * 0.13] as const, color: FACE }))),
  ]);
}

/** A little flock on the far hills in spring and fall, with lambs in spring (sheepFlock.ts): one draw. */
export function Sheep({ season }: { season: LakeSeason }) {
  const still = useReducedMotion();
  const flock = useRef<THREE.InstancedMesh>(null);
  const lambs = season === "spring" ? LAMB_MOTHERS.length : 0;
  const shape = useMemo(() => sheepShape(), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      shape.dispose();
      material.dispose();
    },
    [shape, material],
  );
  const place = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const mesh = flock.current;
    if (!mesh) return;
    const time = clock.elapsedTime;
    const set = (k: number, pose: ReturnType<typeof eweAt>, scale: number) => {
      place.position.set(pose.x, pose.y + pose.hop, pose.z);
      place.rotation.set(0, (pose.facing * Math.PI) / 2, 0);
      place.scale.setScalar(scale);
      place.updateMatrix();
      mesh.setMatrixAt(k, place.matrix);
    };
    EWES.forEach((_, i) => set(i, eweAt(i, time, still), SHEEP_SCALE));
    for (let j = 0; j < lambs; j += 1) set(EWES.length + j, lambAt(j, time, still), LAMB_SCALE);
    mesh.count = EWES.length + lambs;
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={flock} name="sheep" args={[shape, material, EWES.length + LAMB_MOTHERS.length]} frustumCulled={false} />;
}
