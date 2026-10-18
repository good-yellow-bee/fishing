import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BIRDER_AT, BIRDER_YAW, birderAt } from "./birdWatch";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const JACKET = "#8a8455";
const TROUSERS = "#4e4a3c";
const SKIN = "#e2b48c";
const HAT = "#c9b98a";
const BOOTS = "#3a2e26";
const GLASSES = "#232323";
const NOTEBOOK = "#f2eee2";
/** The hips' height, the shoulders' above them, and the neck's. */
const HIP_Y = 0.86;
const SHOULDER_Y = 0.54;
const NECK_Y = 0.62;
/** Drawn a little larger than life, as the others on the far bank are. */
const SCALE = 1.2;

/** The body above the hips in a field jacket, facing +z. */
export function birderTorsoShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.155, 0.18, 0.62, 8), position: [0, 0.31, 0], color: JACKET },
    ...[-0.08, 0.08].map((x) => ({ geometry: new THREE.BoxGeometry(0.09, 0.08, 0.02), position: [x, 0.2, 0.17] as const, color: "#767044" })),
  ]);
}

/** The head under a wide-brimmed hat, facing +z. */
export function birderHeadShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(0.105, 10, 8), position: [0, 0.1, 0.01], color: SKIN },
    { geometry: new THREE.CylinderGeometry(0.09, 0.11, 0.09, 10), position: [0, 0.2, 0], color: HAT },
    { geometry: new THREE.CylinderGeometry(0.19, 0.19, 0.015, 14), position: [0, 0.16, 0], color: HAT },
  ]);
}

export function birderLegsShape() {
  return mergePainted(
    [-0.09, 0.09].flatMap((x) => [
      { geometry: new THREE.CylinderGeometry(0.065, 0.055, HIP_Y - 0.06, 6), position: [x, (HIP_Y + 0.06) / 2, 0] as const, color: TROUSERS },
      { geometry: new THREE.BoxGeometry(0.11, 0.07, 0.2), position: [x, 0.035, 0.04] as const, color: BOOTS },
    ]),
  );
}

export function birderArmShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.048, 0.042, 0.5, 6), position: [0, -0.25, 0], color: JACKET },
    { geometry: new THREE.SphereGeometry(0.045, 6, 4), position: [0, -0.5, 0], color: SKIN },
  ]);
}

/** The binoculars: two short barrels side by side, pointing along +z. */
export function binocularsShape() {
  return mergePainted(
    [-0.035, 0.035].map((x) => ({ geometry: new THREE.CylinderGeometry(0.028, 0.03, 0.12, 8), position: [x, 0, 0] as const, rotation: [Math.PI / 2, 0, 0] as const, color: GLASSES })),
  );
}

/** A birdwatcher on the far bank in spring, scanning the lake through binoculars and noting what they see (birdWatch.ts). */
export function Birdwatcher() {
  const still = useReducedMotion();
  const head = useRef<THREE.Group>(null);
  const arms = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const atEyes = useRef<THREE.Mesh>(null);
  const onChest = useRef<THREE.Mesh>(null);
  const notebook = useRef<THREE.Mesh>(null);
  const shapes = useMemo(
    () => ({ torso: birderTorsoShape(), head: birderHeadShape(), legs: birderLegsShape(), arm: birderArmShape(), glasses: binocularsShape(), notebook: new THREE.BoxGeometry(0.13, 0.17, 0.02) }),
    [],
  );
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const paper = useMemo(() => new THREE.MeshToonMaterial({ color: NOTEBOOK, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      [...Object.values(shapes), material, paper].forEach((item) => item.dispose());
    },
    [shapes, material, paper],
  );
  useFrame(({ clock }) => {
    const pose = birderAt(clock.elapsedTime, still);
    if (head.current) {
      head.current.rotation.y = pose.scan * pose.glasses;
      // Bent over the notebook to write.
      head.current.rotation.x = pose.note * 0.45;
    }
    arms.forEach((arm, i) => {
      if (!arm.current) return;
      const side = i === 0 ? 1 : -1;
      // Up to the face holding the glasses, both hands meeting in front; or forward to hold the notebook and write.
      arm.current.rotation.x = -(pose.glasses * 2.55 + pose.note * 1.15);
      arm.current.rotation.z = -side * (pose.glasses * 0.42 + pose.note * 0.25);
      arm.current.rotation.y = pose.scan * pose.glasses;
    });
    if (atEyes.current) atEyes.current.visible = pose.glasses > 0.6;
    if (onChest.current) onChest.current.visible = pose.glasses <= 0.6;
    if (notebook.current) notebook.current.visible = pose.note > 0.4;
  });
  return (
    <group name="birdwatcher" position={[BIRDER_AT.x, 0, BIRDER_AT.z]} rotation={[0, BIRDER_YAW, 0]} scale={SCALE}>
      <mesh geometry={shapes.legs} material={material} castShadow />
      <group position={[0, HIP_Y, 0]}>
        <mesh geometry={shapes.torso} material={material} castShadow />
        <mesh ref={onChest} geometry={shapes.glasses} material={material} position={[0, 0.36, 0.19]} />
        <mesh ref={notebook} geometry={shapes.notebook} material={paper} position={[0, 0.3, 0.32]} rotation={[-0.7, 0, 0]} visible={false} />
        {[1, -1].map((side, i) => (
          <group key={side} ref={arms[i]} position={[side * 0.19, SHOULDER_Y, 0]}>
            <mesh geometry={shapes.arm} material={material} />
          </group>
        ))}
        <group ref={head} position={[0, NECK_Y, 0]}>
          <mesh geometry={shapes.head} material={material} />
          <mesh ref={atEyes} geometry={shapes.glasses} material={material} position={[0, 0.11, 0.15]} />
        </group>
      </group>
    </group>
  );
}
