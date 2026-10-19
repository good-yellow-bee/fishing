import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeSoftSpotTexture } from "./Atmosphere";
import { LANTERN_COLOR, LANTERN_LIGHTS, LANTERN_REACH, LANTERNS, lanternFlicker } from "./lanternLight";
import { mergeParts, type Part } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

/** Candela at full burn; the dock's two lanterns share one light. */
const LIGHT_INTENSITY = 5;
const HALO_SIZE = 0.9;

/** Every lantern's dark cap and base, and the shack lantern's pole, as one shape; and every lantern's lit glass as another. */
export function lanternShapes() {
  const frames: Part[] = LANTERNS.flatMap((l) => [
    { geometry: new THREE.BoxGeometry(0.13, 0.03, 0.13), position: [l.x, l.y + 0.1, l.z] as const },
    { geometry: new THREE.BoxGeometry(0.12, 0.03, 0.12), position: [l.x, l.y - 0.09, l.z] as const },
  ]);
  // The shack lantern hangs from a short pole.
  const shack = LANTERNS[2]!;
  frames.push({ geometry: new THREE.CylinderGeometry(0.03, 0.04, shack.y + 0.1, 6), position: [shack.x, shack.y / 2, shack.z] });
  return {
    frames: mergeParts(frames),
    glass: mergeParts(LANTERNS.map((l) => ({ geometry: new THREE.BoxGeometry(0.09, 0.15, 0.09), position: [l.x, l.y, l.z] as const }))),
  };
}

/** Lanterns lit at `level` (0..1); mounted only from dusk. Three draws in all: the frames, the glass and the halos. */
export function Lanterns({ level }: { level: number }) {
  const still = useReducedMotion();
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  const halos = useRef<THREE.InstancedMesh>(null);
  const shapes = useMemo(() => ({ ...lanternShapes(), halo: new THREE.PlaneGeometry(1, 1) }), []);
  const scratch = useMemo(() => new THREE.Object3D(), []);
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
      Object.values(shapes).forEach((shape) => shape.dispose());
    },
    [texture, halo, glass, frame, shapes],
  );

  useFrame(({ clock, camera }) => {
    const time = clock.elapsedTime;
    lights.current.forEach((light, i) => {
      if (light) light.intensity = LIGHT_INTENSITY * level * lanternFlicker(time, i + 1, still);
    });
    const glow = halos.current;
    if (glow) {
      LANTERNS.forEach((lantern, i) => {
        scratch.position.set(lantern.x, lantern.y, lantern.z);
        scratch.quaternion.copy(camera.quaternion);
        scratch.scale.setScalar(HALO_SIZE * (0.6 + 0.4 * level) * lanternFlicker(time, lantern.seed, still));
        scratch.updateMatrix();
        glow.setMatrixAt(i, scratch.matrix);
      });
      glow.instanceMatrix.needsUpdate = true;
    }
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
      <mesh geometry={shapes.frames} material={frame} />
      <mesh geometry={shapes.glass} material={glass} />
      <instancedMesh ref={halos} args={[shapes.halo, halo, LANTERNS.length]} frustumCulled={false} renderOrder={6} />
    </group>
  );
}
