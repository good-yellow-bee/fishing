import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { anglerPose } from "./pose";
import { anglerAshore } from "./bankAngler";
import { hopAt, hopStart, hopStep, type HopState } from "./robinHop";
import type { ScenePhase } from "./types";
import { robinAt, robinVisitIndex, type RobinPose } from "./robinVisit";
import { toonRamp } from "./toon";
import { useSkinnedFigure } from "./skinFigure";

const DARK = "#22201e";

/** A bird's colours and size: the robin, or the blackbird out in the rain. */
export type BirdLook = { back: string; breast: string; belly: string; bill: string; eye: string; scale: number };
/** Larger than life, so it reads from behind the angler. */
export const ROBIN: BirdLook = { back: "#7a5f44", breast: "#e0662e", belly: "#efe6da", bill: DARK, eye: DARK, scale: 2.2 };
/** All black but its orange-yellow bill and eye ring, and a little bigger. */
export const BLACKBIRD: BirdLook = { back: "#1d1b1c", breast: "#232022", belly: "#2b2829", bill: "#e9a41f", eye: "#e9a41f", scale: 2.6 };

/** The round body and legs, the breast to the front (+z). */
export function robinBodyShape(look = ROBIN) {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 12, 10), position: [0, 0.05, 0], scale: [0.04, 0.042, 0.05], color: look.back },
    { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.05, 0.016], scale: [0.034, 0.036, 0.036], color: look.breast },
    { geometry: new THREE.SphereGeometry(1, 8, 6), position: [0, 0.03, 0.012], scale: [0.03, 0.022, 0.03], color: look.belly },
    ...[-0.012, 0.012].map((x) => ({ geometry: new THREE.CylinderGeometry(0.0025, 0.0025, 0.022, 4), position: [x, 0.006, 0.004] as const, color: DARK })),
  ]);
}

/** The head with its face, eyes and fine bill, from the neck. */
export function robinHeadShape(look = ROBIN) {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(0.026, 10, 8), position: [0, 0.012, 0], color: look.back },
    { geometry: new THREE.SphereGeometry(0.022, 8, 6), position: [0, 0.008, 0.008], color: look.breast },
    ...[-1, 1].map((side) => ({ geometry: new THREE.SphereGeometry(0.005, 5, 4), position: [side * 0.017, 0.016, 0.014] as const, color: look.eye })),
    { geometry: new THREE.ConeGeometry(0.005, 0.016, 5), position: [0, 0.01, 0.032], rotation: [Math.PI / 2, 0, 0], color: look.bill },
  ]);
}

/** The tail, from where it joins the body. */
export function robinTailShape(look = ROBIN) {
  return mergePainted([{ geometry: new THREE.BoxGeometry(0.026, 0.006, 0.05), position: [0, 0, -0.025], color: look.back }]);
}

/** A robin's (or a blackbird's) figure, posed each frame by `poseAt` (a RobinPose at the clock's time): one skinned draw and its wings. */
function RobinBird({ name, poseAt, look = ROBIN }: { name: string; poseAt: (time: number) => RobinPose; look?: BirdLook }) {
  const bird = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const wings = useRef<THREE.Group>(null);
  const shapes = useMemo(() => ({ body: robinBodyShape(look), head: robinHeadShape(look), tail: robinTailShape(look), wing: new THREE.SphereGeometry(1, 8, 6) }), [look]);
  const materials = useMemo(
    () => ({ painted: new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), wing: new THREE.MeshToonMaterial({ color: look.back, gradientMap: toonRamp() }) }),
    [look],
  );
  useEffect(
    () => () => {
      [...Object.values(shapes), ...Object.values(materials)].forEach((item) => item.dispose());
    },
    [shapes, materials],
  );
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const pose = poseAt(time);
    const group = bird.current;
    if (!group) return;
    group.visible = pose.here;
    if (!pose.here) return;
    group.position.set(pose.x, pose.y, pose.z);
    group.rotation.y = pose.yaw;
    // In flight it leans forward into the beat of its wings.
    group.rotation.x = pose.flying * 0.35;
    if (head.current) head.current.rotation.y = pose.look;
    if (tail.current) tail.current.rotation.x = -0.35 - pose.flick * 0.6;
    if (wings.current) {
      wings.current.visible = pose.flying > 0;
      const beat = Math.sin(time * 48) * 0.9;
      wings.current.children[0]?.rotation.set(0, 0, beat);
      wings.current.children[1]?.rotation.set(0, 0, -beat);
    }
  });
  useSkinnedFigure(bird, materials.painted);

  return (
    <group ref={bird} name={name} visible={false}>
      <group scale={look.scale}>
        <mesh geometry={shapes.body} material={materials.painted} castShadow />
        <group ref={head} position={[0, 0.088, 0.012]}>
          <mesh geometry={shapes.head} material={materials.painted} />
        </group>
        <group ref={tail} position={[0, 0.045, -0.04]}>
          <mesh geometry={shapes.tail} material={materials.painted} />
        </group>
        <group ref={wings} position={[0, 0.06, 0]} visible={false}>
          {[1, -1].map((side) => (
            <group key={side} position={[side * 0.03, 0, 0]}>
              <mesh geometry={shapes.wing} material={materials.wing} position={[side * 0.045, 0, -0.005]} scale={[0.05, 0.006, 0.03]} />
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}

/** Dock-robin visits (robinVisit.ts numbers) the ground robin was out during: the dock robin sits those out, so there is only ever one robin. */
const sharedVisits = new Set<number>();

/** A robin dropping in on the dock's front posts, startled off early by a strike (robinVisit.ts). */
export function DockRobin({ snow, startledAt }: { snow: boolean; startledAt: Readonly<{ current: number }> }) {
  const still = useReducedMotion();
  const poseAt = useCallback(
    (time: number) => {
      const pose = robinAt(time, snow, still, startledAt.current);
      return sharedVisits.has(robinVisitIndex(time)) ? { ...pose, here: false } : pose;
    },
    [snow, still, startledAt],
  );
  return <RobinBird name="dock-robin" poseAt={poseAt} />;
}

/** The robin coming to the angler's feet while they stand ashore by day, off the dock and out of the boat (robinHop.ts). */
export function GroundRobin({ phase }: { phase: ScenePhase }) {
  const still = useReducedMotion();
  const state = useRef<HopState | null>(null);
  const lastPhase = useRef(phase);
  const poseAt = useCallback(
    (time: number) => {
      const ashore = anglerAshore();
      const struck = phase === "fight" && lastPhase.current !== "fight";
      lastPhase.current = phase;
      const world = { dockRobinHere: robinAt(time).here && !sharedVisits.has(robinVisitIndex(time)), struck, still };
      state.current = hopStep(state.current ?? hopStart(time), time, anglerPose, ashore, world);
      if (state.current.mode !== "away") sharedVisits.add(robinVisitIndex(time));
      return hopAt(state.current, time, still);
    },
    [still, phase],
  );
  return <RobinBird name="ground-robin" poseAt={poseAt} />;
}

/** A blackbird out on the bank behind the angler on wet days, hopping about and tugging at worms; the robin's hops (robinHop.ts). */
export function GroundBlackbird({ phase }: { phase: ScenePhase }) {
  const still = useReducedMotion();
  const state = useRef<HopState | null>(null);
  const lastPhase = useRef(phase);
  const poseAt = useCallback(
    (time: number) => {
      const struck = phase === "fight" && lastPhase.current !== "fight";
      lastPhase.current = phase;
      state.current = hopStep(state.current ?? hopStart(time), time, anglerPose, anglerAshore(), { dockRobinHere: false, struck, still });
      return hopAt(state.current, time, still);
    },
    [still, phase],
  );
  return <RobinBird name="ground-blackbird" poseAt={poseAt} look={BLACKBIRD} />;
}
