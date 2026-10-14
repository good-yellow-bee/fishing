import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { pitchTurn } from "./bodyPitch";
import { lastSplash } from "./duckFlush";
import { KINGFISHER_PERCH, kingfisherPose, stepKingfisher, type KingfisherState } from "./kingfisherFlight";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const BACK = "#1f8fb8";
const BELLY = "#e8873a";
const BEAK = "#1a1614";
const SNAG = "#5a4634";
/** One wing, shared by both sides. */
const WING = new THREE.BoxGeometry(0.005, 0.065, 0.04);
/** Drawn about twice life size so the flash of blue reads from the dock. */
const BIRD_SCALE = 2.2;

/** A bare snag off the east bank with a kingfisher on it; motion lives in kingfisherFlight.ts. */
export function Kingfisher() {
  const bird = useRef<THREE.Group>(null);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const state = useRef<KingfisherState>({ mode: "perched" });
  const still = useReducedMotion();

  useFrame((frame) => {
    const group = bird.current;
    if (!group) return;
    const time = frame.clock.elapsedTime;
    state.current = stepKingfisher(state.current, time, lastSplash);
    const pose = kingfisherPose(time, state.current, still);
    group.visible = !pose.hidden;
    group.position.set(pose.x, pose.y, pose.z);
    group.rotation.set(pitchTurn(pose.pitch), pose.yaw, 0, "YXZ");
    // Folded along the body on the snag; out and beating fast in flight.
    const beat = still ? 0 : Math.sin(time * 40) * 0.7;
    const spread = pose.flying * (1.2 + beat);
    if (right.current) right.current.rotation.z = spread;
    if (left.current) left.current.rotation.z = -spread;
    if (ring.current && ringMaterial.current) {
      ring.current.visible = pose.ring >= 0;
      if (pose.ring >= 0) {
        ring.current.position.set(pose.ringX, waterHeight(pose.ringX, pose.ringZ, time) + 0.03, pose.ringZ);
        ring.current.scale.setScalar(0.25 + pose.ring * 1.1);
        ringMaterial.current.opacity = (1 - pose.ring) * 0.5;
      }
    }
  });

  return (
    <>
      {/* The snag: a bare stick leaning out of the water, the bird's perch at its tip. */}
      <mesh position={[KINGFISHER_PERCH.x + 0.12, KINGFISHER_PERCH.y / 2 - 0.25, KINGFISHER_PERCH.z]} rotation={[0, 0, 0.12]} castShadow>
        <cylinderGeometry args={[0.025, 0.05, KINGFISHER_PERCH.y + 0.5, 6]} />
        <meshToonMaterial color={SNAG} gradientMap={toonRamp()} />
      </mesh>
      <mesh position={[KINGFISHER_PERCH.x + 0.25, KINGFISHER_PERCH.y * 0.7, KINGFISHER_PERCH.z]} rotation={[0, 0, -0.9]}>
        <cylinderGeometry args={[0.012, 0.02, 0.4, 5]} />
        <meshToonMaterial color={SNAG} gradientMap={toonRamp()} />
      </mesh>
      <group ref={bird} name="kingfisher" scale={BIRD_SCALE}>
        {/* Body along +z, the way the pose's yaw faces; it sits on the perch, so everything rides above y 0. */}
        <mesh position={[0, 0.045, 0]} scale={[0.032, 0.036, 0.055]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshToonMaterial color={BACK} gradientMap={toonRamp()} />
        </mesh>
        <mesh position={[0, 0.032, 0.008]} scale={[0.028, 0.026, 0.045]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshToonMaterial color={BELLY} gradientMap={toonRamp()} />
        </mesh>
        <mesh position={[0, 0.075, 0.04]} scale={0.028}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshToonMaterial color={BACK} gradientMap={toonRamp()} />
        </mesh>
        <mesh position={[0, 0.072, 0.09]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.008, 0.055, 6]} />
          <meshBasicMaterial color={BEAK} />
        </mesh>
        <mesh position={[0, 0.045, -0.065]} rotation={[-Math.PI / 2 - 0.3, 0, 0]}>
          <coneGeometry args={[0.012, 0.04, 5]} />
          <meshToonMaterial color={BACK} gradientMap={toonRamp()} />
        </mesh>
        {/* Wings hinge at the shoulders; folded, they hang down the bird's sides, and swing out level to fly. */}
        <group ref={right} position={[0.028, 0.06, 0]}>
          <mesh position={[0, -0.032, 0]} geometry={WING}>
            <meshToonMaterial color={BACK} gradientMap={toonRamp()} />
          </mesh>
        </group>
        <group ref={left} position={[-0.028, 0.06, 0]}>
          <mesh position={[0, -0.032, 0]} geometry={WING}>
            <meshToonMaterial color={BACK} gradientMap={toonRamp()} />
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
