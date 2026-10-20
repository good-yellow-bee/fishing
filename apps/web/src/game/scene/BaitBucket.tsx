import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { aboard } from "./boat";
import { bucketSpot } from "./bucketSpot";
import { mergePainted } from "./mergeParts";
import { anglerPose } from "./pose";
import { toonRamp } from "./toon";

const TIN = "#8c98a0";
const RIM = "#5f6b72";
const WATER = "#3f6f7c";
const SHINER = "#d9e4ea";
/** The bucket's height and its rim's radius. */
const HEIGHT = 0.2;
const RIM_R = 0.1;

function bucketShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(RIM_R, RIM_R * 0.8, HEIGHT, 12, 1, true), position: [0, HEIGHT / 2, 0], color: TIN },
    { geometry: new THREE.CircleGeometry(RIM_R * 0.8, 12).rotateX(-Math.PI / 2), position: [0, 0.005, 0], color: RIM },
    { geometry: new THREE.TorusGeometry(RIM_R, 0.008, 4, 16).rotateX(Math.PI / 2), position: [0, HEIGHT, 0], color: RIM },
    { geometry: new THREE.TorusGeometry(RIM_R * 0.95, 0.005, 3, 12, Math.PI), position: [0, HEIGHT, 0], color: RIM },
    { geometry: new THREE.CircleGeometry(RIM_R * 0.94, 12).rotateX(-Math.PI / 2), position: [0, HEIGHT * 0.8, 0], color: WATER },
  ]);
}

/** Where each spare shiner lies across the water in the bucket. */
const SHINERS: readonly [number, number, number][] = [
  [-0.03, 0.02, 0.4],
  [0.035, -0.02, -0.9],
  [0, 0.04, 2.1],
];

/** The bait bucket at the angler's feet while they stand still, a shiner showing for each spare in it (bucketSpot.ts). */
export function BaitBucket({ count }: { count: number }) {
  const group = useRef<THREE.Group>(null);
  const shape = useMemo(bucketShape, []);
  const fish = useMemo(() => new THREE.SphereGeometry(1, 6, 4), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const shiner = useMemo(() => new THREE.MeshToonMaterial({ color: SHINER, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      [shape, fish, material, shiner].forEach((item) => item.dispose());
    },
    [shape, fish, material, shiner],
  );
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const spot = count > 0 && !anglerPose.moving && !aboard() ? bucketSpot(anglerPose.x, anglerPose.z, anglerPose.yaw) : null;
    g.visible = spot !== null;
    if (spot) g.position.set(spot.x, spot.y, spot.z);
  });
  return (
    <group ref={group} name="bait-bucket" visible={false}>
      <mesh geometry={shape} material={material} castShadow />
      {SHINERS.map(([x, z, turn], i) => (
        <mesh key={i} geometry={fish} material={shiner} visible={i < count} position={[x, HEIGHT * 0.8 + 0.008, z]} rotation={[0, turn, 0]} scale={[0.012, 0.008, 0.045]} />
      ))}
    </group>
  );
}
