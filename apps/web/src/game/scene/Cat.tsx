import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FIRESIDE_AT, FIRESIDE_YAW, NAP_AT, catAt, type CatPlace } from "./catNap";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const FUR = "#d4893a";
const STRIPE = "#a8622a";
const WHITE = "#f1e6d4";
const DARK = "#2a1d14";
const PINK = "#d98a8a";
/** A touch larger than life, so it reads from the shack's view. */
const SCALE = 1.5;
/** It naps with its back to the shack, half turned toward the water. */
const NAP_YAW = -0.6;

/** The head, its own shape so it can lift and turn: ears, eyes, a pale muzzle and a pink nose, facing +z. */
function headShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 12, 10), scale: [0.065, 0.058, 0.06], color: FUR },
    { geometry: new THREE.SphereGeometry(1, 8, 6), position: [0, -0.018, 0.045], scale: [0.032, 0.024, 0.025], color: WHITE },
    { geometry: new THREE.SphereGeometry(0.008, 6, 4), position: [0, -0.008, 0.068], color: PINK },
    ...[-1, 1].flatMap((side) => [
      { geometry: new THREE.ConeGeometry(0.024, 0.05, 4), position: [side * 0.036, 0.058, -0.004] as const, rotation: [0, 0, side * -0.3] as const, color: FUR },
      { geometry: new THREE.SphereGeometry(0.009, 6, 4), position: [side * 0.025, 0.012, 0.052] as const, color: DARK },
    ]),
  ]);
}

/** Curled up asleep: a round, low body with the tail wrapped round the front, head resting at one end. */
function napBody() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 12, 10), position: [0, 0.07, 0], scale: [0.13, 0.075, 0.17], color: FUR },
    { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.12, -0.02], scale: [0.09, 0.03, 0.1], color: STRIPE },
    { geometry: new THREE.TorusGeometry(0.15, 0.028, 6, 14, Math.PI * 1.1), position: [0, 0.025, 0.02], rotation: [Math.PI / 2, 0, 0.4], color: FUR },
  ]);
}

/** Sitting up: an upright body on its haunches with white front paws and the tail round its feet. */
function sitBody() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 12, 10), position: [0, 0.14, -0.02], scale: [0.095, 0.15, 0.11], color: FUR },
    { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.18, 0.05], scale: [0.06, 0.09, 0.05], color: WHITE },
    ...[-1, 1].map((side) => ({ geometry: new THREE.SphereGeometry(1, 8, 6), position: [side * 0.035, 0.02, 0.08] as const, scale: [0.025, 0.02, 0.035] as const, color: WHITE })),
    { geometry: new THREE.TorusGeometry(0.11, 0.022, 6, 14, Math.PI * 1.2), position: [0, 0.02, 0], rotation: [Math.PI / 2, 0, -0.3], color: FUR },
  ]);
}

/** The tail's last few centimetres, which twitch while it dozes. */
function tipShape() {
  return mergePainted([{ geometry: new THREE.CylinderGeometry(0.018, 0.024, 0.09, 6), position: [0, 0.045, 0], color: STRIPE }]);
}

const POSES = {
  nap: { at: NAP_AT, yaw: NAP_YAW, head: [0.02, 0.1, 0.16], headUp: 0.06, tip: [0.15, 0.03, 0.07], tipLean: 1.2 },
  fireside: { at: FIRESIDE_AT, yaw: FIRESIDE_YAW, head: [0, 0.33, 0.04], headUp: 0, tip: [-0.1, 0.02, 0.06], tipLean: 1.3 },
} as const;

/** The shack's ginger cat: napping on the grass by day, sitting up by the campfire while it burns. */
export function Cat({ place }: { place: CatPlace }) {
  const still = useReducedMotion();
  const head = useRef<THREE.Group>(null);
  const tip = useRef<THREE.Group>(null);
  const shapes = useMemo(() => ({ head: headShape(), nap: napBody(), fireside: sitBody(), tip: tipShape() }), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      [shapes.head, shapes.nap, shapes.fireside, shapes.tip, material].forEach((item) => item.dispose());
    },
    [shapes, material],
  );
  const pose = POSES[place];
  useFrame(({ clock }) => {
    const move = catAt(clock.elapsedTime, still);
    // By the fire it sits watching the flames, only its tail tip moving.
    const look = place === "nap" ? move.look : 0;
    const turn = place === "nap" ? move.turn : move.turn * 0.3;
    if (head.current) {
      head.current.position.y = pose.head[1] + look * pose.headUp;
      head.current.rotation.set(-0.25 * (1 - look) * (place === "nap" ? 1 : 0), turn, (place === "nap" ? 0.35 : 0) * (1 - look));
    }
    if (tip.current) tip.current.rotation.set(0, 0, pose.tipLean + move.flick);
  });
  return (
    <group name="cat" position={[pose.at.x, 0, pose.at.z]} rotation={[0, pose.yaw, 0]} scale={SCALE}>
      <mesh geometry={shapes[place]} material={material} castShadow />
      <group ref={head} position={[pose.head[0], pose.head[1], pose.head[2]]}>
        <mesh geometry={shapes.head} material={material} castShadow />
      </group>
      <group ref={tip} position={[pose.tip[0], pose.tip[1], pose.tip[2]]}>
        <mesh geometry={shapes.tip} material={material} />
      </group>
    </group>
  );
}
