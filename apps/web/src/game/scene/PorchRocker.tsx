import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeSoftSpotTexture } from "./Atmosphere";
import { mergePainted } from "./mergeParts";
import { CHAIR_AT, CHAIR_YAW, LANTERN_AT, lanternFlicker, rockerAt } from "./porchRocking";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const WOOD = "#8a6440";
const CARDIGAN = "#6f4e6e";
const TROUSERS = "#3e3a36";
const SKIN = "#e2b48c";
const HAIR = "#d8d4cc";
const SLIPPERS = "#5a3a2e";
const MUG = "#d9e2e8";
const LANTERN = "#2a2a2a";
const FLAME = "#ffcf7a";
/** The seat's height above the rockers. */
const SEAT_Y = 0.42;
/** Drawn a little larger than life, as the cabin is. */
const SCALE = 1.2;

/** The rocking chair: two curved rockers, the seat, and a tall slatted back leaning back, facing +z. */
export function rockingChairShape() {
  return mergePainted([
    ...[-0.22, 0.22].flatMap((x) => [
      // Each rocker, as three short pieces bent round a curve.
      ...[-1, 0, 1].map((k) => ({
        geometry: new THREE.BoxGeometry(0.03, 0.03, 0.26),
        position: [x, 0.03 + Math.abs(k) * 0.03, k * 0.24] as const,
        rotation: [k * 0.25, 0, 0] as const,
        color: WOOD,
      })),
      { geometry: new THREE.CylinderGeometry(0.02, 0.02, SEAT_Y, 5), position: [x, SEAT_Y / 2, 0.15] as const, color: WOOD },
      { geometry: new THREE.CylinderGeometry(0.02, 0.02, SEAT_Y + 0.6, 5), position: [x, (SEAT_Y + 0.6) / 2, -0.2] as const, rotation: [-0.18, 0, 0] as const, color: WOOD },
    ]),
    { geometry: new THREE.BoxGeometry(0.48, 0.04, 0.42), position: [0, SEAT_Y, 0], color: WOOD },
    ...[0.6, 0.78, 0.96].map((y) => ({ geometry: new THREE.BoxGeometry(0.46, 0.06, 0.02), position: [0, y, -0.2 - (y - SEAT_Y) * 0.18] as const, rotation: [-0.18, 0, 0] as const, color: WOOD })),
  ]);
}

/** Someone sitting back in the chair in a cardigan, facing +z, their feet on the ground. */
export function rockerSitterShape() {
  return mergePainted([
    ...[-0.08, 0.08].flatMap((x) => [
      { geometry: new THREE.BoxGeometry(0.12, 0.12, 0.38), position: [x, SEAT_Y + 0.07, 0.12] as const, color: TROUSERS },
      { geometry: new THREE.BoxGeometry(0.11, SEAT_Y, 0.12), position: [x, SEAT_Y / 2 + 0.03, 0.3] as const, color: TROUSERS },
      { geometry: new THREE.BoxGeometry(0.11, 0.06, 0.18), position: [x, 0.04, 0.34] as const, color: SLIPPERS },
    ]),
    { geometry: new THREE.CylinderGeometry(0.15, 0.18, 0.52, 8), position: [0, SEAT_Y + 0.3, -0.06], rotation: [-0.15, 0, 0], color: CARDIGAN },
    { geometry: new THREE.SphereGeometry(0.1, 10, 8), position: [0, SEAT_Y + 0.68, -0.08], color: SKIN },
    { geometry: new THREE.SphereGeometry(0.105, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, SEAT_Y + 0.7, -0.1], color: HAIR },
    // The other hand resting on the arm of the chair.
    { geometry: new THREE.CylinderGeometry(0.042, 0.038, 0.34, 6), position: [-0.19, SEAT_Y + 0.25, 0.02], rotation: [0.9, 0, 0], color: CARDIGAN },
  ]);
}

/** The mug arm, from the shoulder, the mug in the hand. */
export function mugArmShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.042, 0.038, 0.4, 6), position: [0, -0.2, 0], color: CARDIGAN },
    { geometry: new THREE.SphereGeometry(0.04, 6, 4), position: [0, -0.41, 0.02], color: SKIN },
    { geometry: new THREE.CylinderGeometry(0.04, 0.04, 0.09, 8), position: [0, -0.42, 0.08], color: MUG },
  ]);
}

/** The lantern: a dark frame and cap round a glass, the flame inside drawn apart so it can glow. */
export function porchLanternShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.07, 0.08, 0.03, 8), position: [0, 0.015, 0], color: LANTERN },
    { geometry: new THREE.ConeGeometry(0.08, 0.07, 8), position: [0, 0.27, 0], color: LANTERN },
    { geometry: new THREE.TorusGeometry(0.04, 0.008, 4, 10), position: [0, 0.33, 0], color: LANTERN },
    ...[0, 1, 2, 3].map((k) => ({
      geometry: new THREE.BoxGeometry(0.012, 0.22, 0.012),
      position: [Math.cos((k * Math.PI) / 2 + 0.78) * 0.065, 0.13, Math.sin((k * Math.PI) / 2 + 0.78) * 0.065] as const,
      color: LANTERN,
    })),
  ]);
}

/** Someone rocking in a chair in front of the far cabin of an evening, a lantern beside them (porchRocking.ts). */
export function PorchRocker() {
  const still = useReducedMotion();
  const rocker = useRef<THREE.Group>(null);
  const arm = useRef<THREE.Group>(null);
  const glow = useRef<THREE.Sprite>(null);
  const shapes = useMemo(
    () => ({ chair: rockingChairShape(), sitter: rockerSitterShape(), arm: mugArmShape(), lantern: porchLanternShape(), flame: new THREE.CylinderGeometry(0.035, 0.035, 0.14, 8) }),
    [],
  );
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const spot = useMemo(() => makeSoftSpotTexture(0.1), []);
  const lights = useMemo(
    () => ({
      flame: new THREE.MeshBasicMaterial({ color: FLAME, toneMapped: false }),
      glow: new THREE.SpriteMaterial({ map: spot, color: "#ffb860", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    }),
    [spot],
  );
  useEffect(
    () => () => {
      [...Object.values(shapes), material, spot, ...Object.values(lights)].forEach((item) => item.dispose());
    },
    [shapes, material, spot, lights],
  );
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const pose = rockerAt(time, still);
    // Tipping back on the rockers lifts the front; the pivot is where they touch the ground.
    if (rocker.current) rocker.current.rotation.x = -pose.tip;
    if (arm.current) arm.current.rotation.x = -(0.7 + pose.sip * 1.75);
    const flicker = lanternFlicker(time, still);
    lights.glow.opacity = 0.75 * flicker;
    glow.current?.scale.setScalar(1.3 * flicker);
  });
  return (
    <group name="porch-rocker">
      <group position={[CHAIR_AT.x, 0, CHAIR_AT.z]} rotation={[0, CHAIR_YAW, 0]} scale={SCALE}>
        <group ref={rocker}>
          <mesh geometry={shapes.chair} material={material} castShadow />
          <mesh geometry={shapes.sitter} material={material} castShadow />
          <group ref={arm} position={[0.19, SEAT_Y + 0.5, -0.05]}>
            <mesh geometry={shapes.arm} material={material} />
          </group>
        </group>
      </group>
      <group position={[LANTERN_AT.x, 0, LANTERN_AT.z]} scale={SCALE}>
        <mesh geometry={shapes.lantern} material={material} />
        <mesh geometry={shapes.flame} material={lights.flame} position={[0, 0.13, 0]} />
        <sprite ref={glow} material={lights.glow} position={[0, 0.15, 0]} />
      </group>
    </group>
  );
}
