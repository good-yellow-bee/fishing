import { useRef } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { DOCK_STAND_X, DOCK_STAND_Z } from "@stillwater/shared";
import { foxAt } from "./foxTrot";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const COAT = "#c4622d";
const WHITE = "#f1ece4";
const DARK = "#2a1d16";
/** Drawn larger than life so it reads across the lake. */
const FOX_SCALE = 2.4;
/** How far it can turn its head to look across. */
const LOOK_MAX = 1.5;

const LEGS: Array<[number, number]> = [
  [0.06, 0.16],
  [-0.06, 0.16],
  [0.06, -0.16],
  [-0.06, -0.16],
];

function Part({ color, ...props }: { color: string } & ThreeElements["mesh"]) {
  return (
    <mesh {...props}>
      {props.children}
      <meshToonMaterial color={color} gradientMap={toonRamp()} />
    </mesh>
  );
}

/** A red fox trotting along the far bank at dusk and after dark; motion lives in foxTrot.ts. */
export function Fox() {
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const legs = useRef<Array<THREE.Group | null>>([]);
  const still = useReducedMotion();

  useFrame((frame) => {
    const fox = body.current;
    if (!fox) return;
    const time = frame.clock.elapsedTime;
    const pose = foxAt(time, still);
    fox.visible = !pose.hidden;
    if (pose.hidden) return;
    const trotting = pose.gait !== 0;
    fox.position.set(pose.x, trotting ? Math.abs(Math.sin(pose.gait)) * 0.03 : 0, pose.z);
    fox.rotation.y = pose.yaw;
    if (head.current) {
      // Turns to look across at the dock, as far as its neck allows.
      let toDock = Math.atan2(DOCK_STAND_X - pose.x, DOCK_STAND_Z - pose.z) - pose.yaw;
      toDock = Math.atan2(Math.sin(toDock), Math.cos(toDock));
      head.current.rotation.y = Math.max(-LOOK_MAX, Math.min(LOOK_MAX, toDock)) * pose.look;
    }
    if (tail.current) tail.current.rotation.y = trotting ? Math.sin(pose.gait * 0.5) * 0.25 : Math.sin(time * 1.3) * 0.1;
    legs.current.forEach((leg, i) => {
      // A trot: diagonal pairs swing together.
      if (leg) leg.rotation.x = trotting ? Math.sin(pose.gait + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.6 : 0;
    });
  });

  return (
    <group ref={body} name="fox" scale={FOX_SCALE} visible={false}>
      <Part color={COAT} position={[0, 0.2, 0]} scale={[0.07, 0.07, 0.18]}>
        <sphereGeometry args={[1, 10, 8]} />
      </Part>
      <Part color={WHITE} position={[0, 0.17, 0.1]} scale={[0.05, 0.05, 0.07]}>
        <sphereGeometry args={[1, 8, 6]} />
      </Part>
      {LEGS.map(([x, z], i) => (
        <group
          key={i}
          position={[x, 0.17, z]}
          ref={(leg) => {
            legs.current[i] = leg;
          }}
        >
          <Part color={DARK} position={[0, -0.085, 0]}>
            <cylinderGeometry args={[0.016, 0.012, 0.17, 6]} />
          </Part>
        </group>
      ))}
      {/* A bushy tail held low behind, white at the tip. */}
      <group ref={tail} position={[0, 0.2, -0.17]}>
        <Part color={COAT} position={[0, -0.03, -0.12]} rotation={[0.5, 0, 0]} scale={[0.045, 0.045, 0.13]}>
          <sphereGeometry args={[1, 8, 6]} />
        </Part>
        <Part color={WHITE} position={[0, -0.09, -0.24]} rotation={[0.5, 0, 0]} scale={[0.03, 0.03, 0.04]}>
          <sphereGeometry args={[1, 6, 4]} />
        </Part>
      </group>
      <group ref={head} position={[0, 0.27, 0.17]}>
        <Part color={COAT} position={[0, 0, 0.02]} scale={[0.06, 0.055, 0.06]}>
          <sphereGeometry args={[1, 8, 6]} />
        </Part>
        <Part color={WHITE} position={[0, -0.02, 0.07]} scale={[0.035, 0.025, 0.04]}>
          <sphereGeometry args={[1, 6, 4]} />
        </Part>
        <Part color={COAT} position={[0, -0.005, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.022, 0.07, 6]} />
        </Part>
        <Part color={DARK} position={[0, -0.005, 0.138]} scale={0.011}>
          <sphereGeometry args={[1, 6, 4]} />
        </Part>
        {[-1, 1].map((side) => (
          <Part key={side} color={DARK} position={[side * 0.032, 0.06, 0.0]} rotation={[0, 0, side * -0.25]}>
            <coneGeometry args={[0.018, 0.05, 4]} />
          </Part>
        ))}
      </group>
    </group>
  );
}
