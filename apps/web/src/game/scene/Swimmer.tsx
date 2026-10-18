import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BoatWake } from "./BoatWake";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { TOWEL_AT, swimmerAt } from "./swimLane";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const SKIN = "#e2b48c";
const CAP = "#e8542f";
const SUIT = "#2f5f9e";
const TOWEL_A = "#e0533f";
const TOWEL_B = "#f4ecd8";
const BAG = "#3e8f86";
const RIPPLE = "#e4f0ec";
/** The figure is drawn this much larger than life, so a head bobbing on the far water still reads. */
const SCALE = 1.5;

/** The swimmer's head in a bright cap, and the shoulders just under the surface, facing +z. */
export function swimmerShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(0.1, 10, 8), position: [0, 0.07, 0.02], color: SKIN },
    { geometry: new THREE.SphereGeometry(0.106, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, 0.09, 0.01], color: CAP },
    { geometry: new THREE.CapsuleGeometry(0.13, 0.3, 4, 8), position: [0, -0.1, -0.2], rotation: [Math.PI / 2 - 0.25, 0, 0], color: SUIT },
  ]);
}

/** One arm, reaching forward along +z from the shoulder. */
export function swimArmShape() {
  return mergePainted([{ geometry: new THREE.CylinderGeometry(0.035, 0.03, 0.5, 6), position: [0, 0, 0.25], rotation: [Math.PI / 2, 0, 0], color: SKIN }]);
}

/** The striped towel spread on the sand, and the bag beside it. */
export function towelShape() {
  return mergePainted([
    ...Array.from({ length: 5 }, (_, i) => ({
      geometry: new THREE.BoxGeometry(0.8, 0.02, 0.3),
      position: [0, 0.01, -0.6 + i * 0.3] as const,
      color: i % 2 === 0 ? TOWEL_A : TOWEL_B,
    })),
    { geometry: new THREE.BoxGeometry(0.34, 0.24, 0.18), position: [0.7, 0.12, -0.4], rotation: [0, 0.4, 0], color: BAG },
    { geometry: new THREE.TorusGeometry(0.1, 0.015, 4, 10, Math.PI), position: [0.7, 0.24, -0.4], rotation: [0, 0.4, 0], color: BAG },
  ]);
}

/** Someone swimming breaststroke up and down off the far bank on a hot summer's day, their towel on the sand. */
export function Swimmer() {
  const still = useReducedMotion();
  const body = useRef<THREE.Group>(null);
  const arms = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const ripple = useRef<THREE.Mesh>(null);
  const shapes = useMemo(() => ({ body: swimmerShape(), arm: swimArmShape(), towel: towelShape(), ring: new THREE.RingGeometry(0.85, 1, 24) }), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const rippleMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: RIPPLE, transparent: true, depthWrite: false, opacity: 0 }), []);
  useEffect(
    () => () => {
      [...Object.values(shapes), material, rippleMaterial].forEach((item) => item.dispose());
    },
    [shapes, material, rippleMaterial],
  );
  const course = useCallback((time: number) => swimmerAt(time), []);
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const pose = swimmerAt(time, still);
    const water = waterHeight(pose.x, pose.z, still ? 0 : time);
    if (body.current) {
      body.current.position.set(pose.x, water - 0.05 + 0.06 * pose.lift * SCALE, pose.z);
      body.current.rotation.y = pose.yaw;
    }
    // Breaststroke: the arms reach forward together, sweep out and round to the chest, and shoot forward again for the glide.
    const sweep = pose.going ? (pose.stroke < 0.4 ? Math.sin((pose.stroke / 0.4) * Math.PI) * 1.2 : 0) : 0.9 + 0.3 * Math.sin(time * 3);
    const tuck = pose.going ? (pose.stroke < 0.4 ? Math.sin((pose.stroke / 0.4) * Math.PI * 0.5) : Math.max(0, 1 - (pose.stroke - 0.4) / 0.2)) : 0.5;
    [1, -1].forEach((side, i) => {
      const arm = arms[i]!.current;
      if (!arm) return;
      arm.rotation.y = side * sweep;
      arm.scale.z = 1 - 0.55 * tuck;
    });
    // A ring spreads from the swimmer with each pull, fading as it goes.
    if (ripple.current) {
      const k = pose.going ? pose.stroke : (time * 0.6) % 1;
      ripple.current.position.set(pose.x, water + 0.03, pose.z);
      ripple.current.scale.setScalar(0.25 + 0.9 * k);
      rippleMaterial.opacity = still ? 0 : 0.45 * (1 - k);
    }
  });
  return (
    <group name="swimmer">
      <group ref={body} scale={SCALE}>
        <mesh geometry={shapes.body} material={material} />
        {[1, -1].map((side, i) => (
          <group key={side} ref={arms[i]} position={[side * 0.12, -0.03, 0.05]}>
            <mesh geometry={shapes.arm} material={material} />
          </group>
        ))}
      </group>
      <mesh ref={ripple} geometry={shapes.ring} material={rippleMaterial} rotation={[-Math.PI / 2, 0, 0]} renderOrder={4} />
      <BoatWake at={course} stern={0.4} still={still} size={0.4} />
      <group position={[TOWEL_AT.x, 0.02, TOWEL_AT.z]} rotation={[0, TOWEL_AT.yaw, 0]}>
        <mesh geometry={shapes.towel} material={material} receiveShadow />
      </group>
    </group>
  );
}
