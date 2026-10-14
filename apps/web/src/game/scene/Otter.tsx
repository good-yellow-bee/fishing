import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { lastSplash } from "./duckFlush";
import { otterPose, otterRoute, stepOtter, type OtterState } from "./otterMotion";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const FUR = "#4a3424";
const BELLY = "#7a5c40";
const NOSE = "#1a1210";

/** A river otter working the far bank at dawn and dusk: swims low, porpoises under, and slips away from a close cast. */
export function Otter() {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Group>(null);
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const state = useRef<OtterState>({ mode: "swimming" });

  useFrame((frame) => {
    const otter = group.current;
    if (!otter) return;
    const time = frame.clock.elapsedTime;
    state.current = stepOtter(state.current, time, otterRoute(time), lastSplash);
    const pose = otterPose(time, state.current);
    const surface = waterHeight(pose.x, pose.z, time);
    otter.visible = pose.under < 1;
    // Rides low, only the head and a line of back above the water, with a little paddling bob.
    otter.position.set(pose.x, surface - 0.05 - pose.under * 0.3 + Math.sin(time * 5) * 0.012, pose.z);
    otter.rotation.set(pose.pitch, pose.yaw, 0, "YXZ");
    if (ring.current && ringMaterial.current) {
      ring.current.visible = pose.ring >= 0;
      if (pose.ring >= 0) {
        ring.current.position.set(pose.x, surface + 0.03, pose.z);
        ring.current.scale.setScalar(0.3 + pose.ring * 1.3);
        ringMaterial.current.opacity = (1 - pose.ring) * 0.45;
      }
    }
  });

  return (
    <>
      <group ref={group} name="otter" scale={1.9}>
        {/* A long sleek body, the tail tapering behind. */}
        <mesh position={[0, 0.03, 0]} scale={[0.1, 0.075, 0.3]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshToonMaterial color={FUR} gradientMap={toonRamp()} />
        </mesh>
        <mesh position={[0, 0.0, 0.02]} scale={[0.095, 0.05, 0.26]}>
          <sphereGeometry args={[1, 10, 6]} />
          <meshToonMaterial color={BELLY} gradientMap={toonRamp()} />
        </mesh>
        <mesh position={[0, 0.02, -0.4]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.04, 0.26, 7]} />
          <meshToonMaterial color={FUR} gradientMap={toonRamp()} />
        </mesh>
        {/* Flat broad head held up out of the water. */}
        <mesh position={[0, 0.09, 0.32]} scale={[0.075, 0.06, 0.085]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshToonMaterial color={FUR} gradientMap={toonRamp()} />
        </mesh>
        <mesh position={[0, 0.075, 0.4]} scale={[0.045, 0.032, 0.04]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshToonMaterial color={BELLY} gradientMap={toonRamp()} />
        </mesh>
        <mesh position={[0, 0.088, 0.435]} scale={0.014}>
          <sphereGeometry args={[1, 6, 5]} />
          <meshBasicMaterial color={NOSE} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh position={[side * 0.05, 0.135, 0.3]} scale={0.016}>
              <sphereGeometry args={[1, 6, 5]} />
              <meshToonMaterial color={FUR} gradientMap={toonRamp()} />
            </mesh>
            <mesh position={[side * 0.038, 0.11, 0.385]} scale={0.011}>
              <sphereGeometry args={[1, 6, 5]} />
              <meshBasicMaterial color={NOSE} />
            </mesh>
          </group>
        ))}
      </group>
      <group ref={ring} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.32, 0.4, 24]} />
          <meshBasicMaterial ref={ringMaterial} color="#dcebe7" transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </>
  );
}
