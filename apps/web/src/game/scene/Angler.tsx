import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { isFishingStance, stanceAt } from "@stillwater/shared";
import type { SimRef } from "./FishingWorld";
import { anglerPose } from "./pose";
import { applyToon, disposeMaterials } from "./toon";
import type { ScenePhase } from "./types";
import { useSceneWrap } from "./useSceneWrap";

type Props = {
  phase: ScenePhase;
  power: number;
  sim: SimRef;
  rodTip: THREE.Vector3;
  hand: THREE.Vector3;
  lookAt: THREE.Vector3;
};

useGLTF.preload("/models/character-male-c.glb");
useGLTF.preload("/models/fishing-rod.glb");

function swing(phase: ScenePhase, power: number, t: number, sim: SimRef) {
  switch (phase) {
    case "casting":
      return 0.35 - power * 1.15;
    case "waiting":
      return 1.05;
    case "hookset":
      return 1.45;
    case "fight": {
      const fight = sim.current;
      if (!fight) return 1.15 + Math.sin(t * 9) * 0.18;
      return 1.05 + fight.tension * 0.5 + Math.sin(t * 10) * 0.06 * (1 + fight.surge);
    }
    case "result":
      return 0.3;
    default:
      return 0.95 + Math.sin(t * 1.6) * 0.04;
  }
}

const ROD_BIAS = 0.18;

function shortest(from: number, to: number) {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function yawToward(x: number, z: number) {
  const dx = x - anglerPose.x;
  const dz = z - anglerPose.z;
  if (dx * dx + dz * dz < 0.04) return anglerPose.yaw;
  return Math.atan2(dx, dz) - ROD_BIAS;
}

function clipName(phase: ScenePhase, moving: boolean, fishing: boolean) {
  if (moving) return "walk";
  if (phase !== "idle" || fishing) return "holding-right";
  return "idle";
}

export function Angler({ phase, power, sim, rodTip, hand, lookAt }: Props) {
  const gltf = useGLTF("/models/character-male-c.glb");
  const rodFile = useGLTF("/models/fishing-rod.glb");
  const root = useRef<THREE.Group>(null);
  const wrap = useSceneWrap();
  const grip = useRef<THREE.Group>(null);
  const tip = useRef<THREE.Object3D>(null);
  const playing = useRef("");

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

  useFrame((state, delta) => {
    const fishing = isFishingStance(stanceAt(anglerPose.x, anglerPose.z));
    const next = clipName(phase, anglerPose.moving, fishing);
    if (next === "holding-right") {
      const target = yawToward(lookAt.x, lookAt.z);
      anglerPose.yaw += shortest(anglerPose.yaw, target) * (1 - Math.exp(-7 * delta));
    }
    if (root.current) {
      root.current.position.set(anglerPose.x, 0, anglerPose.z);
      root.current.rotation.y = anglerPose.yaw;
    }
    if (wrap.current) wrap.current.dataset.yaw = anglerPose.yaw.toFixed(2);
    if (grip.current) {
      grip.current.rotation.x = swing(phase, power, state.clock.elapsedTime, sim);
      grip.current.getWorldPosition(hand);
    }
    tip.current?.getWorldPosition(rodTip);

    if (playing.current !== next) {
      const hold = actions["holding-right"] ?? actions.idle;
      const clips = {
        walk: actions.walk ?? actions.idle,
        "holding-right": hold,
        idle: actions.idle ?? hold,
      };
      const clip = clips[next];
      if (clip) {
        actions[playing.current]?.fadeOut(0.12);
        clip.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.12).play();
        playing.current = next;
      }
    }
  });

  return (
    <group ref={root} position={[anglerPose.x, 0, anglerPose.z]} rotation={[0, anglerPose.yaw, 0]} scale={1.7}>
      <primitive object={character} />
      <group ref={grip} position={[0.2, 0.62, 0.22]} rotation={[1.05, 0.05, -0.28]}>
        <primitive object={rod} scale={0.19} />
        <object3D ref={tip} position={[0, 0.94, 0]} />
      </group>
    </group>
  );
}
