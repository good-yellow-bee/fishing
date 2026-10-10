import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { canPreviewFish } from "@stillwater/shared";
import * as THREE from "three";
import type { ScenePhase } from "./types";
import { waterHeight } from "./water";

type Props = { level: number; phase: ScenePhase; weight: number; bobber: { x: number; z: number } };

export function FishShadow({ level, phase, weight, bobber }: Props) {
  const visible = canPreviewFish(level) && phase === "hookset" && weight > 0;
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
    // Draw just under the chop after the transparent water, without its tint hiding the silhouette.
    shadow.position.set(x, waterHeight(x, z, time) - 0.01, z);
    shadow.rotation.y = orbit + Math.PI / 2;
  });
  return (
    <group ref={group} visible={false} scale={1 + Math.min(1.4, Math.sqrt(weight) / 5)}>
      <mesh scale={[0.55, 0.025, 1.1]} renderOrder={2}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial color="#06141c" transparent opacity={0.7} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -1.05]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.05]} renderOrder={2}>
        <coneGeometry args={[0.4, 0.65, 3]} />
        <meshBasicMaterial color="#06141c" transparent opacity={0.7} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
