import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergePainted, mergeParts } from "./mergeParts";
import { bladeDip, bladeReach, dogLook, paddleAt } from "./paddleRoute";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const DECK = "#2fa3a8";
const STRIPE = "#f2efe6";
const RAIL = "#1f6f73";
const SKIN = "#e2b48c";
const VEST = "#f08a3c";
const SHORTS = "#33465e";
const CAP = "#f2efe6";
const SHAFT = "#2b2b2b";
const BLADE = "#e0573f";
const FUR = "#f4f1ea";
const PATCH = "#3b2a1c";
/** The board's deck height, and where the paddler stands along it. */
const DECK_Y = 0.07;
const FEET_Z = -0.25;
const HIP_Y = 0.86;
const SHOULDER = { across: 0.17, up: 0.46 };
/** The dog sits up this far toward the nose. */
const DOG_Z = 0.95;
const UP = new THREE.Vector3(0, 1, 0);

/** The board, nose toward +z: a long, flat, round-ended board with a pale stripe. */
export function paddleboardShape() {
  return mergePainted([
    { geometry: new THREE.CapsuleGeometry(0.36, 2.1, 4, 12), position: [0, 0.03, 0], rotation: [Math.PI / 2, 0, 0], scale: [1, 1, 0.12], color: DECK },
    { geometry: new THREE.BoxGeometry(0.16, 0.012, 2.2), position: [0, DECK_Y - 0.005, 0], color: STRIPE },
    { geometry: new THREE.BoxGeometry(0.05, 0.03, 0.05), position: [0, DECK_Y, -1.2], color: RAIL },
  ]);
}

/** The paddler from the hips up, the hips at the origin, facing +z. */
export function paddlerTorsoShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.15, 0.16, 0.18, 8), position: [0, 0.02, 0], color: SHORTS },
    { geometry: new THREE.CylinderGeometry(0.15, 0.15, 0.36, 8), position: [0, 0.27, 0], color: VEST },
    { geometry: new THREE.CylinderGeometry(0.05, 0.06, 0.08, 6), position: [0, 0.48, 0], color: SKIN },
    { geometry: new THREE.SphereGeometry(0.11, 10, 8), position: [0, 0.6, 0.01], color: SKIN },
    { geometry: new THREE.SphereGeometry(0.115, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, 0.63, 0], color: CAP },
    { geometry: new THREE.BoxGeometry(0.16, 0.02, 0.12), position: [0, 0.64, 0.12], color: CAP },
  ]);
}

/** The paddler's legs, feet on the deck at the origin, apart across the board, knees a little bent. */
export function paddlerLegsShape() {
  return mergePainted(
    [-1, 1].flatMap((side) => [
      { geometry: new THREE.CylinderGeometry(0.06, 0.055, HIP_Y - DECK_Y, 6), position: [side * 0.12, (HIP_Y - DECK_Y) / 2, 0], rotation: [0, 0, side * 0.06], color: SKIN },
      { geometry: new THREE.BoxGeometry(0.1, 0.05, 0.22), position: [side * 0.14, 0.025, 0.05], color: SKIN },
    ]),
  );
}

/** A little white terrier sitting up, facing +z, its haunches at the origin; the head is separate. */
export function boardDogShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(0.13, 8, 6), position: [0, 0.1, -0.02], scale: [1, 0.8, 1.1], color: FUR },
    { geometry: new THREE.CapsuleGeometry(0.09, 0.14, 4, 8), position: [0, 0.22, 0.07], rotation: [-0.5, 0, 0], color: FUR },
    { geometry: new THREE.CylinderGeometry(0.025, 0.022, 0.2, 5), position: [0.06, 0.1, 0.13], color: FUR },
    { geometry: new THREE.CylinderGeometry(0.025, 0.022, 0.2, 5), position: [-0.06, 0.1, 0.13], color: FUR },
    { geometry: new THREE.SphereGeometry(0.06, 6, 4), position: [0.04, 0.16, -0.06], color: PATCH },
  ]);
}

/** The terrier's head from the neck, looking along +z, with dark ears and nose. */
export function boardDogHeadShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(0.08, 8, 6), position: [0, 0.05, 0.02], color: FUR },
    { geometry: new THREE.BoxGeometry(0.07, 0.06, 0.1), position: [0, 0.03, 0.1], color: FUR },
    { geometry: new THREE.SphereGeometry(0.02, 6, 4), position: [0, 0.05, 0.155], color: PATCH },
    { geometry: new THREE.ConeGeometry(0.03, 0.07, 4), position: [0.05, 0.13, 0], rotation: [0, 0, -0.3], color: PATCH },
    { geometry: new THREE.ConeGeometry(0.03, 0.07, 4), position: [-0.05, 0.13, 0], rotation: [0, 0, 0.3], color: PATCH },
  ]);
}

/** Lays a unit-long rod, centred on its own origin along y, from `from` to `to`. */
function lay(rod: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, along: THREE.Vector3) {
  along.subVectors(to, from);
  const length = along.length() || 1e-3;
  rod.position.addVectors(from, to).multiplyScalar(0.5);
  rod.quaternion.setFromUnitVectors(UP, along.divideScalar(length));
  rod.scale.set(1, length, 1);
}

/** Someone paddling a paddleboard across the west of the lake on calm summer days, a little dog sitting up at the nose (paddleRoute.ts). */
export function Paddleboarder() {
  const still = useReducedMotion();
  const board = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const shaft = useRef<THREE.Mesh>(null);
  const blade = useRef<THREE.Mesh>(null);
  const arms = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)];
  const dogHead = useRef<THREE.Group>(null);
  const shapes = useMemo(
    () => ({
      // The board with the paddler's legs and the sitting dog, which ride it without moving: one draw.
      board: mergeParts([
        { geometry: paddleboardShape() },
        { geometry: paddlerLegsShape(), position: [0, DECK_Y, FEET_Z] },
        { geometry: boardDogShape(), position: [0, DECK_Y, DOG_Z] },
      ]),
      torso: paddlerTorsoShape(),
      dogHead: boardDogHeadShape(),
      shaft: mergePainted([{ geometry: new THREE.CylinderGeometry(0.016, 0.016, 1, 5), color: SHAFT }]),
      blade: mergePainted([{ geometry: new THREE.BoxGeometry(0.19, 0.42, 0.02), position: [0, -0.21, 0], color: BLADE }]),
      arm: mergePainted([{ geometry: new THREE.CylinderGeometry(0.04, 0.035, 1, 6), color: SKIN }]),
    }),
    [],
  );
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp(), side: THREE.DoubleSide }), []);
  useEffect(
    () => () => {
      [...Object.values(shapes), material].forEach((item) => item.dispose());
    },
    [shapes, material],
  );
  const scratch = useMemo(() => ({ top: new THREE.Vector3(), tip: new THREE.Vector3(), low: new THREE.Vector3(), shoulder: new THREE.Vector3(), along: new THREE.Vector3(), lean: new THREE.Euler() }), []);
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const pose = paddleAt(time, still);
    const group = board.current;
    if (!group) return;
    group.position.set(pose.x, waterHeight(pose.x, pose.z, still ? 0 : time) + 0.01, pose.z);
    group.rotation.y = pose.yaw;
    const reach = bladeReach(pose.stroke);
    const lift = Math.sin(pose.swap * Math.PI);
    const dip = bladeDip(pose.stroke) * (1 - lift);
    // Reaching forward over the nose at the catch, upright by the finish.
    const lean = 0.08 + 0.22 * Math.max(0, reach);
    if (torso.current) torso.current.rotation.x = lean;
    const { top, tip, low, shoulder, along } = scratch;
    // The blade on the paddling side, crossing over the board as the paddle is swapped.
    const across = pose.side * Math.cos(pose.swap * Math.PI);
    const bladeZ = 0.1 + 0.55 * reach;
    tip.set(across * 0.42, -0.3 * dip + 0.3 * (1 - dip) + 0.5 * lift, bladeZ);
    top.set(-across * 0.05, HIP_Y + 0.62 + 0.2 * lift, FEET_Z + 0.12 + 0.35 * Math.max(0, reach) + bladeZ * 0.15);
    if (shaft.current) lay(shaft.current, top, tip, along);
    if (blade.current) {
      blade.current.position.copy(tip).addScaledVector(along.subVectors(top, tip).normalize(), 0.42);
      blade.current.quaternion.setFromUnitVectors(UP, along);
    }
    // Upper hand on the grip from the far shoulder, lower hand down the shaft from the near one.
    low.lerpVectors(top, tip, 0.42);
    arms.forEach((arm, i) => {
      if (!arm.current) return;
      const side = i === 0 ? -across : across;
      shoulder.set(Math.sign(side || 1) * SHOULDER.across, SHOULDER.up, 0).applyEuler(scratch.lean.set(lean, 0, 0));
      shoulder.y += HIP_Y;
      shoulder.z += FEET_Z;
      lay(arm.current, shoulder, i === 0 ? top : low, along);
    });
    if (dogHead.current) dogHead.current.rotation.y = dogLook(time, still);
  });
  return (
    <group ref={board} name="paddleboarder">
      <mesh geometry={shapes.board} material={material} />
      <group ref={torso} position={[0, HIP_Y, FEET_Z]}>
        <mesh geometry={shapes.torso} material={material} />
      </group>
      <mesh ref={shaft} geometry={shapes.shaft} material={material} />
      <mesh ref={blade} geometry={shapes.blade} material={material} />
      {arms.map((arm, i) => (
        <mesh key={i} ref={arm} geometry={shapes.arm} material={material} />
      ))}
      <group ref={dogHead} position={[0, DECK_Y + 0.3, DOG_Z + 0.12]}>
        <mesh geometry={shapes.dogHead} material={material} />
      </group>
    </group>
  );
}
