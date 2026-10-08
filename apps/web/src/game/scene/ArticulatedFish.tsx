import { useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
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

/** One coat. A second sphere on the same pixel would hide the water. */
const FIGHT_OPACITY = 0.66;

function fightCoat(color: string) {
  return {
    color,
    transparent: true,
    opacity: FIGHT_OPACITY,
    depthWrite: false,
    toneMapped: false,
    stencilWrite: true,
    stencilRef: 1,
    stencilFunc: THREE.NotEqualStencilFunc,
    stencilFail: THREE.KeepStencilOp,
    stencilZFail: THREE.KeepStencilOp,
    stencilZPass: THREE.ReplaceStencilOp,
  } as const;
}

function FishMaterial({ color, unlit }: { color: string; unlit?: boolean }) {
  if (unlit) return <meshBasicMaterial {...fightCoat(color)} />;
  return <meshToonMaterial color={color} gradientMap={toonRamp()} />;
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
  const root = useRef<THREE.Group>(null);
  const middle = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const coatReady = useRef(false);

  useLayoutEffect(() => {
    const group = root.current;
    if (!group || !unlit) return;
    const meshes: THREE.Mesh[] = [];
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.renderOrder = 2;
      meshes.push(mesh);
    });
    const prime: THREE.Mesh["onBeforeRender"] = (renderer) => {
      if (coatReady.current || renderer.getRenderTarget() !== null) return;
      coatReady.current = true;
      const stencil = renderer.state.buffers.stencil;
      stencil.setTest(true);
      stencil.setMask(0xff);
      stencil.setClear(0);
      renderer.clear(false, false, true);
      stencil.reset();
    };
    for (const mesh of meshes) mesh.onBeforeRender = prime;
    return () => {
      for (const mesh of meshes) mesh.onBeforeRender = () => {};
    };
  }, [unlit]);

  useFrame((state) => {
    coatReady.current = false;
    const rate = drive?.current.speed ?? speed;
    const amp = drive?.current.intensity ?? intensity;
    const wave = state.clock.elapsedTime * rate * 7 + phase;
    if (middle.current) middle.current.rotation.y = Math.sin(wave) * 0.2 * amp;
    if (tail.current) tail.current.rotation.y = Math.sin(wave - 0.8) * 0.46 * amp;
  });

  return (
    <group ref={root}>
      <mesh position={[0, 0, 0.1]} scale={[1, 0.78, 1.65]} castShadow>
        <sphereGeometry args={[0.42, 12, 8]} />
        <FishMaterial color={color} unlit={unlit} />
      </mesh>
      <mesh position={[0, 0.02, 0.72]} scale={[0.9, 0.8, 1]} castShadow>
        <sphereGeometry args={[0.36, 12, 8]} />
        <FishMaterial color={color} unlit={unlit} />
      </mesh>
      <mesh position={[0.17, 0.17, 0.93]}>
        <sphereGeometry args={[0.045, 7, 5]} />
        <meshBasicMaterial {...(unlit ? fightCoat("#101719") : { color: "#101719" })} />
      </mesh>
      <mesh position={[-0.17, 0.17, 0.93]}>
        <sphereGeometry args={[0.045, 7, 5]} />
        <meshBasicMaterial {...(unlit ? fightCoat("#101719") : { color: "#101719" })} />
      </mesh>
      <mesh position={[0, 0.27, -0.02]} rotation={[0.2, 0, 0]} scale={[0.5, 0.08, 0.48]}>
        <sphereGeometry args={[0.32, 7, 4]} />
        <FishMaterial color="#465754" unlit={unlit} />
      </mesh>
      <group ref={middle} position={[0, 0, -0.45]}>
        <mesh position={[0, 0, -0.15]} scale={[0.85, 0.75, 1]} castShadow>
          <sphereGeometry args={[0.34, 10, 7]} />
          <FishMaterial color={color} unlit={unlit} />
        </mesh>
        <group ref={tail} position={[0, 0, -0.4]}>
          <mesh position={[0, 0, -0.14]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <coneGeometry args={[0.2, 0.5, 7]} />
            <FishMaterial color={color} unlit={unlit} />
          </mesh>
          <mesh position={[0.23, 0, -0.34]} rotation={[0, -0.55, 0]} scale={[0.5, 0.08, 0.42]}>
            <sphereGeometry args={[0.5, 7, 4]} />
            <FishMaterial color={accent} unlit={unlit} />
          </mesh>
          <mesh position={[-0.23, 0, -0.34]} rotation={[0, 0.55, 0]} scale={[0.5, 0.08, 0.42]}>
            <sphereGeometry args={[0.5, 7, 4]} />
            <FishMaterial color={accent} unlit={unlit} />
          </mesh>
        </group>
      </group>
      <mesh position={[0.38, -0.02, 0.03]} rotation={[0, -0.35, 0]} scale={[0.34, 0.06, 0.25]}>
        <sphereGeometry args={[0.5, 7, 4]} />
        <FishMaterial color={accent} unlit={unlit} />
      </mesh>
      <mesh position={[-0.38, -0.02, 0.03]} rotation={[0, 0.35, 0]} scale={[0.34, 0.06, 0.25]}>
        <sphereGeometry args={[0.5, 7, 4]} />
        <FishMaterial color={accent} unlit={unlit} />
      </mesh>
    </group>
  );
}
