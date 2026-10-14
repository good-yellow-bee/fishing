import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TERN_COUNT, ternPose } from "./ternHover";
import { pitchTurn } from "./bodyPitch";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const WHITE = "#f4f5f2";
const GREY = "#c9d0d3";
const CAP = "#1b1b1b";
const BILL = "#d2452b";
/** Larger than life, so they read against the far bank. */
const SCALE = 1.8;
/** Meters a second they shift across when the fish patch moves. */
const FOLLOW = 1.5;
const SPLASH_SEC = 0.6;

/** Terns circling and plunging over the day's fish patch; motion lives in ternHover.ts. */
export function Terns({ center }: { center: { x: number; z: number } }) {
  const birds = useRef<(THREE.Group | null)[]>([]);
  const wings = useRef<(THREE.Group | null)[][]>(Array.from({ length: TERN_COUNT }, () => []));
  const splashes = useRef<(THREE.Mesh | null)[]>([]);
  // Where they are working now; it slides over to a new patch rather than jumping.
  const working = useRef<{ x: number; z: number } | null>(null);
  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;
    const at = (working.current ??= { ...center });
    const dx = center.x - at.x;
    const dz = center.z - at.z;
    const gap = Math.hypot(dx, dz);
    const step = Math.min(gap, FOLLOW * delta);
    if (gap > 1e-6) {
      at.x += (dx / gap) * step;
      at.z += (dz / gap) * step;
    }
    for (let k = 0; k < TERN_COUNT; k += 1) {
      const bird = birds.current[k];
      if (!bird) continue;
      const pose = ternPose(k, time, at);
      const surface = waterHeight(pose.x, pose.z, time);
      bird.position.set(pose.x, surface + pose.y, pose.z);
      // Nose down through the plunge.
      bird.rotation.set(pitchTurn(pose.diving ? -1.2 : 0), pose.yaw, 0, "YXZ");
      wings.current[k]!.forEach((wing, side) => {
        if (wing) wing.rotation.z = (side === 0 ? 1 : -1) * pose.flap * 0.7;
      });
      const splash = splashes.current[k];
      if (splash) {
        splash.visible = pose.splash >= 0 && pose.splash < SPLASH_SEC;
        if (splash.visible) {
          const u = pose.splash / SPLASH_SEC;
          splash.position.set(pose.x, surface + 0.03, pose.z);
          splash.scale.setScalar(0.15 + u * 0.5);
          (splash.material as THREE.MeshBasicMaterial).opacity = (1 - u) * 0.6;
        }
      }
    }
  });
  return (
    <>
      {Array.from({ length: TERN_COUNT }, (_, k) => (
        <group key={k}>
          <group ref={(g) => void (birds.current[k] = g)} name="tern" scale={SCALE}>
            <mesh scale={[0.035, 0.032, 0.11]}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshToonMaterial color={WHITE} gradientMap={toonRamp()} />
            </mesh>
            <mesh position={[0, 0.02, 0.09]} scale={0.03}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshToonMaterial color={CAP} gradientMap={toonRamp()} />
            </mesh>
            <mesh position={[0, 0.015, 0.14]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.008, 0.05, 5]} />
              <meshToonMaterial color={BILL} gradientMap={toonRamp()} />
            </mesh>
            {/* The forked tail. */}
            {[-1, 1].map((side) => (
              <mesh key={side} position={[side * 0.015, 0, -0.14]} rotation={[0, side * 0.3, 0]} scale={[0.008, 0.004, 0.07]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshToonMaterial color={WHITE} gradientMap={toonRamp()} />
              </mesh>
            ))}
            {/* Long, narrow wings, hinged at the shoulder. */}
            {[1, -1].map((side, i) => (
              <group key={side} ref={(g) => void (wings.current[k]![i] = g)} position={[side * 0.025, 0.01, 0.01]}>
                <mesh position={[side * 0.13, 0, -0.01]} rotation={[0, side * 0.2, 0]}>
                  <boxGeometry args={[0.26, 0.006, 0.05]} />
                  <meshToonMaterial color={GREY} gradientMap={toonRamp()} />
                </mesh>
              </group>
            ))}
          </group>
          <mesh ref={(m) => void (splashes.current[k] = m)} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
            <ringGeometry args={[0.7, 1, 18]} />
            <meshBasicMaterial color="#eef6f6" transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}
