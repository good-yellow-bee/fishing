import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BIRD_COUNT, FEEDER_AT, TRAY_Y, chickadeeAt } from "./feederVisits";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const WOOD = "#7a5638";
const SEED = "#5a4632";
const SNOW = "#eef2f4";
const GREY = "#8c9094";
const BUFF = "#d9c2a0";
const BLACK = "#1d1d20";
const WHITE = "#f4f2ec";
/** Chickadees are tiny; drawn twice life size so they read from the shack. */
const BIRD_SCALE = 2;

/** The post, the seed tray with its rim, and a little snow-capped roof on four corner sticks. */
export function feederShape() {
  const roofRise = 0.14;
  const half = 0.3;
  const slope = Math.atan2(roofRise, half);
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.035, 0.045, TRAY_Y, 6), position: [0, TRAY_Y / 2, 0], color: WOOD },
    { geometry: new THREE.BoxGeometry(0.5, 0.03, 0.5), position: [0, TRAY_Y, 0], color: WOOD },
    ...[-1, 1].flatMap((side) => [
      { geometry: new THREE.BoxGeometry(0.5, 0.05, 0.02), position: [0, TRAY_Y + 0.03, side * 0.24] as const, color: WOOD },
      { geometry: new THREE.BoxGeometry(0.02, 0.05, 0.5), position: [side * 0.24, TRAY_Y + 0.03, 0] as const, color: WOOD },
    ]),
    { geometry: new THREE.CylinderGeometry(0.12, 0.14, 0.03, 10), position: [0, TRAY_Y + 0.025, 0], color: SEED },
    ...[
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ].map(([x, z]) => ({ geometry: new THREE.BoxGeometry(0.02, 0.3, 0.02), position: [x! * 0.23, TRAY_Y + 0.15, z! * 0.23] as const, color: WOOD })),
    ...[-1, 1].map((side) => ({
      geometry: new THREE.BoxGeometry(0.62, 0.04, Math.hypot(half, roofRise) + 0.04),
      position: [0, TRAY_Y + 0.3 + roofRise / 2, (side * half) / 2] as const,
      rotation: [side * slope, 0, 0] as const,
      color: SNOW,
    })),
  ]);
}

/** A black-capped chickadee facing +z: grey back, buff flanks, black cap and bib, white cheeks. */
export function chickadeeShapes() {
  return {
    body: mergePainted([
      { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.035, 0], scale: [0.03, 0.03, 0.042], color: GREY },
      { geometry: new THREE.SphereGeometry(1, 8, 6), position: [0, 0.028, 0.008], scale: [0.027, 0.024, 0.034], color: BUFF },
      { geometry: new THREE.BoxGeometry(0.02, 0.006, 0.05), position: [0, 0.04, -0.06], rotation: [0.25, 0, 0], color: GREY },
    ]),
    head: mergePainted([
      { geometry: new THREE.SphereGeometry(0.022, 10, 8), color: WHITE },
      { geometry: new THREE.SphereGeometry(0.023, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.45), position: [0, 0.002, -0.002], color: BLACK },
      { geometry: new THREE.SphereGeometry(1, 8, 6), position: [0, -0.014, 0.012], scale: [0.012, 0.01, 0.01], color: BLACK },
      { geometry: new THREE.ConeGeometry(0.005, 0.014, 4), position: [0, -0.002, 0.026], rotation: [Math.PI / 2, 0, 0], color: BLACK },
    ]),
    wing: mergePainted([{ geometry: new THREE.BoxGeometry(0.045, 0.004, 0.035), position: [0.022, 0, 0], color: GREY }]),
  };
}

type BirdParts = { root: THREE.Group | null; head: THREE.Group | null; wings: (THREE.Group | null)[] };

/** In winter, a bird feeder on a post by the shack, with chickadees coming and going (`birds`). */
export function BirdFeeder({ birds }: { birds: boolean }) {
  const still = useReducedMotion();
  const feeder = useMemo(feederShape, []);
  const bird = useMemo(chickadeeShapes, []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const parts = useMemo<BirdParts[]>(() => Array.from({ length: BIRD_COUNT }, () => ({ root: null, head: null, wings: [null, null] })), []);
  useEffect(
    () => () => {
      [feeder, bird.body, bird.head, bird.wing, material].forEach((item) => item.dispose());
    },
    [feeder, bird, material],
  );
  useFrame(({ clock }) => {
    if (!birds) return;
    const time = still ? 1 : clock.elapsedTime;
    parts.forEach((part, i) => {
      if (!part.root) return;
      const pose = chickadeeAt(i, time);
      part.root.visible = !pose.away;
      part.root.position.set(pose.x, pose.y, pose.z);
      part.root.rotation.y = pose.yaw;
      if (part.head) part.head.rotation.x = pose.peck * 0.9;
      const beat = pose.flying * Math.sin(time * 60) * 0.9;
      part.wings.forEach((wing, side) => {
        if (!wing) return;
        // Folded along the back on the tray; beating out to the sides in flight.
        wing.rotation.set(0, side === 0 ? 1.4 * (1 - pose.flying) : Math.PI - 1.4 * (1 - pose.flying), beat);
      });
    });
  });
  return (
    <group name="bird-feeder">
      <mesh geometry={feeder} material={material} position={[FEEDER_AT.x, 0, FEEDER_AT.z]} castShadow />
      {birds &&
        parts.map((part, i) => (
          <group
            key={i}
            ref={(node) => {
              part.root = node;
            }}
            scale={BIRD_SCALE}
          >
            <mesh geometry={bird.body} material={material} />
            <group
              ref={(node) => {
                part.head = node;
              }}
              position={[0, 0.062, 0.03]}
            >
              <mesh geometry={bird.head} material={material} />
            </group>
            {[0, 1].map((side) => (
              <group
                key={side}
                ref={(node) => {
                  part.wings[side] = node;
                }}
                position={[side === 0 ? 0.02 : -0.02, 0.045, 0]}
              >
                <mesh geometry={bird.wing} material={material} />
              </group>
            ))}
          </group>
        ))}
    </group>
  );
}
