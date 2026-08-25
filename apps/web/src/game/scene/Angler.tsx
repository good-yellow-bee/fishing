import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { applyToon, disposeMaterials } from "./toon";
import type { ScenePhase } from "./types";

type Props = {
  phase: ScenePhase;
  power: number;
  rodTip: THREE.Vector3;
  lookAt: THREE.Vector3;
};

useGLTF.preload("/models/character-male-c.glb");
useGLTF.preload("/models/fishing-rod.glb");

function swing(phase: ScenePhase, power: number, t: number) {
  switch (phase) {
    case "casting":
      return 0.35 - power * 1.15;
    case "waiting":
      return 1.05;
    case "hookset":
      return 1.45;
    case "fight":
      return 1.15 + Math.sin(t * 9) * 0.18;
    case "result":
      return 0.85;
    default:
      return 0.95 + Math.sin(t * 1.6) * 0.04;
  }
}

const STAND: [number, number, number] = [0.15, 0, 7.42];
const INITIAL_YAW = Math.PI - 0.7;
const LAKE_YAW = Math.PI;
const YAW_MIN = Math.PI - 1.2;
const YAW_MAX = Math.PI + 1.25;
const ROD_BIAS = 0.18;

function shortest(from: number, to: number) {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

// atan2 is (-π, π]; clamp as an offset from lake-facing π so left-of-dock
// looks stay left instead of snapping onto the right clamp.
function yawToward(x: number, z: number) {
  const dx = x - STAND[0];
  const dz = z - STAND[2];
  // Water behind the dock sits on atan2's ±π seam; pick a side instead of flipping.
  if (dz >= 0) return dx < 0 ? YAW_MAX : YAW_MIN;
  const raw = Math.atan2(dx, dz) - ROD_BIAS;
  const offset = THREE.MathUtils.clamp(shortest(LAKE_YAW, raw), YAW_MIN - LAKE_YAW, YAW_MAX - LAKE_YAW);
  return LAKE_YAW + offset;
}

export function Angler({ phase, power, rodTip, lookAt }: Props) {
  const gltf = useGLTF("/models/character-male-c.glb");
  const rodFile = useGLTF("/models/fishing-rod.glb");
  const root = useRef<THREE.Group>(null);
  const yaw = useRef(INITIAL_YAW);
  const grip = useRef<THREE.Group>(null);
  const tip = useRef<THREE.Object3D>(null);

  const character = useMemo(() => {
    const next = cloneSkinned(gltf.scene);
    applyToon(next);
    return next;
  }, [gltf.scene]);

  const rod = useMemo(() => {
    const next = rodFile.scene.clone(true);
    applyToon(next);
    return next;
  }, [rodFile.scene]);

  useEffect(() => {
    return () => {
      disposeMaterials(character);
      disposeMaterials(rod);
    };
  }, [character, rod]);

  const { actions } = useAnimations(gltf.animations, character);

  useEffect(() => {
    const clip = actions["holding-right"] ?? actions.idle;
    clip?.reset().fadeIn(0.12).play();
    return () => {
      clip?.fadeOut(0.08);
    };
  }, [actions]);

  useFrame((state, delta) => {
    const target = yawToward(lookAt.x, lookAt.z);
    yaw.current += shortest(yaw.current, target) * (1 - Math.exp(-7 * delta));
    if (root.current) root.current.rotation.y = yaw.current;
    const wrap = document.querySelector(".scene-wrap");
    if (wrap instanceof HTMLElement) wrap.dataset.yaw = yaw.current.toFixed(2);
    if (grip.current) grip.current.rotation.x = swing(phase, power, state.clock.elapsedTime);
    tip.current?.getWorldPosition(rodTip);
  });

  return (
    <group ref={root} position={STAND} rotation={[0, INITIAL_YAW, 0]} scale={1.7}>
      <primitive object={character} />
      <group ref={grip} position={[0.2, 0.62, 0.22]} rotation={[1.05, 0.05, -0.28]}>
        <primitive object={rod} scale={0.19} />
        <object3D ref={tip} position={[0, 0.94, 0]} />
      </group>
    </group>
  );
}
