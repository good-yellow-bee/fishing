import { type ReactElement, useRef } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { toonRamp } from "./toon";

export type FishDrive = { intensity: number; speed: number };

type Props = {
  color?: string;
  accent?: string;
  phase?: number;
  speed?: number;
  intensity?: number;
  drive?: { readonly current: FishDrive };
  /** Fight body. One yellow layer over the chop, so the lake stays in the pixel. */
  unlit?: boolean;
};

/** One coat. A second fish part on the same pixel would hide the water. */
const FIGHT_OPACITY = 0.66;
/** Prepass and coat compile to one shader program, so the coat's depth matches the prepass bit for bit. */
const FIGHT_PROGRAM = { transparent: true, toneMapped: false } as const;

function fightCoat(color: string) {
  return { ...FIGHT_PROGRAM, color, opacity: FIGHT_OPACITY, depthWrite: false } as const;
}

function FishMaterial({ color, unlit }: { color: string; unlit?: boolean }) {
  if (unlit) return <meshBasicMaterial {...fightCoat(color)} />;
  return <meshToonMaterial color={color} gradientMap={toonRamp()} />;
}

type FishMeshProps = Omit<ThreeElements["mesh"], "children" | "castShadow" | "material"> & {
  shape: ReactElement;
  material: ReactElement;
  unlit?: boolean;
  castShadow?: boolean;
};

/** Unlit: depth prepass sorted after the water, then one coat on the nearest surface only. */
function FishMesh({ shape, material, unlit, castShadow = false, ...props }: FishMeshProps) {
  if (!unlit) {
    return (
      <mesh {...props} castShadow={castShadow}>
        {shape}
        {material}
      </mesh>
    );
  }
  return (
    <>
      <mesh {...props} renderOrder={1} castShadow={false}>
        {shape}
        <meshBasicMaterial {...FIGHT_PROGRAM} colorWrite={false} depthWrite />
      </mesh>
      <mesh {...props} renderOrder={2} castShadow={false}>
        {shape}
        {material}
      </mesh>
    </>
  );
}

export function ArticulatedFish({
  color = "#c97945",
  accent = "#e9bc72",
  phase = 0,
  speed = 1,
  intensity = 1,
  drive,
  unlit,
}: Props) {
  const middle = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);

  useFrame((state) => {
    const rate = drive?.current.speed ?? speed;
    const amp = drive?.current.intensity ?? intensity;
    const wave = state.clock.elapsedTime * rate * 7 + phase;
    if (middle.current) middle.current.rotation.y = Math.sin(wave) * 0.2 * amp;
    if (tail.current) tail.current.rotation.y = Math.sin(wave - 0.8) * 0.46 * amp;
  });

  return (
    <group>
      <FishMesh position={[0, 0, 0.1]} scale={[1, 0.78, 1.65]} castShadow unlit={unlit} shape={<sphereGeometry args={[0.42, 12, 8]} />} material={<FishMaterial color={color} unlit={unlit} />} />
      <FishMesh position={[0, 0.02, 0.72]} scale={[0.9, 0.8, 1]} castShadow unlit={unlit} shape={<sphereGeometry args={[0.36, 12, 8]} />} material={<FishMaterial color={color} unlit={unlit} />} />
      <FishMesh position={[0.17, 0.17, 0.93]} unlit={unlit} shape={<sphereGeometry args={[0.045, 7, 5]} />} material={<meshBasicMaterial {...(unlit ? fightCoat("#101719") : { color: "#101719" })} />} />
      <FishMesh position={[-0.17, 0.17, 0.93]} unlit={unlit} shape={<sphereGeometry args={[0.045, 7, 5]} />} material={<meshBasicMaterial {...(unlit ? fightCoat("#101719") : { color: "#101719" })} />} />
      <FishMesh position={[0, 0.27, -0.02]} rotation={[0.2, 0, 0]} scale={[0.5, 0.08, 0.48]} unlit={unlit} shape={<sphereGeometry args={[0.32, 7, 4]} />} material={<FishMaterial color="#465754" unlit={unlit} />} />
      <group ref={middle} position={[0, 0, -0.45]}>
        <FishMesh position={[0, 0, -0.15]} scale={[0.85, 0.75, 1]} castShadow unlit={unlit} shape={<sphereGeometry args={[0.34, 10, 7]} />} material={<FishMaterial color={color} unlit={unlit} />} />
        <group ref={tail} position={[0, 0, -0.4]}>
          <FishMesh position={[0, 0, -0.14]} rotation={[Math.PI / 2, 0, 0]} castShadow unlit={unlit} shape={<coneGeometry args={[0.2, 0.5, 7]} />} material={<FishMaterial color={color} unlit={unlit} />} />
          <FishMesh position={[0.23, 0, -0.34]} rotation={[0, -0.55, 0]} scale={[0.5, 0.08, 0.42]} unlit={unlit} shape={<sphereGeometry args={[0.5, 7, 4]} />} material={<FishMaterial color={accent} unlit={unlit} />} />
          <FishMesh position={[-0.23, 0, -0.34]} rotation={[0, 0.55, 0]} scale={[0.5, 0.08, 0.42]} unlit={unlit} shape={<sphereGeometry args={[0.5, 7, 4]} />} material={<FishMaterial color={accent} unlit={unlit} />} />
        </group>
      </group>
      <FishMesh position={[0.38, -0.02, 0.03]} rotation={[0, -0.35, 0]} scale={[0.34, 0.06, 0.25]} unlit={unlit} shape={<sphereGeometry args={[0.5, 7, 4]} />} material={<FishMaterial color={accent} unlit={unlit} />} />
      <FishMesh position={[-0.38, -0.02, 0.03]} rotation={[0, 0.35, 0]} scale={[0.34, 0.06, 0.25]} unlit={unlit} shape={<sphereGeometry args={[0.5, 7, 4]} />} material={<FishMaterial color={accent} unlit={unlit} />} />
    </group>
  );
}
