import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { hareAt } from "./hareRounds";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const COATS = {
  brown: { fur: "#8b6b4a", pale: "#d8c6a8" },
  white: { fur: "#f2f1ec", pale: "#ffffff" },
} as const;
const DARK = "#2a211a";
const TAIL = "#f6f3ec";
/** Drawn a little larger than life, so it reads from the shack's view. */
const SCALE = 1.6;

/** The body on its haunches, with its forepaws and the white scut, facing +z; its pivot is at the haunch. */
export function hareBody(coat: keyof typeof COATS) {
  const { fur, pale } = COATS[coat];
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 12, 10), position: [0, 0.1, 0.07], scale: [0.085, 0.08, 0.13], color: fur },
    { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.075, 0.1], scale: [0.06, 0.05, 0.09], color: pale },
    { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.11, -0.02], scale: [0.09, 0.09, 0.08], color: fur },
    { geometry: new THREE.SphereGeometry(0.035, 8, 6), position: [0, 0.13, -0.1], color: TAIL },
    ...[-1, 1].flatMap((side) => [
      { geometry: new THREE.BoxGeometry(0.02, 0.045, 0.022), position: [side * 0.032, 0.025, 0.165] as const, color: pale },
    ]),
  ]);
}

/** The big hind feet, which stay flat on the grass while the body rears up over them. */
export function hareFeet(coat: keyof typeof COATS) {
  const { fur } = COATS[coat];
  return mergePainted([-1, 1].map((side) => ({ geometry: new THREE.BoxGeometry(0.032, 0.022, 0.1), position: [side * 0.05, 0.011, 0.02] as const, color: fur })));
}

/** The head with its long, black-tipped ears, eyes and nose, facing +z from the neck. */
export function hareHead(coat: keyof typeof COATS) {
  const { fur, pale } = COATS[coat];
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 12, 10), position: [0, 0, 0.04], scale: [0.048, 0.05, 0.065], color: fur },
    { geometry: new THREE.SphereGeometry(1, 8, 6), position: [0, -0.016, 0.09], scale: [0.026, 0.022, 0.022], color: pale },
    { geometry: new THREE.SphereGeometry(0.008, 6, 4), position: [0, -0.008, 0.108], color: DARK },
    ...[-1, 1].flatMap((side) => [
      { geometry: new THREE.SphereGeometry(0.011, 6, 4), position: [side * 0.035, 0.012, 0.07] as const, color: DARK },
      { geometry: new THREE.BoxGeometry(0.028, 0.13, 0.01), position: [side * 0.022, 0.1, 0.0] as const, rotation: [-0.25, 0, side * -0.18] as const, color: fur },
      { geometry: new THREE.BoxGeometry(0.029, 0.025, 0.012), position: [side * 0.035, 0.165, -0.016] as const, rotation: [-0.25, 0, side * -0.18] as const, color: DARK },
    ]),
  ]);
}

/** A snowshoe hare grazing on the grass west of the shack at dawn and dusk, in its brown or winter-white coat. */
export function Hare({ coat }: { coat: keyof typeof COATS }) {
  const still = useReducedMotion();
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const shapes = useMemo(() => ({ body: hareBody(coat), head: hareHead(coat), feet: hareFeet(coat) }), [coat]);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      shapes.body.dispose();
      shapes.head.dispose();
      shapes.feet.dispose();
    },
    [shapes],
  );
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ clock }) => {
    const pose = hareAt(clock.elapsedTime, still);
    const hare = root.current;
    if (hare) {
      hare.visible = !pose.away;
      hare.position.set(pose.x, pose.y, pose.z);
      hare.rotation.y = pose.yaw;
    }
    if (body.current) {
      // Rears up on its haunches to look round; stretches out long in the air mid-hop.
      body.current.rotation.x = -pose.upright * 0.85 - pose.stretch * 0.15;
      body.current.scale.z = 1 + pose.stretch * 0.22;
    }
    if (head.current) head.current.rotation.x = pose.nibble * 0.75 - pose.upright * 0.2;
  });
  return (
    <group ref={root} name="hare" scale={SCALE}>
      <mesh geometry={shapes.feet} material={material} />
      <group ref={body}>
        <mesh geometry={shapes.body} material={material} castShadow />
        <group ref={head} position={[0, 0.16, 0.17]}>
          <mesh geometry={shapes.head} material={material} />
        </group>
      </group>
    </group>
  );
}
