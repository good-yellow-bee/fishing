import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeSoftSpotTexture } from "./Atmosphere";
import { LANTERN_COLOR, LANTERN_LIGHTS, LANTERN_REACH, LANTERNS, lanternFlicker } from "./lanternLight";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

/** Candela at full burn; the dock's two lanterns share one light. */
const LIGHT_INTENSITY = 5;
const HALO_SIZE = 0.9;

/** Lanterns lit at `level` (0..1); mounted only from dusk. */
export function Lanterns({ level }: { level: number }) {
  const still = useReducedMotion();
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  const halos = useRef<(THREE.Mesh | null)[]>([]);
  const texture = useMemo(() => makeSoftSpotTexture(0.15), []);
  const halo = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: texture,
        color: LANTERN_COLOR,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: false,
      }),
    [texture],
  );
  const glass = useMemo(() => new THREE.MeshBasicMaterial({ color: LANTERN_COLOR, toneMapped: false }), []);
  const frame = useMemo(() => new THREE.MeshToonMaterial({ color: "#2e2721", gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      texture.dispose();
      halo.dispose();
      glass.dispose();
      frame.dispose();
    },
    [texture, halo, glass, frame],
  );

  useFrame(({ clock, camera }) => {
    const time = clock.elapsedTime;
    lights.current.forEach((light, i) => {
      if (light) light.intensity = LIGHT_INTENSITY * level * lanternFlicker(time, i + 1, still);
    });
    halos.current.forEach((mesh, i) => {
      if (!mesh) return;
      mesh.quaternion.copy(camera.quaternion);
      mesh.scale.setScalar(HALO_SIZE * (0.6 + 0.4 * level) * lanternFlicker(time, LANTERNS[i]!.seed, still));
    });
    halo.opacity = 0.55 * level;
  });

  return (
    <group name="lanterns">
      {LANTERN_LIGHTS.map((at, i) => (
        <pointLight
          key={`light-${i}`}
          ref={(light) => {
            lights.current[i] = light;
          }}
          position={[at.x, at.y, at.z]}
          color={LANTERN_COLOR}
          distance={LANTERN_REACH}
          decay={2}
          intensity={0}
        />
      ))}
      {LANTERNS.map((lantern, i) => (
        <group key={i} position={[lantern.x, lantern.y, lantern.z]}>
          {/* A dark cap and base around a lit glass box. */}
          <mesh material={frame} position={[0, 0.1, 0]}>
            <boxGeometry args={[0.13, 0.03, 0.13]} />
          </mesh>
          <mesh material={glass}>
            <boxGeometry args={[0.09, 0.15, 0.09]} />
          </mesh>
          <mesh material={frame} position={[0, -0.09, 0]}>
            <boxGeometry args={[0.12, 0.03, 0.12]} />
          </mesh>
          <mesh
            ref={(mesh) => {
              halos.current[i] = mesh;
            }}
            material={halo}
            renderOrder={6}
          >
            <planeGeometry args={[1, 1]} />
          </mesh>
        </group>
      ))}
      {/* The shack lantern hangs from a short pole. */}
      <mesh material={frame} position={[LANTERNS[2]!.x, LANTERNS[2]!.y / 2, LANTERNS[2]!.z]}>
        <cylinderGeometry args={[0.03, 0.04, LANTERNS[2]!.y + 0.1, 6]} />
      </mesh>
    </group>
  );
}
