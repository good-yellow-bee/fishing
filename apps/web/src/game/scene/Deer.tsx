import { useRef } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { fx } from "../fx";
import { lastSplash } from "./duckFlush";
import { deerPose, stepDeer, type DeerState } from "./deerMotion";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const COAT = "#8b5a36";
const BELLY = "#d8bf9f";
const DARK = "#2e2119";
const TAIL = "#f1ece4";
/** Drawn larger than life so it reads across the lake. */
const DEER_SCALE = 2;
/** From the deer's feet to its muzzle at the water, along its heading, before scale. */
const MUZZLE_REACH = 0.6;
/** Neck tilt from upright: alert, and down at the water. */
const NECK_UP = 0.35;
const NECK_DOWN = 2.4;

const LEGS: Array<[number, number]> = [
  [0.1, 0.34],
  [-0.1, 0.34],
  [0.1, -0.34],
  [-0.1, -0.34],
];

function Part({ color, ...props }: { color: string } & ThreeElements["mesh"]) {
  return (
    <mesh {...props}>
      {props.children}
      <meshToonMaterial color={color} gradientMap={toonRamp()} />
    </mesh>
  );
}

/** A deer that walks down to drink on the far bank; motion lives in deerMotion.ts. */
export function Deer() {
  const body = useRef<THREE.Group>(null);
  const neck = useRef<THREE.Group>(null);
  const legs = useRef<Array<THREE.Group | null>>([]);
  const ring = useRef<THREE.Mesh>(null);
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const state = useRef<DeerState>({ mode: "visiting" });
  const still = useReducedMotion();

  useFrame((frame) => {
    const deer = body.current;
    if (!deer) return;
    const time = frame.clock.elapsedTime;
    const next = stepDeer(state.current, time, lastSplash, still);
    if (next.mode === "fled" && state.current.mode !== "fled") fx.snort();
    state.current = next;
    const pose = deerPose(time, state.current, still);
    deer.visible = !pose.hidden;
    deer.position.set(pose.x, 0, pose.z);
    deer.rotation.y = pose.yaw;
    if (neck.current) neck.current.rotation.x = NECK_UP + (NECK_DOWN - NECK_UP) * pose.head;
    legs.current.forEach((leg, i) => {
      // Diagonal pairs swing together, as a walking deer's do.
      if (leg) leg.rotation.x = Math.sin(pose.gait + (i === 0 || i === 3 ? 0 : Math.PI)) * (pose.gait === 0 ? 0 : 0.45);
    });
    if (ring.current && ringMaterial.current) {
      ring.current.visible = pose.ring >= 0 && !pose.hidden;
      if (pose.ring >= 0) {
        const reach = MUZZLE_REACH * DEER_SCALE;
        const x = pose.x + Math.sin(pose.yaw) * reach;
        const z = pose.z + Math.cos(pose.yaw) * reach;
        ring.current.position.set(x, waterHeight(x, z, time) + 0.03, z);
        ring.current.scale.setScalar(0.15 + pose.ring * 0.9);
        ringMaterial.current.opacity = (1 - pose.ring) * 0.55;
      }
    }
  });

  return (
    <>
      <group ref={body} name="deer" scale={DEER_SCALE} visible={false}>
        {/* Barrel of the body, facing +z, with a paler belly. */}
        <Part color={COAT} position={[0, 0.55, 0]} scale={[0.17, 0.17, 0.42]}>
          <sphereGeometry args={[1, 12, 8]} />
        </Part>
        <Part color={BELLY} position={[0, 0.47, 0]} scale={[0.13, 0.1, 0.32]}>
          <sphereGeometry args={[1, 10, 6]} />
        </Part>
        <Part color={TAIL} position={[0, 0.62, -0.42]} rotation={[-0.6, 0, 0]} scale={[0.04, 0.07, 0.03]}>
          <sphereGeometry args={[1, 6, 4]} />
        </Part>
        {LEGS.map(([x, z], i) => (
          <group
            key={i}
            position={[x, 0.47, z]}
            ref={(leg) => {
              legs.current[i] = leg;
            }}
          >
            <Part color={COAT} position={[0, -0.23, 0]}>
              <cylinderGeometry args={[0.04, 0.028, 0.46, 6]} />
            </Part>
            <Part color={DARK} position={[0, -0.45, 0]}>
              <cylinderGeometry args={[0.03, 0.032, 0.04, 6]} />
            </Part>
          </group>
        ))}
        {/* Neck and head hinge at the shoulders, so the head can drop to the water. */}
        <group ref={neck} position={[0, 0.62, 0.32]}>
          <Part color={COAT} position={[0, 0.17, 0]} scale={[0.055, 0.2, 0.065]}>
            <sphereGeometry args={[1, 8, 6]} />
          </Part>
          <group position={[0, 0.36, 0]} rotation={[-NECK_UP + 1.2, 0, 0]}>
            <Part color={COAT} position={[0, 0, 0.04]} scale={[0.075, 0.075, 0.12]}>
              <sphereGeometry args={[1, 8, 6]} />
            </Part>
            <Part color={BELLY} position={[0, -0.03, 0.12]} scale={[0.045, 0.04, 0.05]}>
              <sphereGeometry args={[1, 6, 4]} />
            </Part>
            <Part color={DARK} position={[0, -0.01, 0.165]} scale={[0.028, 0.024, 0.02]}>
              <sphereGeometry args={[1, 6, 4]} />
            </Part>
            {[-1, 1].map((side) => (
              <Part key={side} color={COAT} position={[side * 0.07, 0.07, -0.03]} rotation={[0, 0, side * -0.7]} scale={[0.026, 0.07, 0.014]}>
                <sphereGeometry args={[1, 6, 4]} />
              </Part>
            ))}
          </group>
        </group>
      </group>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.32, 0.38, 24]} />
        <meshBasicMaterial ref={ringMaterial} color="#dcebe7" transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  );
}
