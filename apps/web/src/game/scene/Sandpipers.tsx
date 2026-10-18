import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { SANDPIPER_COUNT, sandpiperAt } from "./sandpiperRun";
import { toonRamp } from "./toon";

const BACK = "#8a7a62";
const BELLY = "#f2eee4";
const BILL = "#2a2620";
const LEGS = "#6e6a4a";
/** Drawn larger than life so they read from the dock across the lake. */
const BIRD_SCALE = 2.6;
/** The legs' height, where the body sits and teeters. */
const HIP = 0.06;

/** The body, tail and wings, from the hip, facing +z. */
export function sandpiperBodyShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.03, 0], scale: [0.034, 0.03, 0.06], color: BACK },
    { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.022, 0.01], scale: [0.03, 0.022, 0.048], color: BELLY },
    { geometry: new THREE.ConeGeometry(0.018, 0.05, 6), position: [0, 0.034, -0.07], rotation: [-Math.PI / 2 - 0.15, 0, 0], color: BACK },
  ]);
}

/** The head and its long fine bill, from the neck. */
export function sandpiperHeadShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(0.02, 8, 6), position: [0, 0.012, 0.008], color: BACK },
    { geometry: new THREE.SphereGeometry(0.016, 8, 6), position: [0, 0.006, 0.014], color: BELLY },
    { geometry: new THREE.CylinderGeometry(0.0025, 0.004, 0.04, 4), position: [0, 0.008, 0.046], rotation: [Math.PI / 2 + 0.15, 0, 0], color: BILL },
  ]);
}

/** Both thin legs, from the ground up to the hip. */
export function sandpiperLegsShape() {
  return mergePainted(
    [-0.01, 0.01].map((x) => ({ geometry: new THREE.CylinderGeometry(0.003, 0.003, HIP + 0.01, 4), position: [x, (HIP + 0.01) / 2, 0] as const, color: LEGS })),
  );
}

/** A few sandpipers working the far bank's waterline in spring and fall (sandpiperRun.ts). */
export function Sandpipers() {
  const still = useReducedMotion();
  const birds = useRef<(THREE.Group | null)[]>([]);
  const bodies = useRef<(THREE.Group | null)[]>([]);
  const heads = useRef<(THREE.Group | null)[]>([]);
  const shapes = useMemo(() => ({ body: sandpiperBodyShape(), head: sandpiperHeadShape(), legs: sandpiperLegsShape() }), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      [...Object.values(shapes), material].forEach((item) => item.dispose());
    },
    [shapes, material],
  );
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    for (let i = 0; i < SANDPIPER_COUNT; i++) {
      const pose = sandpiperAt(i, time, still);
      const bird = birds.current[i];
      if (bird) {
        bird.position.set(pose.x, 0, pose.z);
        bird.rotation.y = pose.yaw;
      }
      const body = bodies.current[i];
      if (body) {
        // Quick steps bob the body; standing, the tail teeters and the whole bird tips forward to probe.
        body.position.y = HIP + pose.run * Math.abs(Math.sin(time * 40 + i)) * 0.006;
        body.rotation.x = pose.teeter * 0.12 + pose.peck * 0.35;
      }
      const head = heads.current[i];
      if (head) head.rotation.x = pose.peck * 0.9;
    }
  });
  return (
    <group name="sandpipers">
      {Array.from({ length: SANDPIPER_COUNT }, (_, i) => (
        <group key={i} ref={(g) => void (birds.current[i] = g)}>
          <group scale={BIRD_SCALE}>
            <mesh geometry={shapes.legs} material={material} />
            <group ref={(g) => void (bodies.current[i] = g)} position={[0, HIP, 0]}>
              <mesh geometry={shapes.body} material={material} castShadow />
              <group ref={(g) => void (heads.current[i] = g)} position={[0, 0.045, 0.05]}>
                <mesh geometry={shapes.head} material={material} />
              </group>
            </group>
          </group>
        </group>
      ))}
    </group>
  );
}
