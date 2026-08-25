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

export function Angler({ phase, power, rodTip }: Props) {
  const gltf = useGLTF("/models/character-male-c.glb");
  const rodFile = useGLTF("/models/fishing-rod.glb");
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

  useFrame((state) => {
    if (grip.current) grip.current.rotation.x = swing(phase, power, state.clock.elapsedTime);
    tip.current?.getWorldPosition(rodTip);
  });

  return (
    <group position={[0.15, 0, 7.42]} rotation={[0, Math.PI - 0.7, 0]} scale={1.7}>
      <primitive object={character} />
      <group ref={grip} position={[0.2, 0.62, 0.22]} rotation={[1.05, 0.05, -0.28]}>
        <primitive object={rod} scale={0.19} />
        <object3D ref={tip} position={[0, 0.94, 0]} />
      </group>
    </group>
  );
}
