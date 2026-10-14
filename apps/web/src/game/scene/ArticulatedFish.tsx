import { type ReactElement, useMemo, useRef } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { markPlacements, PLAIN_BUILD, type FishBuild } from "./fishBuild";
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
  /** The species' proportions; the plain fish when left out. */
  build?: FishBuild;
};

/** Bars, spots and stripes are dark; a pike's flecks are pale. */
const DARK_MARK = "#2f3424";
const PALE_MARK = "#e6e0bd";

/** Where each whisker sits at the mouth, which way it hangs, and how long it is, by how many the species has. */
const BARBELS: Record<FishBuild["barbels"], { x: number; y: number; yaw: number; length: number }[]> = {
  0: [],
  1: [{ x: 0, y: -0.14, yaw: 0, length: 0.16 }],
  2: [
    { x: 0.1, y: -0.06, yaw: 0.5, length: 0.14 },
    { x: -0.1, y: -0.06, yaw: -0.5, length: 0.14 },
  ],
  4: [
    { x: 0.13, y: -0.02, yaw: 0.7, length: 0.42 },
    { x: -0.13, y: -0.02, yaw: -0.7, length: 0.42 },
    { x: 0.06, y: -0.14, yaw: 0.25, length: 0.22 },
    { x: -0.06, y: -0.14, yaw: -0.25, length: 0.22 },
  ],
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
  build = PLAIN_BUILD,
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

  // A longer snout reaches forward from the same neck; the eyes ride a little way with it, the whiskers to its tip.
  const headZ = 0.72 + (build.snout - 1) * 0.18;
  const eyeZ = 0.93 + (build.snout - 1) * 0.12;
  const mouthZ = headZ + 0.3 * build.snout;
  const marks = useMemo(() => markPlacements(build.marks), [build.marks]);

  return (
    <group scale={[build.width, build.depth, build.length]}>
      <FishMesh position={[0, 0, 0.1]} scale={[1, 0.78, 1.65]} castShadow unlit={unlit} shape={<sphereGeometry args={[0.42, 12, 8]} />} material={<FishMaterial color={color} unlit={unlit} />} />
      <FishMesh position={[0, 0.02, headZ]} scale={[0.9, 0.8, build.snout]} castShadow unlit={unlit} shape={<sphereGeometry args={[0.36, 12, 8]} />} material={<FishMaterial color={color} unlit={unlit} />} />
      <FishMesh position={[0.17, 0.17, eyeZ]} unlit={unlit} shape={<sphereGeometry args={[0.045, 7, 5]} />} material={<meshBasicMaterial {...(unlit ? fightCoat("#101719") : { color: "#101719" })} />} />
      <FishMesh position={[-0.17, 0.17, eyeZ]} unlit={unlit} shape={<sphereGeometry args={[0.045, 7, 5]} />} material={<meshBasicMaterial {...(unlit ? fightCoat("#101719") : { color: "#101719" })} />} />
      <FishMesh position={[0, 0.27, -0.02]} rotation={[0.2, 0, 0]} scale={[0.5, 0.08, 0.48]} unlit={unlit} shape={<sphereGeometry args={[0.32, 7, 4]} />} material={<FishMaterial color="#465754" unlit={unlit} />} />
      {build.dorsal !== 1 && (
        // A raised fin along the back: a tall sail on panfish and walleye, set low on pike.
        <FishMesh position={[0, 0.26 + 0.05 * build.dorsal, -0.05]} rotation={[0.12, 0, 0]} scale={[0.04, 0.15 * build.dorsal, 0.8]} unlit={unlit} shape={<sphereGeometry args={[0.5, 7, 5]} />} material={<FishMaterial color="#465754" unlit={unlit} />} />
      )}
      {marks.map((mark, i) => (
        <FishMesh
          key={`mark-${i}`}
          position={mark.position}
          scale={mark.scale}
          unlit={unlit}
          shape={<sphereGeometry args={[1, 10, 6]} />}
          material={<FishMaterial color={build.marks === "flecks" ? PALE_MARK : DARK_MARK} unlit={unlit} />}
        />
      ))}
      {BARBELS[build.barbels].map((barbel, i) => (
        <FishMesh
          key={i}
          position={[barbel.x, barbel.y, mouthZ]}
          rotation={[Math.PI / 2 + 0.5, barbel.yaw, 0]}
          scale={[1, barbel.length / 0.3, 1]}
          unlit={unlit}
          shape={<coneGeometry args={[0.018, 0.3, 4]} />}
          material={<FishMaterial color="#3a332c" unlit={unlit} />}
        />
      ))}
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
