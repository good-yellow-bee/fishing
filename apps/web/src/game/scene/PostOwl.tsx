import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { owlAt } from "./littleOwl";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { useSkinnedFigure } from "./skinFigure";
import { toonRamp } from "./toon";

const PLUMAGE = "#7b6650";
const SPOT = "#e6dac4";
const BREAST = "#cbb99c";
const STREAK = "#6a5540";
const IRIS = "#f0c22a";
const DARK = "#1a1714";
const FOOT = "#b9ab8a";
/** Larger than life, so it reads from behind the angler in the dark. */
const SCALE = 2.5;

/** The squat body with its pale-spotted back, streaked breast and feathered feet, facing +z. */
export function owlBodyShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 12, 10), position: [0, 0.052, 0], scale: [0.046, 0.055, 0.044], color: PLUMAGE },
    { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.046, 0.014], scale: [0.038, 0.046, 0.034], color: BREAST },
    ...[-0.012, 0, 0.012].map((x, i) => ({ geometry: new THREE.BoxGeometry(0.004, 0.012, 0.003), position: [x, 0.03 + (i % 2) * 0.016, 0.047] as const, color: STREAK })),
    ...[
      [-0.03, 0.07],
      [0.03, 0.07],
      [-0.038, 0.045],
      [0.038, 0.045],
      [0, 0.08],
    ].map(([x, y]) => ({ geometry: new THREE.SphereGeometry(0.0055, 5, 4), position: [x, y, -0.036] as const, color: SPOT })),
    ...[-0.014, 0.014].map((x) => ({ geometry: new THREE.SphereGeometry(1, 6, 4), position: [x, 0.004, 0.016] as const, scale: [0.009, 0.007, 0.012] as const, color: FOOT })),
  ]);
}

/** The broad flat-crowned head: pale brows over big yellow eyes, a short bill. */
export function owlHeadShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 12, 10), position: [0, 0.02, 0], scale: [0.042, 0.034, 0.038], color: PLUMAGE },
    { geometry: new THREE.SphereGeometry(1, 10, 6), position: [0, 0.016, 0.018], scale: [0.034, 0.026, 0.024], color: BREAST },
    ...[-1, 1].flatMap((side) => [
      { geometry: new THREE.BoxGeometry(0.02, 0.005, 0.006), position: [side * 0.014, 0.034, 0.033] as const, rotation: [0, 0, side * -0.25] as const, color: SPOT },
      { geometry: new THREE.SphereGeometry(0.0055, 5, 4), position: [side * 0.022, 0.044, -0.012] as const, color: SPOT },
    ]),
    { geometry: new THREE.ConeGeometry(0.005, 0.012, 5), position: [0, 0.012, 0.042], rotation: [Math.PI / 2 + 0.5, 0, 0], color: FOOT },
  ]);
}

/** Its two staring eyes, round and yellow with black pupils. */
export function owlEyesShape() {
  return mergePainted(
    [-1, 1].flatMap((side) => [
      { geometry: new THREE.SphereGeometry(0.012, 8, 6), position: [side * 0.016, 0.024, 0.036] as const, color: IRIS },
      { geometry: new THREE.SphereGeometry(0.006, 6, 4), position: [side * 0.016, 0.024, 0.0465] as const, color: DARK },
    ]),
  );
}

/** Its lids, drawn over the eyes while it blinks. */
export function owlLidsShape() {
  return mergePainted([-1, 1].map((side) => ({ geometry: new THREE.SphereGeometry(0.013, 8, 6), position: [side * 0.016, 0.024, 0.037] as const, color: PLUMAGE })));
}

/** One broad rounded wing, from the shoulder outward along +x. */
export function owlWingShape(side: number) {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 10, 6), position: [side * 0.065, 0, -0.004], scale: [0.068, 0.007, 0.04], color: PLUMAGE },
    ...[0.04, 0.08, 0.11].map((x) => ({ geometry: new THREE.SphereGeometry(0.006, 5, 3), position: [side * x, 0.005, -0.012] as const, scale: [1, 0.4, 1] as const, color: SPOT })),
  ]);
}

/** A little owl that glides in to the dock's front-left post on some nights, bobs and swivels its head, and glides off (littleOwl.ts). */
export function PostOwl({ snow }: { snow: boolean }) {
  const still = useReducedMotion();
  const bird = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const lids = useRef<THREE.Group>(null);
  const wings = useRef<THREE.Group>(null);
  const shapes = useMemo(
    () => ({ body: owlBodyShape(), head: owlHeadShape(), eyes: owlEyesShape(), lids: owlLidsShape(), left: owlWingShape(1), right: owlWingShape(-1) }),
    [],
  );
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      [...Object.values(shapes), material].forEach((item) => item.dispose());
    },
    [shapes, material],
  );
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const pose = owlAt(time, snow, still);
    const group = bird.current;
    if (!group) return;
    group.visible = pose.here;
    if (!pose.here) return;
    group.position.set(pose.x, pose.y, pose.z);
    group.rotation.y = pose.yaw;
    // Level and outstretched as it glides; it dips forward with each bob on the post.
    group.rotation.x = pose.flying * 0.25;
    if (body.current) body.current.rotation.x = pose.bob * 0.35;
    if (head.current) {
      head.current.rotation.y = pose.look;
      head.current.position.y = 0.098 - pose.bob * 0.014;
    }
    if (eyes.current) eyes.current.visible = !pose.blink;
    if (lids.current) lids.current.visible = pose.blink > 0;
    if (wings.current) {
      wings.current.visible = pose.flying > 0;
      // Soft, deep beats, or held out flat and slightly raised for the glide.
      const beat = pose.flap ? Math.sin(time * 22) * 0.8 : 0.12;
      wings.current.children[0]?.rotation.set(0, 0, beat);
      wings.current.children[1]?.rotation.set(0, 0, -beat);
    }
  });
  useSkinnedFigure(bird, material);

  return (
    <group ref={bird} name="post-owl" visible={false}>
      <group scale={SCALE}>
        <group ref={body}>
          <mesh geometry={shapes.body} material={material} castShadow />
          <group ref={head} position={[0, 0.098, 0.004]}>
            <mesh geometry={shapes.head} material={material} />
            <group ref={eyes}>
              <mesh geometry={shapes.eyes} material={material} />
            </group>
            <group ref={lids} visible={false}>
              <mesh geometry={shapes.lids} material={material} />
            </group>
          </group>
          <group ref={wings} position={[0, 0.07, 0]} visible={false}>
            <group position={[0.035, 0, 0]}>
              <mesh geometry={shapes.left} material={material} />
            </group>
            <group position={[-0.035, 0, 0]}>
              <mesh geometry={shapes.right} material={material} />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
