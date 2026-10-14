import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { grebePose } from "./grebeRush";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const BACK = "#5d5246";
const WHITE = "#efeae0";
const CREST = "#1f1b18";
const RUFF = "#a8542a";
const SPRAY = "#eef6f6";
/** A touch larger than life, so the pair reads from the dock. */
const SCALE = 1.9;
const DROPS = [
  [0.08, -0.22],
  [-0.1, -0.3],
  [0.02, -0.4],
  [-0.05, -0.18],
] as const;

/** A pair of grebes courting in spring: head shakes as they float, and now and then a rush across the water side by side; motion lives in grebeRush.ts. */
export function Grebes() {
  const birds = useRef<(THREE.Group | null)[]>([]);
  const bodies = useRef<(THREE.Group | null)[]>([]);
  const heads = useRef<(THREE.Group | null)[]>([]);
  const sprays = useRef<(THREE.Group | null)[]>([]);
  const yaws = useRef<(number | null)[]>([null, null]);
  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;
    for (const k of [0, 1] as const) {
      const bird = birds.current[k];
      if (!bird) continue;
      const pose = grebePose(k, time);
      // Turn smoothly toward the pose's heading rather than snapping round.
      const last = yaws.current[k] ?? pose.yaw;
      const turn = Math.atan2(Math.sin(pose.yaw - last), Math.cos(pose.yaw - last));
      const yaw = last + turn * Math.min(1, delta * (pose.rushing ? 12 : 2.5));
      yaws.current[k] = yaw;
      const surface = waterHeight(pose.x, pose.z, time);
      bird.position.set(pose.x, surface - 0.05 + pose.upright * 0.12, pose.z);
      bird.rotation.set(0, yaw, 0, "YXZ");
      const body = bodies.current[k];
      // Reared up, breast high, running on its feet.
      if (body) body.rotation.x = -pose.upright * 0.9;
      const head = heads.current[k];
      if (head) {
        head.rotation.y = pose.shake;
        // The neck curves forward as they run.
        head.rotation.x = pose.upright * 0.7;
      }
      const spray = sprays.current[k];
      if (spray) {
        spray.visible = pose.rushing;
        spray.children.forEach((drop, i) => {
          const hop = (time * 6 + i * 0.27) % 1;
          drop.position.y = 0.03 + Math.sin(hop * Math.PI) * 0.12;
        });
      }
    }
  });
  return (
    <>
      {[0, 1].map((k) => (
        <group key={k} ref={(g) => void (birds.current[k] = g)} name="grebe" scale={SCALE}>
          <group ref={(g) => void (bodies.current[k] = g)}>
            <mesh position={[0, 0.06, 0]} scale={[0.1, 0.07, 0.19]}>
              <sphereGeometry args={[1, 12, 8]} />
              <meshToonMaterial color={BACK} gradientMap={toonRamp()} />
            </mesh>
            <group ref={(g) => void (heads.current[k] = g)} position={[0, 0.1, 0.13]}>
              <mesh position={[0, 0.08, 0.01]} rotation={[0.2, 0, 0]}>
                <cylinderGeometry args={[0.028, 0.04, 0.18, 8]} />
                <meshToonMaterial color={WHITE} gradientMap={toonRamp()} />
              </mesh>
              <mesh position={[0, 0.18, 0.03]} scale={[0.045, 0.04, 0.055]}>
                <sphereGeometry args={[1, 10, 8]} />
                <meshToonMaterial color={WHITE} gradientMap={toonRamp()} />
              </mesh>
              {/* The chestnut ruff and black crest of a bird in breeding plumage. */}
              <mesh position={[0, 0.165, 0.01]} scale={[0.065, 0.035, 0.04]}>
                <sphereGeometry args={[1, 10, 6]} />
                <meshToonMaterial color={RUFF} gradientMap={toonRamp()} />
              </mesh>
              {[-1, 1].map((side) => (
                <mesh key={side} position={[side * 0.018, 0.225, 0.0]} rotation={[-0.5, 0, side * 0.3]}>
                  <coneGeometry args={[0.014, 0.06, 5]} />
                  <meshToonMaterial color={CREST} gradientMap={toonRamp()} />
                </mesh>
              ))}
              <mesh position={[0, 0.18, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.012, 0.07, 5]} />
                <meshToonMaterial color="#6d4b3b" gradientMap={toonRamp()} />
              </mesh>
            </group>
          </group>
          <group ref={(g) => void (sprays.current[k] = g)} visible={false}>
            {DROPS.map(([x, z], i) => (
              <mesh key={i} position={[x, 0.03, z]} scale={0.022}>
                <sphereGeometry args={[1, 6, 4]} />
                <meshBasicMaterial color={SPRAY} transparent opacity={0.8} depthWrite={false} />
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </>
  );
}
