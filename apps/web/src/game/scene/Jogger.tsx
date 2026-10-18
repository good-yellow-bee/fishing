import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { joggerAt } from "./jogRun";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const JACKET = "#e8c22a";
const TIGHTS = "#22262e";
const SKIN = "#c98f68";
const HAT = "#2b3a55";
const GLOVES = "#22262e";
const SHOES = "#f2f0ea";
/** The hips' height, the shoulders' above them, and the length of the upper and lower leg. */
const HIP_Y = 0.88;
const SHOULDER_Y = 0.52;
const THIGH = 0.44;
const SHIN = 0.44;
/** Drawn a little larger than life, as the others on the far bank are. */
const SCALE = 1.2;

/** The runner's body above the hips, bundled up for winter: a bright running jacket and a bobble hat, facing +z. */
export function joggerTorsoShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.15, 0.16, 0.56, 8), position: [0, 0.28, 0], color: JACKET },
    { geometry: new THREE.SphereGeometry(0.1, 10, 8), position: [0, 0.71, 0.01], color: SKIN },
    { geometry: new THREE.SphereGeometry(0.106, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, 0.74, -0.005], color: HAT },
    { geometry: new THREE.SphereGeometry(0.04, 6, 4), position: [0, 0.85, -0.01], color: "#f3efe6" },
  ]);
}

/** A thigh hung from the hip, and the shin and shoe hung from the knee. */
export function thighShape() {
  return mergePainted([{ geometry: new THREE.CylinderGeometry(0.065, 0.055, THIGH, 6), position: [0, -THIGH / 2, 0], color: TIGHTS }]);
}

export function shinShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.05, 0.04, SHIN, 6), position: [0, -SHIN / 2, 0], color: TIGHTS },
    { geometry: new THREE.BoxGeometry(0.1, 0.07, 0.22), position: [0, -SHIN + 0.01, 0.05], color: SHOES },
  ]);
}

/** An arm bent at the elbow, as runners carry them: upper arm down, forearm forward to a gloved hand. */
export function runArmShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.045, 0.04, 0.28, 6), position: [0, -0.14, 0], color: JACKET },
    { geometry: new THREE.CylinderGeometry(0.04, 0.035, 0.24, 6), position: [0, -0.28, 0.11], rotation: [Math.PI / 2, 0, 0], color: JACKET },
    { geometry: new THREE.SphereGeometry(0.04, 6, 4), position: [0, -0.28, 0.25], color: GLOVES },
  ]);
}

/** A jogger running the far bank on winter days (jogRun.ts). */
export function Jogger() {
  const still = useReducedMotion();
  const body = useRef<THREE.Group>(null);
  const hips = useRef<THREE.Group>(null);
  const thighs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const shins = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const arms = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const shapes = useMemo(() => ({ torso: joggerTorsoShape(), thigh: thighShape(), shin: shinShape(), arm: runArmShape() }), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      [...Object.values(shapes), material].forEach((item) => item.dispose());
    },
    [shapes, material],
  );
  useFrame(({ clock }) => {
    const pose = joggerAt(clock.elapsedTime, still);
    if (body.current) {
      body.current.position.set(pose.x, 0, pose.z);
      body.current.rotation.y = pose.yaw;
    }
    // A little bounce twice a stride, as each foot lands.
    if (hips.current) hips.current.position.y = HIP_Y + Math.abs(pose.stride) * 0.05 * pose.pace - 0.03;
    [1, -1].forEach((side, i) => {
      const swing = pose.stride * side;
      // The thigh swings forward and back; the knee folds most as the leg comes through behind.
      if (thighs[i]!.current) thighs[i]!.current.rotation.x = -swing * 0.65 * pose.pace;
      if (shins[i]!.current) shins[i]!.current.rotation.x = (0.25 + Math.max(0, swing) * 1.1) * pose.pace;
      // The arms pump against the legs.
      if (arms[i]!.current) arms[i]!.current.rotation.x = swing * 0.6 * pose.pace;
    });
  });
  return (
    <group ref={body} name="jogger">
      <group scale={SCALE}>
        <group ref={hips} position={[0, HIP_Y, 0]}>
          <group rotation={[0.12, 0, 0]}>
            <mesh geometry={shapes.torso} material={material} castShadow />
            {[1, -1].map((side, i) => (
              <group key={side} ref={arms[i]} position={[side * 0.18, SHOULDER_Y, 0]}>
                <mesh geometry={shapes.arm} material={material} />
              </group>
            ))}
          </group>
          {[1, -1].map((side, i) => (
            <group key={side} ref={thighs[i]} position={[side * 0.08, 0, 0]}>
              <mesh geometry={shapes.thigh} material={material} castShadow />
              <group ref={shins[i]} position={[0, -THIGH, 0]}>
                <mesh geometry={shapes.shin} material={material} />
              </group>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}
