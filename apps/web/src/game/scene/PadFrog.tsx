import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { fx } from "../fx";
import { lastSplash } from "./duckFlush";
import { mergePainted } from "./mergeParts";
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

/** The frog's body, eye bumps, eyes and folded legs bake into one shape; the throat puffs on its own. */
export function frogShape() {
  return mergePainted([
    // Squat body facing +z, tilted nose-up the way a sitting frog holds itself.
    { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.035, 0], rotation: [-0.35, 0, 0], scale: [0.05, 0.032, 0.06], color: SKIN },
    ...[-1, 1].flatMap((side) => [
      { geometry: new THREE.SphereGeometry(1, 8, 6), position: [side * 0.024, 0.064, 0.03] as const, scale: 0.014, color: SKIN },
      { geometry: new THREE.SphereGeometry(1, 6, 4), position: [side * 0.027, 0.07, 0.038] as const, scale: 0.008, color: EYE },
      // Folded back legs at the sides.
      { geometry: new THREE.SphereGeometry(1, 8, 6), position: [side * 0.045, 0.018, -0.02] as const, scale: [0.02, 0.016, 0.04] as const, color: SKIN },
    ]),
  ]);
}

/** A frog sitting on lily pad `index`; motion lives in padFrogs.ts. */
export function PadFrog({ index }: { index: number }) {
  const pad = FROG_PADS[index % FROG_PADS.length]!;
  const body = useRef<THREE.Group>(null);
  const throat = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const shape = useMemo(frogShape, []);
  const looks = useMemo(
    () => ({
      painted: new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }),
      throat: new THREE.MeshToonMaterial({ color: BELLY, gradientMap: toonRamp() }),
      ball: new THREE.SphereGeometry(1, 8, 6),
    }),
    [],
  );
  useEffect(
    () => () => {
      [shape, looks.painted, looks.throat, looks.ball].forEach((thing) => thing.dispose());
    },
    [shape, looks],
  );
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
      <group ref={body} name="frog" rotation={[0, pad.yaw, 0]} scale={FROG_SCALE}>
        <mesh geometry={shape} material={looks.painted} />
        <mesh ref={throat} geometry={looks.ball} material={looks.throat} position={[0, 0.03, 0.045]} scale={0.028} />
      </group>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.32, 0.38, 24]} />
        <meshBasicMaterial ref={ringMaterial} color="#dcebe7" transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  );
}
