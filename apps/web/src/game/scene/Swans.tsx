import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { swanPose } from "./swanGlide";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const WHITE = "#f1f0ea";
const BEAK = "#d9682b";
const KNOB = "#1c1a18";
const WAKE = "#dcebe7";
/** The wake's two arms, each this far off the line it glides and this long. */
const WAKE_SPREAD = 0.3;
const WAKE_LENGTH = 2.6;

/** One swan: a deep white body with raised wings, and an S of neck hinged at its base so it can tip under to feed. */
function SwanBody({ neck }: { neck: (g: THREE.Group | null) => void }) {
  return (
    <>
      <mesh position={[0, 0.12, 0]} scale={[0.26, 0.17, 0.5]}>
        <sphereGeometry args={[1, 14, 10]} />
        <meshToonMaterial color={WHITE} gradientMap={toonRamp()} />
      </mesh>
      {/* Folded wings held up over the back, the mute swan's arch. */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.13, 0.24, -0.08]} rotation={[0.25, 0, side * 0.35]} scale={[0.1, 0.1, 0.36]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshToonMaterial color={WHITE} gradientMap={toonRamp()} />
        </mesh>
      ))}
      <mesh position={[0, 0.2, -0.46]} rotation={[0.7, 0, 0]} scale={[0.08, 0.05, 0.14]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshToonMaterial color={WHITE} gradientMap={toonRamp()} />
      </mesh>
      <group ref={neck} position={[0, 0.18, 0.38]}>
        <mesh position={[0, 0.16, 0.02]} rotation={[-0.25, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.065, 0.36, 8]} />
          <meshToonMaterial color={WHITE} gradientMap={toonRamp()} />
        </mesh>
        <mesh position={[0, 0.36, -0.02]} rotation={[0.35, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.045, 0.14, 8]} />
          <meshToonMaterial color={WHITE} gradientMap={toonRamp()} />
        </mesh>
        <mesh position={[0, 0.44, 0.02]} scale={[0.055, 0.05, 0.08]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshToonMaterial color={WHITE} gradientMap={toonRamp()} />
        </mesh>
        <mesh position={[0, 0.425, 0.13]} rotation={[Math.PI / 2 + 0.35, 0, 0]}>
          <coneGeometry args={[0.025, 0.11, 6]} />
          <meshToonMaterial color={BEAK} gradientMap={toonRamp()} />
        </mesh>
        <mesh position={[0, 0.455, 0.085]} scale={0.022}>
          <sphereGeometry args={[1, 6, 5]} />
          <meshBasicMaterial color={KNOB} />
        </mesh>
      </group>
    </>
  );
}

/** A pair of swans gliding the far water, each with its wake; motion lives in swanGlide.ts. */
export function Swans() {
  const swans = useRef<(THREE.Group | null)[]>([]);
  const necks = useRef<(THREE.Group | null)[]>([]);
  const wakes = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    for (const k of [0, 1] as const) {
      const swan = swans.current[k];
      const wake = wakes.current[k];
      if (!swan || !wake) continue;
      const pose = swanPose(k, time);
      const surface = waterHeight(pose.x, pose.z, time);
      swan.position.set(pose.x, surface - 0.04, pose.z);
      // Bottoms up while it feeds: the body tips forward as the neck goes under.
      swan.rotation.set(pose.dip * 0.5, pose.yaw, 0, "YXZ");
      const neck = necks.current[k];
      if (neck) neck.rotation.x = pose.dip * 1.9;
      wake.position.set(pose.x, surface + 0.04, pose.z);
      wake.rotation.y = pose.yaw;
    }
  });
  return (
    <>
      {[0, 1].map((k) => (
        <group key={k}>
          <group ref={(g) => void (swans.current[k] = g)} name="swan" scale={k === 0 ? 1.5 : 1.38}>
            <SwanBody neck={(g) => void (necks.current[k] = g)} />
          </group>
          <group ref={(g) => void (wakes.current[k] = g)}>
            {[-1, 1].map((side) => (
              <mesh
                key={side}
                position={[side * Math.sin(WAKE_SPREAD) * (WAKE_LENGTH / 2), 0, 0.3 - Math.cos(WAKE_SPREAD) * (WAKE_LENGTH / 2)]}
                rotation={[-Math.PI / 2, 0, side * WAKE_SPREAD]}
                renderOrder={4}
              >
                <planeGeometry args={[0.22, WAKE_LENGTH]} />
                <meshBasicMaterial color={WAKE} transparent opacity={0.28} depthWrite={false} />
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </>
  );
}
