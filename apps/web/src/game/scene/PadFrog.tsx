import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { fx } from "../fx";
import { lastSplash } from "./duckFlush";
import { FROG_PADS, frogPose, stepFrog, type FrogState } from "./padFrogs";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const SKIN = "#5f8f3a";
const BELLY = "#c9d48a";
const EYE = "#1d1d16";
/** Drawn larger than life so it reads from the dock. */
const FROG_SCALE = 3.4;
/** The pad's top above the water line. */
const PAD_TOP = 0.06;

/** A frog sitting on lily pad `index`; motion lives in padFrogs.ts. */
export function PadFrog({ index }: { index: number }) {
  const pad = FROG_PADS[index % FROG_PADS.length]!;
  const body = useRef<THREE.Group>(null);
  const throat = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const state = useRef<FrogState>({ mode: "sitting" });
  const still = useReducedMotion();

  useFrame((frame) => {
    const frog = body.current;
    if (!frog) return;
    const time = frame.clock.elapsedTime;
    const next = stepFrog(state.current, time, pad, lastSplash);
    if (next.mode === "under" && state.current.mode !== "under") window.setTimeout(() => fx.plop(), 380);
    state.current = next;
    const pose = frogPose(index, time, state.current, still);
    const x = pad.x + pose.dx;
    const z = pad.z + pose.dz;
    frog.visible = !pose.hidden;
    frog.position.set(x, waterHeight(pad.x, pad.z, time) + PAD_TOP + pose.up, z);
    if (throat.current) throat.current.scale.setScalar(0.028 + pose.puff * 0.022);
    if (ring.current && ringMaterial.current) {
      ring.current.visible = pose.ring >= 0;
      if (pose.ring >= 0) {
        ring.current.position.set(x, waterHeight(x, z, time) + 0.03, z);
        ring.current.scale.setScalar(0.25 + pose.ring * 1.1);
        ringMaterial.current.opacity = (1 - pose.ring) * 0.5;
      }
    }
  });

  return (
    <>
      <group ref={body} rotation={[0, pad.yaw, 0]} scale={FROG_SCALE}>
        {/* Squat body facing +z, tilted nose-up the way a sitting frog holds itself. */}
        <mesh position={[0, 0.035, 0]} rotation={[-0.35, 0, 0]} scale={[0.05, 0.032, 0.06]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshToonMaterial color={SKIN} gradientMap={toonRamp()} />
        </mesh>
        <mesh ref={throat} position={[0, 0.03, 0.045]} scale={0.028}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshToonMaterial color={BELLY} gradientMap={toonRamp()} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh position={[side * 0.024, 0.064, 0.03]} scale={0.014}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshToonMaterial color={SKIN} gradientMap={toonRamp()} />
            </mesh>
            <mesh position={[side * 0.027, 0.07, 0.038]} scale={0.008}>
              <sphereGeometry args={[1, 6, 4]} />
              <meshBasicMaterial color={EYE} />
            </mesh>
            {/* Folded back legs at the sides. */}
            <mesh position={[side * 0.045, 0.018, -0.02]} scale={[0.02, 0.016, 0.04]}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshToonMaterial color={SKIN} gradientMap={toonRamp()} />
            </mesh>
          </group>
        ))}
      </group>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.32, 0.38, 24]} />
        <meshBasicMaterial ref={ringMaterial} color="#dcebe7" transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  );
}
