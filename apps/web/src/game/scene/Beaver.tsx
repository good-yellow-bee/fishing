import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { fx } from "../fx";
import { BEAVER_SLAP_SEC, beaverPose, stepBeaver, type BeaverState } from "./beaverSwim";
import { lastSplash } from "./duckFlush";
import { mergePainted, mergeParts } from "./mergeParts";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const FUR = "#5a3b22";
const DARK = "#2e1f14";
const TAIL = "#3a2a20";
const BARK = "#6b5136";
const LEAF = "#5f8a3a";
const WAKE = "#dcebe7";
/** The wake's two arms, each this far off the line it swims and this long. */
const WAKE_SPREAD = 0.4;
const WAKE_LENGTH = 3.2;
const SPRAY = [
  [0.25, 0.9],
  [-0.2, 1.1],
  [0.05, 1.3],
  [-0.3, 0.7],
  [0.32, 1.0],
] as const;

/** Everything but the hinged tail bakes into one shape: back, head, nose, ears, eyes and the leafy branch in its teeth. */
export function beaverShapes() {
  // A leafy branch held crosswise in its teeth, trailing back along one side.
  const branch = mergePainted([
    { geometry: new THREE.CylinderGeometry(0.012, 0.018, 0.75, 6), position: [0.18, 0, -0.32], rotation: [Math.PI / 2, 0, 0.5], color: BARK },
    ...(
      [
        [0.3, 0.03, -0.5],
        [0.38, 0.05, -0.62],
        [0.26, 0.04, -0.66],
        [0.44, 0.02, -0.5],
      ] as const
    ).map((position) => ({ geometry: new THREE.SphereGeometry(1, 7, 5), position, scale: [0.08, 0.04, 0.07] as const, color: LEAF })),
  ]);
  return {
    body: mergeParts([
      // A broad, low back with a darker head held up at the front.
      {
        geometry: mergePainted([
          { geometry: new THREE.SphereGeometry(1, 12, 8), position: [0, 0.03, 0], scale: [0.15, 0.09, 0.26], color: FUR },
          { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.08, 0.27], scale: [0.09, 0.075, 0.1], color: FUR },
          { geometry: new THREE.SphereGeometry(1, 8, 6), position: [0, 0.07, 0.365], scale: [0.05, 0.04, 0.04], color: DARK },
          ...[-1, 1].flatMap((side) => [
            { geometry: new THREE.SphereGeometry(1, 6, 5), position: [side * 0.065, 0.14, 0.24] as const, scale: 0.02, color: DARK },
            { geometry: new THREE.SphereGeometry(1, 6, 5), position: [side * 0.05, 0.12, 0.33] as const, scale: 0.012, color: DARK },
          ]),
        ]),
      },
      { geometry: branch, position: [0.02, 0.06, 0.37], rotation: [0, 0.5, 0] },
    ]),
    tail: new THREE.SphereGeometry(1, 10, 6),
    drop: new THREE.SphereGeometry(1, 6, 5),
  };
}

/** A beaver crossing the lake at dusk with a branch in its teeth; a close cast makes it slap its tail and dive. */
export function Beaver() {
  const group = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const wake = useRef<THREE.Group>(null);
  const splash = useRef<THREE.Group>(null);
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const state = useRef<BeaverState>({ mode: "swimming" });
  const slapped = useRef(-1);
  const shapes = useMemo(beaverShapes, []);
  const looks = useMemo(
    () => ({
      painted: new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }),
      tail: new THREE.MeshToonMaterial({ color: TAIL, gradientMap: toonRamp() }),
      drop: new THREE.MeshBasicMaterial({ color: "#eef6f6", transparent: true, opacity: 0.85 }),
    }),
    [],
  );
  useEffect(
    () => () => {
      [...Object.values(shapes), ...Object.values(looks)].forEach((thing) => thing.dispose());
    },
    [shapes, looks],
  );

  useFrame((frame) => {
    const beaver = group.current;
    if (!beaver) return;
    const time = frame.clock.elapsedTime;
    state.current = stepBeaver(state.current, time, lastSplash);
    const now = state.current;
    if (now.mode === "slapped" && slapped.current !== now.since && time - now.since >= BEAVER_SLAP_SEC * 0.7) {
      slapped.current = now.since;
      fx.tailSlap();
    }
    const pose = beaverPose(time, now);
    beaver.visible = !!pose && pose.under < 1;
    if (wake.current) wake.current.visible = !!pose?.moving;
    if (splash.current) splash.current.visible = !!pose && pose.splash >= 0;
    if (!pose) return;
    const surface = waterHeight(pose.x, pose.z, time);
    // Swims low: only the head, a hump of back and the branch show, bobbing as it paddles.
    beaver.position.set(pose.x, surface - 0.06 - pose.under * 0.4 + Math.sin(time * 4) * 0.01, pose.z);
    beaver.rotation.set(pose.under * 0.6, pose.yaw, 0, "YXZ");
    if (tail.current) tail.current.rotation.x = pose.tail * 1.3;
    if (wake.current) {
      wake.current.position.set(pose.x, surface + 0.05, pose.z);
      wake.current.rotation.y = pose.yaw;
    }
    if (splash.current && ringMaterial.current && pose.splash >= 0) {
      const back = 1;
      splash.current.position.set(pose.x - Math.sin(pose.yaw) * back, surface + 0.03, pose.z - Math.cos(pose.yaw) * back);
      const ring = splash.current.children[0]!;
      ring.scale.setScalar(0.4 + pose.splash * 2.2);
      ringMaterial.current.opacity = (1 - pose.splash) * 0.6;
      splash.current.children.slice(1).forEach((drop, i) => {
        const [side, up] = SPRAY[i]!;
        const k = pose.splash * 1.6;
        drop.visible = k < 1;
        drop.position.set(side * k * 1.2, Math.max(0, up * k * (1 - k) * 2.4), 0.15 * k);
      });
    }
  });

  return (
    <>
      <group ref={group} name="beaver" scale={3}>
        <mesh geometry={shapes.body} material={looks.painted} />
        {/* The flat paddle tail, hinged at the rump so it can swing up for the slap. */}
        <group ref={tail} position={[0, 0.02, -0.24]}>
          <mesh geometry={shapes.tail} material={looks.tail} position={[0, 0, -0.14]} scale={[0.1, 0.018, 0.15]} />
        </group>
      </group>
      <group ref={wake} visible={false}>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * Math.sin(WAKE_SPREAD) * (WAKE_LENGTH / 2), 0, 0.5 - Math.cos(WAKE_SPREAD) * (WAKE_LENGTH / 2)]} rotation={[-Math.PI / 2, 0, side * WAKE_SPREAD]} renderOrder={4}>
            <planeGeometry args={[0.3, WAKE_LENGTH]} />
            <meshBasicMaterial color={WAKE} transparent opacity={0.35} depthWrite={false} />
          </mesh>
        ))}
      </group>
      <group ref={splash} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
          <ringGeometry args={[0.32, 0.42, 28]} />
          <meshBasicMaterial ref={ringMaterial} color={WAKE} transparent opacity={0} depthWrite={false} />
        </mesh>
        {SPRAY.map((_, i) => (
          <mesh key={i} geometry={shapes.drop} material={looks.drop} scale={0.06} />
        ))}
      </group>
    </>
  );
}
