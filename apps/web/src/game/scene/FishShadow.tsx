import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { canPreviewFish } from "@stillwater/shared";
import * as THREE from "three";
import type { ScenePhase } from "./types";
import { waterHeight } from "./water";

export function bodyScale(weight: number) {
  return 0.5 + Math.min(0.45, weight / 28);
}

type Props = { level: number; phase: ScenePhase; weight: number; bobber: { x: number; z: number } };

export function FishShadow({ level, phase, weight, bobber }: Props) {
  const visible = canPreviewFish(level) && phase === "hookset";
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    const shadow = group.current;
    if (!shadow) return;
    shadow.visible = visible;
    if (!visible) return;
    const time = state.clock.elapsedTime;
    const orbit = time * 2.4;
    const x = bobber.x + Math.sin(orbit) * 0.24;
    const z = bobber.z + Math.cos(orbit * 0.8) * 0.18;
    shadow.position.set(x, waterHeight(x, z, time) - 0.12, z);
    shadow.rotation.y = orbit + Math.PI / 2;
  });
  return (
    <group ref={group} visible={false} scale={bodyScale(weight)}>
      <mesh scale={[0.55, 0.025, 1.1]} renderOrder={1}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial color="#172c34" transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, -1.05]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.05]} renderOrder={1}>
        <coneGeometry args={[0.4, 0.65, 3]} />
        <meshBasicMaterial color="#172c34" transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </group>
  );
}
