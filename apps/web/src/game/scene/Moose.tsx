import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { lastSplash } from "./duckFlush";
import { mergePainted } from "./mergeParts";
import { moosePose, stepMoose, type MooseState } from "./mooseWade";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const COAT = "#3b2a1f";
const DARK = "#241912";
const MUZZLE = "#52392a";
const SHANK = "#a39178";
const ANTLER = "#cbb68e";
/** Drawn larger than life, as the deer is, so it reads across the lake. */
const MOOSE_SCALE = 2.3;
/** Neck tilt from level: chewing with the head up, and down into the water. */
const NECK_UP = -0.15;
const NECK_DOWN = 1.55;
/** From the hooves to the muzzle along its heading, before scale, with the head down. */
const MUZZLE_REACH = 0.72;

const LEGS: Array<[number, number]> = [
  [0.1, 0.32],
  [-0.1, 0.32],
  [0.1, -0.3],
  [-0.1, -0.3],
];

const S = (w: number, h: number) => new THREE.SphereGeometry(1, w, h);

/** Parts that never move apart bake into one shape each: the body, one leg (drawn four times), and the head with its antlers. */
export function mooseShapes(antlers: boolean) {
  const palms = antlers
    ? [-1, 1].flatMap((side) => [
        { geometry: new THREE.CylinderGeometry(0.012, 0.016, 0.14, 5), position: [side * 0.09, 0.12, 0.2] as const, rotation: [0, 0, side * -1.1] as const, color: ANTLER },
        { geometry: S(8, 5), position: [side * 0.19, 0.17, 0.18] as const, rotation: [0.2, 0, side * -0.35] as const, scale: [0.13, 0.018, 0.085] as const, color: ANTLER },
      ])
    : [];
  return {
    // Long legs carry a deep barrel with the hump over the shoulders and a smaller rump.
    body: mergePainted([
      { geometry: S(12, 9), position: [0, 0.72, 0], scale: [0.2, 0.21, 0.42], color: COAT },
      { geometry: S(10, 8), position: [0, 0.87, 0.22], scale: [0.17, 0.16, 0.2], color: COAT },
      { geometry: S(10, 8), position: [0, 0.74, -0.32], scale: [0.18, 0.18, 0.15], color: DARK },
      { geometry: S(6, 4), position: [0, 0.78, -0.46], rotation: [-0.5, 0, 0], scale: [0.03, 0.05, 0.03], color: DARK },
    ]),
    // Dark upper leg, the pale "stockings" below, and the hoof.
    leg: mergePainted([
      { geometry: new THREE.CylinderGeometry(0.06, 0.042, 0.28, 6), position: [0, -0.14, 0], color: COAT },
      { geometry: new THREE.CylinderGeometry(0.037, 0.031, 0.25, 6), position: [0, -0.4, 0], color: SHANK },
      { geometry: new THREE.CylinderGeometry(0.035, 0.039, 0.05, 6), position: [0, -0.55, 0], color: DARK },
    ]),
    // A short thick neck, the long drooping head with its overhanging muzzle, the bell under the throat, ears and antlers.
    head: mergePainted([
      { geometry: S(8, 6), position: [0, 0.02, 0.1], scale: [0.09, 0.1, 0.15], color: COAT },
      { geometry: S(10, 7), position: [0, 0.02, 0.33], scale: [0.075, 0.085, 0.19], color: COAT },
      { geometry: S(8, 6), position: [0, -0.02, 0.5], scale: [0.075, 0.075, 0.08], color: MUZZLE },
      { geometry: S(6, 4), position: [0, -0.03, 0.57], scale: [0.04, 0.03, 0.02], color: DARK },
      { geometry: S(6, 4), position: [0, -0.15, 0.2], scale: [0.025, 0.08, 0.03], color: DARK },
      ...[-1, 1].map((side) => ({ geometry: S(6, 4), position: [side * 0.07, 0.1, 0.17] as const, rotation: [0, 0, side * -0.8] as const, scale: [0.02, 0.055, 0.03] as const, color: COAT })),
      ...palms,
    ]),
  };
}

/** A bull moose wading out to feed in the east shallows; motion lives in mooseWade.ts. */
export function Moose({ antlers }: { antlers: boolean }) {
  const root = useRef<THREE.Group>(null);
  const neck = useRef<THREE.Group>(null);
  const legs = useRef<Array<THREE.Group | null>>([]);
  const ring = useRef<THREE.Mesh>(null);
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const state = useRef<MooseState>({ mode: "visiting" });
  const still = useReducedMotion();
  const painted = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const shapes = useMemo(() => mooseShapes(antlers), [antlers]);
  useEffect(() => () => painted.dispose(), [painted]);
  useEffect(() => () => Object.values(shapes).forEach((shape) => shape.dispose()), [shapes]);

  useFrame((frame) => {
    const moose = root.current;
    if (!moose) return;
    const time = frame.clock.elapsedTime;
    state.current = stepMoose(state.current, time, lastSplash, still);
    const pose = moosePose(time, state.current, still);
    moose.visible = !pose.hidden;
    if (ring.current) ring.current.visible = false;
    if (pose.hidden) return;
    moose.position.set(pose.x, pose.y, pose.z);
    moose.rotation.y = pose.yaw;
    if (neck.current) neck.current.rotation.x = NECK_UP + (NECK_DOWN - NECK_UP) * pose.head;
    legs.current.forEach((leg, i) => {
      // Diagonal pairs swing together, slow and long-striding.
      if (leg) leg.rotation.x = pose.gait === 0 ? 0 : Math.sin(pose.gait + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.38;
    });
    if (ring.current && ringMaterial.current && pose.ring >= 0) {
      const reach = MUZZLE_REACH * MOOSE_SCALE;
      const x = pose.x + Math.sin(pose.yaw) * reach;
      const z = pose.z + Math.cos(pose.yaw) * reach;
      ring.current.visible = true;
      ring.current.position.set(x, waterHeight(x, z, time) + 0.03, z);
      ring.current.scale.setScalar(0.3 + pose.ring * 1.4);
      ringMaterial.current.opacity = (1 - pose.ring) * 0.6;
    }
  });

  return (
    <>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.32, 0.4, 28]} />
        <meshBasicMaterial ref={ringMaterial} color="#dcebe7" transparent opacity={0} depthWrite={false} />
      </mesh>
      <group ref={root} name="moose" scale={MOOSE_SCALE} visible={false}>
        <mesh geometry={shapes.body} material={painted} castShadow />
        {LEGS.map(([x, z], i) => (
          <group
            key={i}
            position={[x, 0.58, z]}
            ref={(leg) => {
              legs.current[i] = leg;
            }}
          >
            <mesh geometry={shapes.leg} material={painted} />
          </group>
        ))}
        {/* Neck and head hinge at the hump, so the head can go right under. */}
        <group ref={neck} position={[0, 0.88, 0.4]}>
          <mesh geometry={shapes.head} material={painted} />
        </group>
      </group>
    </>
  );
}
