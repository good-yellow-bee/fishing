import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeSoftSpotTexture } from "./Atmosphere";
import { FIRE_AT, flicker } from "./campfireSmoke";
import { mergeParts, mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { SmokePlume, type SmokeHour } from "./SmokePlume";
import { toonRamp } from "./toon";

const NO_WIND = { x: 0, z: 0 };
const STONES = 9;
const RING = 0.34;
const STONE = "#8a8780";
const WOOD = "#3b2c22";

/** The ring of stones and the charred sticks in it, in one painted shape so the pit costs one draw. */
export function firePitShape() {
  return mergePainted([
    ...Array.from({ length: STONES }, (_, i) => {
      const a = (i / STONES) * Math.PI * 2;
      return {
        geometry: new THREE.DodecahedronGeometry(0.09 + (i % 3) * 0.015, 0),
        position: [Math.cos(a) * RING, 0.05, Math.sin(a) * RING] as const,
        rotation: [i, i * 1.7, 0] as const,
        scale: [1, 0.7, 1] as const,
        color: STONE,
      };
    }),
    ...[0, 1.1, 2.2].map((yaw) => ({
      geometry: new THREE.CylinderGeometry(0.035, 0.04, 0.62, 6),
      position: [0, 0.06, 0] as const,
      rotation: [0, yaw, Math.PI / 2 - 0.2] as const,
      color: WOOD,
    })),
  ]);
}

/** The flame's outer tongues, in one shape. */
export function flameShape() {
  return mergeParts([
    { geometry: new THREE.ConeGeometry(0.15, 0.36, 7), position: [0, 0.17, 0] },
    ...[0, 2.1, 4.2].map((a) => ({ geometry: new THREE.ConeGeometry(0.07, 0.22, 6), position: [Math.cos(a) * 0.08, 0.11, Math.sin(a) * 0.08] as const })),
  ]);
}
/**
 * The fire pit by the shack: a ring of stones round a few charred sticks, always there, and from
 * dusk to dawn (`lit`) a flickering fire whose smoke rises and leans away on the day's wind.
 * `at` sets another fire pit elsewhere, such as the campers' on the far bank.
 */
export function Campfire({ lit, hour, wind = NO_WIND, at = FIRE_AT }: { lit: boolean; hour: SmokeHour; wind?: { x: number; z: number }; at?: { x: number; z: number } }) {
  const still = useReducedMotion();
  const flames = useRef<THREE.Group>(null);
  const glow = useRef<THREE.Mesh>(null);
  const shapes = useMemo(() => ({ pit: firePitShape(), flame: flameShape() }), []);
  const pit = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const flame = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ff9a3c", toneMapped: false, transparent: true, opacity: 0.92 }), []);
  const core = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffe08a", toneMapped: false }), []);
  const spot = useMemo(() => makeSoftSpotTexture(0.1), []);
  const glowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: spot,
        color: "#ff9a4a",
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [spot],
  );

  useEffect(
    () => () => {
      [shapes.pit, shapes.flame, pit, flame, core, spot, glowMaterial].forEach((item) => item.dispose());
    },
    [shapes, pit, flame, core, spot, glowMaterial],
  );

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const burn = flicker(time, still);
    flames.current?.scale.set(1.3, 1.3 * burn * (0.9 + 0.1 * Math.sin(time * 17)), 1.3);
    glow.current?.scale.setScalar(2.4 * burn);
    glowMaterial.opacity = (hour === "night" ? 0.7 : 0.45) * burn;
  });

  return (
    <group name="campfire" position={[at.x, 0, at.z]}>
      <mesh geometry={shapes.pit} material={pit} />
      {lit && (
        <>
          <group ref={flames} position={[0, 0.06, 0]} scale={1.3}>
            <mesh geometry={shapes.flame} material={flame} />
            <mesh material={core} position={[0, 0.1, 0]}>
              <coneGeometry args={[0.07, 0.18, 6]} />
            </mesh>
          </group>
          <mesh ref={glow} material={glowMaterial} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}>
            <planeGeometry args={[1, 1]} />
          </mesh>
          <SmokePlume hour={hour} wind={wind} />
        </>
      )}
    </group>
  );
}
