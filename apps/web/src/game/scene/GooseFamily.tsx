import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GOSLINGS, PARENTS, gooseAt } from "./gooseGraze";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const BODY = "#8a7b68";
const BREAST = "#cfc6b6";
const TAIL = "#2a2622";
const NECK = "#1f1d1b";
const CHIN = "#f2efe8";
const LEGS = "#2a2622";
const DOWN = "#d6c45c";
const DOWN_DARK = "#8c8540";
/** The birds are drawn a little larger than life, so they read from across the lake. */
const SCALE = 1.2;
const BIRDS = PARENTS + GOSLINGS;

/** A Canada goose's body low on its short legs, facing +z, with the neck's root at (0, 0.32, 0.22). */
export function gooseBodyShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(0.2, 10, 8), position: [0, 0.22, 0], scale: [0.8, 0.7, 1.4], color: BODY },
    { geometry: new THREE.SphereGeometry(0.14, 8, 6), position: [0, 0.2, 0.16], scale: [1, 1, 1.1], color: BREAST },
    { geometry: new THREE.SphereGeometry(0.07, 6, 4), position: [0, 0.24, -0.27], scale: [1, 0.6, 1.4], color: TAIL },
    { geometry: new THREE.CylinderGeometry(0.015, 0.015, 0.1, 4), position: [0.06, 0.05, 0], color: LEGS },
    { geometry: new THREE.CylinderGeometry(0.015, 0.015, 0.1, 4), position: [-0.06, 0.05, 0], color: LEGS },
  ]);
}

/** The long black neck and head with its white chin strap, rising from the root along +y and bending forward to the bill. */
export function gooseNeckShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.035, 0.045, 0.34, 6), position: [0, 0.17, 0], color: NECK },
    { geometry: new THREE.SphereGeometry(0.055, 8, 6), position: [0, 0.35, 0.03], scale: [0.8, 0.9, 1.3], color: NECK },
    { geometry: new THREE.SphereGeometry(0.045, 6, 4), position: [0, 0.33, 0.02], scale: [1.15, 0.8, 1], color: CHIN },
    { geometry: new THREE.ConeGeometry(0.022, 0.08, 5), position: [0, 0.34, 0.11], rotation: [Math.PI / 2, 0, 0], color: NECK },
  ]);
}

/** A gosling: a ball of yellow down with a little head, facing +z, the head's root at (0, 0.14, 0.07). */
export function goslingBodyShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(0.09, 8, 6), position: [0, 0.1, 0], scale: [0.9, 0.85, 1.2], color: DOWN },
    { geometry: new THREE.CylinderGeometry(0.01, 0.01, 0.05, 4), position: [0.03, 0.025, 0], color: DOWN_DARK },
    { geometry: new THREE.CylinderGeometry(0.01, 0.01, 0.05, 4), position: [-0.03, 0.025, 0], color: DOWN_DARK },
  ]);
}

export function goslingHeadShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(0.05, 8, 6), position: [0, 0.04, 0.02], color: DOWN },
    { geometry: new THREE.ConeGeometry(0.014, 0.04, 4), position: [0, 0.035, 0.075], rotation: [Math.PI / 2, 0, 0], color: TAIL },
  ]);
}

/** A pair of Canada geese and their goslings grazing the far bank in spring. */
export function GooseFamily() {
  const still = useReducedMotion();
  const birds = useRef<(THREE.Group | null)[]>([]);
  const heads = useRef<(THREE.Group | null)[]>([]);
  const shapes = useMemo(() => ({ body: gooseBodyShape(), neck: gooseNeckShape(), gosling: goslingBodyShape(), head: goslingHeadShape() }), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      [...Object.values(shapes), material].forEach((item) => item.dispose());
    },
    [shapes, material],
  );
  useFrame(({ clock }) => {
    for (let i = 0; i < BIRDS; i += 1) {
      const pose = gooseAt(i, clock.elapsedTime, still);
      const bird = birds.current[i];
      if (bird) {
        bird.position.set(pose.x, 0, pose.z);
        bird.rotation.y = pose.yaw;
      }
      // A parent's neck swings down and forward from upright to put the bill to the grass; a gosling just ducks its head.
      const head = heads.current[i];
      if (head) head.rotation.x = i < PARENTS ? pose.peck * 1.9 : pose.peck * 1.1;
    }
  });
  return (
    <group name="goose-family">
      {Array.from({ length: BIRDS }, (_, i) => (
        <group key={i} ref={(g) => void (birds.current[i] = g)} scale={SCALE}>
          {i < PARENTS ? (
            <>
              <mesh geometry={shapes.body} material={material} castShadow />
              <group ref={(g) => void (heads.current[i] = g)} position={[0, 0.32, 0.22]}>
                <mesh geometry={shapes.neck} material={material} />
              </group>
            </>
          ) : (
            <>
              <mesh geometry={shapes.gosling} material={material} />
              <group ref={(g) => void (heads.current[i] = g)} position={[0, 0.14, 0.07]}>
                <mesh geometry={shapes.head} material={material} />
              </group>
            </>
          )}
        </group>
      ))}
    </group>
  );
}
