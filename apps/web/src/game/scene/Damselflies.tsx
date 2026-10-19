import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DAMSELS, damselAt } from "./damselPerch";
import { mergeParts, mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";

const BLUE = "#2b8ee8";
const BAND = "#14202c";
const EYE = "#1d3f66";
/** Drawn a little larger than life so they read from where the angler stands. */
const SCALE = 2.2;

/** A damselfly's body facing +z: big-eyed head, thorax, and a long thin abdomen ringed in black. */
export function damselBodyShape() {
  return mergePainted([
    { geometry: new THREE.BoxGeometry(0.022, 0.016, 0.014), position: [0, 0, 0.03], color: EYE },
    { geometry: new THREE.BoxGeometry(0.012, 0.014, 0.028), position: [0, 0, 0.01], color: BLUE },
    ...Array.from({ length: 5 }, (_, k) => ({
      geometry: new THREE.BoxGeometry(0.006, 0.006, 0.014),
      position: [0, 0, -0.012 - k * 0.014] as const,
      color: k % 2 === 0 ? BLUE : BAND,
    })),
  ]);
}

/** Its four glassy wings, spread flat either side of the thorax. */
export function damselWingShape() {
  return mergeParts(
    [-1, 1].flatMap((side) =>
      [0.016, 0.004].map((z) => ({
        geometry: new THREE.PlaneGeometry(0.05, 0.011).rotateX(-Math.PI / 2),
        position: [side * 0.028, 0.006, z] as const,
      })),
    ),
  );
}

/** Two damselflies keeping to the dock's posts on calm summer days (damselPerch.ts): two draws. */
export function Damselflies() {
  const still = useReducedMotion();
  const bodies = useRef<THREE.InstancedMesh>(null);
  const wings = useRef<THREE.InstancedMesh>(null);
  const shapes = useMemo(() => ({ body: damselBodyShape(), wing: damselWingShape() }), []);
  const body = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", vertexColors: true, roughness: 0.35, metalness: 0.2 }), []);
  const glass = useMemo(() => new THREE.MeshBasicMaterial({ color: "#e8f2f8", transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }), []);
  useEffect(
    () => () => {
      [shapes.body, shapes.wing, body, glass].forEach((item) => item.dispose());
    },
    [shapes, body, glass],
  );
  const place = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const bodyMesh = bodies.current;
    const wingMesh = wings.current;
    if (!bodyMesh || !wingMesh) return;
    const time = clock.elapsedTime;
    for (let i = 0; i < DAMSELS; i += 1) {
      const pose = damselAt(i, time, still);
      place.position.set(pose.x, pose.y + 0.01, pose.z);
      place.rotation.set(0, pose.yaw, 0);
      place.scale.setScalar(SCALE);
      place.updateMatrix();
      bodyMesh.setMatrixAt(i, place.matrix);
      // Settled, the wings fold together up along its back; flying, they blur in and out.
      if (pose.flying) place.scale.set(SCALE * (0.55 + 0.45 * Math.abs(Math.sin(time * 70 + i))), SCALE, SCALE);
      else {
        place.position.y += 0.008;
        place.scale.set(SCALE * 0.12, SCALE, SCALE * 1.4);
      }
      place.updateMatrix();
      wingMesh.setMatrixAt(i, place.matrix);
    }
    bodyMesh.instanceMatrix.needsUpdate = true;
    wingMesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <group name="damselflies">
      <instancedMesh ref={bodies} args={[shapes.body, body, DAMSELS]} frustumCulled={false} />
      <instancedMesh ref={wings} args={[shapes.wing, glass, DAMSELS]} frustumCulled={false} />
    </group>
  );
}
