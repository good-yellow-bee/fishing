import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { skiAt } from "./skiTour";
import { toonRamp } from "./toon";

const JACKET = "#c23b3b";
const TROUSERS = "#2e3d55";
const SKIN = "#e2b48c";
const HAT = "#2f7f78";
const BOBBLE = "#f3efe6";
const SCARF = "#e3b23c";
const SKI = "#d9a441";
const POLE = "#5a5f66";
/** The hips' height, and the legs' length down to the skis. */
const HIP_Y = 0.85;
const LEG = 0.82;
const SHOULDER_Y = 0.55;
/** How far a stride swings each leg, and the arms against it. */
const LEG_SWING = 0.42;
const ARM_SWING = 0.7;

/** The skier's body above the hips, with the head, hat and scarf, facing +z. */
export function torsoShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.15, 0.17, 0.6, 8), position: [0, 0.3, 0], color: JACKET },
    { geometry: new THREE.TorusGeometry(0.12, 0.05, 6, 12), position: [0, 0.6, 0], rotation: [Math.PI / 2, 0, 0], color: SCARF },
    { geometry: new THREE.BoxGeometry(0.08, 0.26, 0.03), position: [0.07, 0.48, 0.15], rotation: [0.2, 0, 0.15], color: SCARF },
    { geometry: new THREE.SphereGeometry(0.11, 10, 8), position: [0, 0.75, 0.01], color: SKIN },
    { geometry: new THREE.SphereGeometry(0.12, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, 0.78, 0], color: HAT },
    { geometry: new THREE.SphereGeometry(0.05, 8, 6), position: [0, 0.92, -0.01], color: BOBBLE },
  ]);
}

/** One leg, hung from the hip. */
export function legShape() {
  return mergePainted([{ geometry: new THREE.CylinderGeometry(0.065, 0.055, LEG, 6), position: [0, -LEG / 2, 0], color: TROUSERS }]);
}

/** One arm hung from the shoulder, with the pole in the hand reaching back down to the snow. */
export function armShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.05, 0.045, 0.5, 6), position: [0, -0.25, 0], color: JACKET },
    { geometry: new THREE.CylinderGeometry(0.012, 0.012, 1.1, 4), position: [0, -1.015, -0.19], rotation: [0.36, 0, 0], color: POLE },
    { geometry: new THREE.TorusGeometry(0.05, 0.01, 4, 8), position: [0, -1.48, -0.36], rotation: [Math.PI / 2, 0, 0], color: POLE },
  ]);
}

/** One ski, lying flat with its tip turned up at the front. */
export function skiShape() {
  return mergePainted([
    { geometry: new THREE.BoxGeometry(0.07, 0.02, 1.6), position: [0, 0.01, 0.1], color: SKI },
    { geometry: new THREE.BoxGeometry(0.07, 0.02, 0.18), position: [0, 0.05, 0.96], rotation: [-0.5, 0, 0], color: SKI },
  ]);
}

/** A cross-country skier striding back and forth along the far bank on a winter's day. */
export function Skier() {
  const still = useReducedMotion();
  const root = useRef<THREE.Group>(null);
  const upper = useRef<THREE.Group>(null);
  const legs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const arms = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const skis = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const shapes = useMemo(() => ({ torso: torsoShape(), leg: legShape(), arm: armShape(), ski: skiShape() }), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      [shapes.torso, shapes.leg, shapes.arm, shapes.ski, material].forEach((item) => item.dispose());
    },
    [shapes, material],
  );
  useFrame(({ clock }) => {
    const pose = skiAt(clock.elapsedTime, still);
    if (root.current) {
      root.current.position.set(pose.x, 0, pose.z);
      root.current.rotation.y = pose.yaw;
    }
    // Leaning into the stride, and dipping a little as each leg passes under the body.
    if (upper.current) {
      upper.current.rotation.x = 0.08 + 0.18 * pose.effort;
      upper.current.position.y = HIP_Y - 0.04 * (1 - Math.abs(pose.stride));
    }
    [1, -1].forEach((side, i) => {
      const swing = pose.stride * side * LEG_SWING;
      // A leg pointing down turned by -swing about x puts the foot forward.
      const leg = legs[i]!.current;
      if (leg) {
        leg.rotation.x = -swing;
        leg.position.y = HIP_Y - 0.04 * (1 - Math.abs(pose.stride));
      }
      // The ski glides flat under its foot; the back one lifts its heel on the kick.
      const ski = skis[i]!.current;
      if (ski) {
        ski.position.z = LEG * Math.sin(swing);
        ski.rotation.x = swing < 0 ? swing * 0.25 : 0;
      }
      // Each arm swings forward with the opposite leg (a turn of -x reaches it forward), planting the pole behind.
      const arm = arms[i]!.current;
      if (arm) arm.rotation.x = swing * (ARM_SWING / LEG_SWING) - 0.15 * pose.effort;
    });
  });
  return (
    <group ref={root} name="skier">
      <group ref={upper} position={[0, HIP_Y, 0]}>
        <mesh geometry={shapes.torso} material={material} castShadow />
        {[1, -1].map((side, i) => (
          <group key={side} ref={arms[i]} position={[side * 0.2, SHOULDER_Y, 0]}>
            <mesh geometry={shapes.arm} material={material} />
          </group>
        ))}
      </group>
      {[1, -1].map((side, i) => (
        <group key={side} ref={legs[i]} position={[side * 0.09, HIP_Y, 0]}>
          <mesh geometry={shapes.leg} material={material} />
        </group>
      ))}
      {[1, -1].map((side, i) => (
        <group key={side} ref={skis[i]} position={[side * 0.13, 0, 0]}>
          <mesh geometry={shapes.ski} material={material} />
        </group>
      ))}
    </group>
  );
}
