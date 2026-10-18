import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { rakerAt } from "./leafRake";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const SHIRT = "#8c3b2e";
const VEST = "#3e4a3a";
const JEANS = "#3e5a7e";
const SKIN = "#e2b48c";
const CAP = "#c9a04a";
const BOOTS = "#3a2e26";
const HANDLE = "#b08a5a";
const TINES = "#4a4a48";
/** The hips' height, the shoulders' above them, and the rake's handle. */
const HIP_Y = 0.86;
const SHOULDER_Y = 0.54;
const HANDLE_LENGTH = 1.5;
/** Where the hands hold the handle, above the hips, and how far forward it is drawn in and pushed out. */
const HANDS_Y = 0.32;
const HANDS_IN = 0.25;
const HANDS_OUT = 0.6;
/** Drawn a little larger than life, as the others on the far bank are. */
const SCALE = 1.2;

/** The raker's body above the hips: a check shirt under a padded vest, and a cap, facing +z. */
export function rakerTorsoShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.155, 0.175, 0.6, 8), position: [0, 0.3, 0], color: SHIRT },
    { geometry: new THREE.CylinderGeometry(0.165, 0.185, 0.42, 8, 1, true), position: [0, 0.34, 0], color: VEST },
    { geometry: new THREE.SphereGeometry(0.105, 10, 8), position: [0, 0.74, 0.01], color: SKIN },
    { geometry: new THREE.SphereGeometry(0.11, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, 0.77, 0], color: CAP },
    { geometry: new THREE.BoxGeometry(0.16, 0.015, 0.1), position: [0, 0.78, 0.13], color: CAP },
  ]);
}

export function rakerLegShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.065, 0.055, HIP_Y - 0.06, 6), position: [0, -(HIP_Y - 0.06) / 2, 0], color: JEANS },
    { geometry: new THREE.BoxGeometry(0.11, 0.07, 0.2), position: [0, -HIP_Y + 0.035, 0.04], color: BOOTS },
  ]);
}

export function rakerArmShape() {
  return mergePainted([{ geometry: new THREE.CylinderGeometry(0.048, 0.042, 0.5, 6), position: [0, -0.25, 0], color: SHIRT }]);
}

/** The rake, from the hands at the origin down along +z to its fan of tines. */
export function rakeShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.016, 0.016, HANDLE_LENGTH, 5), position: [0, 0, HANDLE_LENGTH / 2], rotation: [Math.PI / 2, 0, 0], color: HANDLE },
    ...[-0.6, -0.3, 0, 0.3, 0.6].map((a) => ({
      geometry: new THREE.BoxGeometry(0.012, 0.012, 0.32),
      position: [Math.sin(a) * 0.16, 0, HANDLE_LENGTH + Math.cos(a) * 0.16] as const,
      rotation: [0, a, 0] as const,
      color: TINES,
    })),
  ]);
}

/** A grown-up raking the leaves back onto the pile the child jumps into (leafRake.ts). */
export function LeafRaker() {
  const still = useReducedMotion();
  const body = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const arms = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const legs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const rake = useRef<THREE.Group>(null);
  const shapes = useMemo(() => ({ torso: rakerTorsoShape(), leg: rakerLegShape(), arm: rakerArmShape(), rake: rakeShape() }), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      [...Object.values(shapes), material].forEach((item) => item.dispose());
    },
    [shapes, material],
  );
  // The handle slopes from the hands down to the ground: the angle that puts the tines on the grass.
  const handsHigh = HIP_Y + HANDS_Y;
  const slope = Math.asin(Math.min(1, handsHigh / HANDLE_LENGTH));
  useFrame(({ clock }) => {
    const pose = rakerAt(clock.elapsedTime, still);
    if (body.current) {
      body.current.position.set(pose.x, 0, pose.z);
      body.current.rotation.y = pose.yaw;
    }
    if (torso.current) torso.current.rotation.x = 0.12 + pose.stroke * 0.18;
    // Both arms reach down and forward to the handle, further as the rake goes out.
    arms.forEach((arm) => {
      if (arm.current) arm.current.rotation.x = -(0.55 + pose.stroke * 0.55);
    });
    legs.forEach((leg, i) => {
      if (leg.current) leg.current.rotation.x = pose.stride * (i === 0 ? 1 : -1) * 0.45 * pose.pace;
    });
    if (rake.current) rake.current.position.z = HANDS_IN + (HANDS_OUT - HANDS_IN) * pose.stroke;
  });
  return (
    <group ref={body} name="leaf-raker">
      <group scale={SCALE}>
        {[1, -1].map((side, i) => (
          <group key={side} ref={legs[i]} position={[side * 0.09, HIP_Y, 0]}>
            <mesh geometry={shapes.leg} material={material} castShadow />
          </group>
        ))}
        <group ref={torso} position={[0, HIP_Y, 0]}>
          <mesh geometry={shapes.torso} material={material} castShadow />
          {[1, -1].map((side, i) => (
            <group key={side} ref={arms[i]} position={[side * 0.19, SHOULDER_Y, 0]} rotation={[0, 0, side * 0.25]}>
              <mesh geometry={shapes.arm} material={material} />
            </group>
          ))}
        </group>
        <group ref={rake} position={[0, handsHigh, HANDS_IN]} rotation={[slope, 0, 0]}>
          <mesh geometry={shapes.rake} material={material} castShadow />
        </group>
      </group>
    </group>
  );
}
