import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PLAYERS, discAt, tosserAt } from "./discToss";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const SKIN = "#e2b48c";
const SHOES = "#f2f0ea";
/** Each player's shirt, shorts and hair or cap. */
const KITS = [
  { shirt: "#e0c23c", shorts: "#2f4f7a", top: "#4a3324" },
  { shirt: "#d0504a", shorts: "#3b3b3b", top: "#2e6e8e" },
] as const;
const DISC = "#ff6a2a";
/** The hips' height and the shoulders' above them. */
const HIP_Y = 0.84;
const SHOULDER_Y = 0.52;
/** Drawn a little larger than life, as the cabin is, so the game reads from across the lake. */
const SCALE = 1.2;

/** A player's body above the hips in a T-shirt, facing +z; the second wears a cap. */
export function tosserTorsoShape(kit: (typeof KITS)[number], cap: boolean) {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.15, 0.16, 0.58, 8), position: [0, 0.29, 0], color: kit.shirt },
    { geometry: new THREE.SphereGeometry(0.105, 10, 8), position: [0, 0.72, 0.01], color: SKIN },
    cap
      ? { geometry: new THREE.SphereGeometry(0.11, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, 0.75, 0], color: kit.top }
      : { geometry: new THREE.SphereGeometry(0.11, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, 0.75, -0.015], color: kit.top },
    ...(cap ? [{ geometry: new THREE.BoxGeometry(0.16, 0.015, 0.1), position: [0, 0.76, 0.13] as const, color: kit.top }] : []),
    // The other arm, hanging easy at the side.
    { geometry: new THREE.CylinderGeometry(0.04, 0.036, 0.5, 6), position: [0.18, 0.28, 0], rotation: [0, 0, 0.12], color: SKIN },
  ]);
}

/** Bare legs below shorts, and trainers. */
export function tosserLegsShape(kit: (typeof KITS)[number]) {
  return mergePainted(
    [-0.08, 0.08].flatMap((x) => [
      { geometry: new THREE.CylinderGeometry(0.075, 0.07, 0.3, 6), position: [x, HIP_Y - 0.15, 0] as const, color: kit.shorts },
      { geometry: new THREE.CylinderGeometry(0.05, 0.045, HIP_Y - 0.3, 6), position: [x, (HIP_Y - 0.3) / 2 + 0.04, 0] as const, color: SKIN },
      { geometry: new THREE.BoxGeometry(0.1, 0.06, 0.19), position: [x, 0.03, 0.04] as const, color: SHOES },
    ]),
  );
}

/** The throwing arm, hung from the shoulder: a short sleeve, then the bare arm. */
export function tosserArmShape(kit: (typeof KITS)[number]) {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.05, 0.048, 0.14, 6), position: [0, -0.07, 0], color: kit.shirt },
    { geometry: new THREE.CylinderGeometry(0.04, 0.036, 0.4, 6), position: [0, -0.3, 0], color: SKIN },
  ]);
}

/** Two people tossing a flying disc back and forth on the far bank on summer days (discToss.ts). */
export function DiscTossers() {
  const still = useReducedMotion();
  const arms = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const disc = useRef<THREE.Mesh>(null);
  const shapes = useMemo(
    () => KITS.map((kit, i) => ({ torso: tosserTorsoShape(kit, i === 1), legs: tosserLegsShape(kit), arm: tosserArmShape(kit) })),
    [],
  );
  const discShape = useMemo(() => new THREE.CylinderGeometry(0.15, 0.13, 0.03, 14), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const discMaterial = useMemo(() => new THREE.MeshToonMaterial({ color: DISC, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      [...shapes.flatMap((set) => [set.torso, set.legs, set.arm]), discShape, material, discMaterial].forEach((item) => item.dispose());
    },
    [shapes, discShape, material, discMaterial],
  );
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    PLAYERS.forEach((_, i) => {
      const arm = arms[i]!.current;
      if (!arm) return;
      const pose = tosserAt(i, time, still);
      // Lifted out level for the throw, or right up overhead for the catch; then swung back across the body and flung out.
      arm.rotation.x = -Math.max(pose.raise * 1.45, pose.reach * 2.7);
      arm.rotation.y = pose.swing < 0 ? -pose.swing * 1.4 : -pose.swing * 0.3;
    });
    const point = discAt(time, still);
    if (disc.current) {
      disc.current.position.set(point.x, point.y, point.z);
      // Flat and spinning in flight, tipped a little in the hand.
      disc.current.rotation.set(point.flying ? 0.12 : 0.9, point.spin, 0);
    }
  });
  return (
    <group name="disc-tossers">
      {PLAYERS.map((player, i) => (
        <group key={i} position={[player.x, 0, player.z]} rotation={[0, player.yaw, 0]} scale={SCALE}>
          <mesh geometry={shapes[i]!.legs} material={material} castShadow />
          <group position={[0, HIP_Y, 0]}>
            <mesh geometry={shapes[i]!.torso} material={material} castShadow />
            {/* The right arm, on -x facing +z. */}
            <group ref={arms[i]} position={[-0.18, SHOULDER_Y, 0]} rotation-order="YXZ">
              <mesh geometry={shapes[i]!.arm} material={material} />
            </group>
          </group>
        </group>
      ))}
      <mesh ref={disc} geometry={discShape} material={discMaterial} scale={SCALE} castShadow />
    </group>
  );
}
