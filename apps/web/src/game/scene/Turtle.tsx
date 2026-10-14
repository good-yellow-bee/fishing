import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { lastSplash } from "./duckFlush";
import { mergePainted, mergeParts } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { BASKING_LOG, stepTurtle, turtleEntry, turtlePose, type TurtleState } from "./turtleMotion";
import { waterHeight } from "./water";

const SHELL = "#4d5a34";
const RIM = "#c9b25a";
const SKIN = "#5f6a3a";
const LOG = "#6b5039";
const LOG_END = "#a88a62";
/** Drawn larger than life so it reads from the dock. */
const TURTLE_SCALE = 2.6;

const FEET = [
  [0.08, 0.06],
  [-0.08, 0.06],
  [0.07, -0.07],
  [-0.07, -0.07],
] as const;

/** The shell, its rim and the four feet never move apart, so they bake into one shape; the head stays apart to reach and tuck. */
export function turtleShell() {
  return mergePainted([
    // A low domed shell over a pale rim, facing +z.
    { geometry: new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, 0.03, 0], scale: [0.09, 0.045, 0.11], color: SHELL },
    { geometry: new THREE.SphereGeometry(1, 12, 6), position: [0, 0.03, 0], scale: [0.095, 0.012, 0.115], color: RIM },
    ...FEET.map(([x, z]) => ({ geometry: new THREE.SphereGeometry(1, 6, 4), position: [x, 0.02, z] as const, scale: [0.028, 0.01, 0.02] as const, color: SKIN })),
  ]);
}

/** The log and its stub of a branch bake into one shape. */
export function baskingLogShape() {
  return mergeParts([
    { geometry: new THREE.CylinderGeometry(0.16, 0.19, BASKING_LOG.length, 9), rotation: [0, 0, Math.PI / 2] },
    { geometry: new THREE.CylinderGeometry(0.025, 0.04, 0.4, 5), position: [-0.4, 0.14, 0.05], rotation: [0.4, 0, 0.9] },
  ]);
}

/** The half-sunk log off the west bank: there all year, a turtle's seat on summer days. */
export function BaskingLog() {
  const wood = useMemo(baskingLogShape, []);
  useEffect(() => () => wood.dispose(), [wood]);
  return (
    <group position={[BASKING_LOG.x, 0.02, BASKING_LOG.z]} rotation={[0, BASKING_LOG.yaw, 0]}>
      {/* Lying along x, tipped so one end sinks under the water. */}
      <group rotation={[0, 0, -0.08]}>
        <mesh geometry={wood} castShadow receiveShadow>
          <meshToonMaterial color={LOG} gradientMap={toonRamp()} />
        </mesh>
        <mesh position={[-BASKING_LOG.length / 2 - 0.001, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <circleGeometry args={[0.17, 9]} />
          <meshToonMaterial color={LOG_END} gradientMap={toonRamp()} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

/** A turtle basking on the log; motion lives in turtleMotion.ts. */
export function Turtle() {
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const shell = useMemo(turtleShell, []);
  const painted = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      shell.dispose();
      painted.dispose();
    },
    [shell, painted],
  );
  const state = useRef<TurtleState>({ mode: "basking" });
  const still = useReducedMotion();

  useFrame((frame) => {
    const turtle = body.current;
    if (!turtle) return;
    const time = frame.clock.elapsedTime;
    state.current = stepTurtle(state.current, time, lastSplash);
    const pose = turtlePose(time, state.current, still);
    turtle.visible = !pose.hidden;
    turtle.position.set(pose.x, pose.y, pose.z);
    turtle.rotation.y = pose.yaw;
    if (head.current) head.current.position.z = 0.085 + pose.neck * 0.05;
    if (ring.current && ringMaterial.current) {
      ring.current.visible = pose.ring >= 0;
      if (pose.ring >= 0) {
        const at = turtleEntry();
        ring.current.position.set(at.x, waterHeight(at.x, at.z, time) + 0.03, at.z);
        ring.current.scale.setScalar(0.3 + pose.ring * 1.2);
        ringMaterial.current.opacity = (1 - pose.ring) * 0.5;
      }
    }
  });

  return (
    <>
      <group ref={body} name="turtle" scale={TURTLE_SCALE}>
        <mesh geometry={shell} material={painted} />
        <group ref={head} position={[0, 0.04, 0.11]}>
          <mesh scale={[0.026, 0.022, 0.034]}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshToonMaterial color={SKIN} gradientMap={toonRamp()} />
          </mesh>
        </group>
      </group>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.32, 0.38, 24]} />
        <meshBasicMaterial ref={ringMaterial} color="#dcebe7" transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  );
}
