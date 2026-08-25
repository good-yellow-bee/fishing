import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { toonRamp } from "./toon";

type Props = {
  color?: string;
  accent?: string;
  phase?: number;
  speed?: number;
  intensity?: number;
};

function FishMaterial({ color }: { color: string }) {
  return <meshToonMaterial color={color} gradientMap={toonRamp()} />;
}

export function ArticulatedFish({
  color = "#c97945",
  accent = "#e9bc72",
  phase = 0,
  speed = 1,
  intensity = 1,
}: Props) {
  const middle = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);

  useFrame((state) => {
    const wave = state.clock.elapsedTime * speed * 7 + phase;
    if (middle.current) middle.current.rotation.y = Math.sin(wave) * 0.2 * intensity;
    if (tail.current) tail.current.rotation.y = Math.sin(wave - 0.8) * 0.46 * intensity;
  });

  return (
    <group>
      <mesh position={[0, 0, 0.1]} scale={[1, 0.78, 1.65]} castShadow>
        <sphereGeometry args={[0.42, 12, 8]} />
        <FishMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.02, 0.72]} scale={[0.9, 0.8, 1]} castShadow>
        <sphereGeometry args={[0.36, 12, 8]} />
        <FishMaterial color={color} />
      </mesh>
      <mesh position={[0.17, 0.17, 0.93]}>
        <sphereGeometry args={[0.045, 7, 5]} />
        <meshBasicMaterial color="#101719" />
      </mesh>
      <mesh position={[-0.17, 0.17, 0.93]}>
        <sphereGeometry args={[0.045, 7, 5]} />
        <meshBasicMaterial color="#101719" />
      </mesh>
      <mesh position={[0, 0.27, -0.02]} rotation={[0.2, 0, 0]} scale={[0.5, 0.08, 0.48]}>
        <sphereGeometry args={[0.32, 7, 4]} />
        <FishMaterial color="#465754" />
      </mesh>
      <group ref={middle} position={[0, 0, -0.45]}>
        <mesh position={[0, 0, -0.15]} scale={[0.85, 0.75, 1]} castShadow>
          <sphereGeometry args={[0.34, 10, 7]} />
          <FishMaterial color={color} />
        </mesh>
        <group ref={tail} position={[0, 0, -0.4]}>
          <mesh position={[0, 0, -0.14]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <coneGeometry args={[0.2, 0.5, 7]} />
            <FishMaterial color={color} />
          </mesh>
          <mesh position={[0.23, 0, -0.34]} rotation={[0, -0.55, 0]} scale={[0.5, 0.08, 0.42]}>
            <sphereGeometry args={[0.5, 7, 4]} />
            <FishMaterial color={accent} />
          </mesh>
          <mesh position={[-0.23, 0, -0.34]} rotation={[0, 0.55, 0]} scale={[0.5, 0.08, 0.42]}>
            <sphereGeometry args={[0.5, 7, 4]} />
            <FishMaterial color={accent} />
          </mesh>
        </group>
      </group>
      <mesh position={[0.38, -0.02, 0.03]} rotation={[0, -0.35, 0]} scale={[0.34, 0.06, 0.25]}>
        <sphereGeometry args={[0.5, 7, 4]} />
        <FishMaterial color={accent} />
      </mesh>
      <mesh position={[-0.38, -0.02, 0.03]} rotation={[0, 0.35, 0]} scale={[0.34, 0.06, 0.25]}>
        <sphereGeometry args={[0.5, 7, 4]} />
        <FishMaterial color={accent} />
      </mesh>
    </group>
  );
}
