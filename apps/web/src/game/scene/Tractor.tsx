import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { TRACTOR_SCALE, tractorAt } from "./tractorRun";
import { toonRamp } from "./toon";

const RED = "#c23a2c";
const TYRE = "#2a2624";
const HUB = "#e0c24a";
const GLASS = "#9fb8c4";
const PIPE = "#3a3533";

/** A little red tractor, nose to +z: bonnet, cab with its windows, an exhaust pipe, big back wheels and small front ones. */
export function tractorShape() {
  const wheel = (radius: number, width: number, x: number, z: number) => [
    { geometry: new THREE.CylinderGeometry(radius, radius, width, 10), position: [x, radius, z] as const, rotation: [0, 0, Math.PI / 2] as const, color: TYRE },
    { geometry: new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, width + 0.01, 8), position: [x, radius, z] as const, rotation: [0, 0, Math.PI / 2] as const, color: HUB },
  ];
  return mergePainted([
    { geometry: new THREE.BoxGeometry(0.22, 0.18, 0.4), position: [0, 0.24, 0.12], color: RED },
    { geometry: new THREE.BoxGeometry(0.28, 0.3, 0.26), position: [0, 0.42, -0.14], color: RED },
    { geometry: new THREE.BoxGeometry(0.29, 0.14, 0.27), position: [0, 0.5, -0.14], color: GLASS },
    { geometry: new THREE.BoxGeometry(0.32, 0.03, 0.3), position: [0, 0.585, -0.14], color: RED },
    { geometry: new THREE.CylinderGeometry(0.015, 0.015, 0.2, 5), position: [0.06, 0.42, 0.24], color: PIPE },
    ...[-1, 1].flatMap((side) => [...wheel(0.17, 0.08, side * 0.19, -0.14), ...wheel(0.09, 0.05, side * 0.14, 0.24)]),
  ]);
}

/** A tractor working the western hay field on the far hills on summer days (tractorRun.ts): one draw. */
export function Tractor() {
  const still = useReducedMotion();
  const tractor = useRef<THREE.Mesh>(null);
  const shape = useMemo(() => tractorShape(), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      shape.dispose();
      material.dispose();
    },
    [shape, material],
  );
  useFrame(({ clock }) => {
    const mesh = tractor.current;
    if (!mesh) return;
    const pose = tractorAt(clock.elapsedTime, still);
    mesh.position.set(pose.x, pose.y, pose.z);
    mesh.rotation.y = pose.yaw;
  });
  return <mesh ref={tractor} name="tractor" geometry={shape} material={material} scale={TRACTOR_SCALE} />;
}
