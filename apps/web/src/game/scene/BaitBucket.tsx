import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AERATOR_BUBBLES, aeratorBubble, STONE_X, STONE_Z } from "./aeratorBubbles";
import { aboard } from "./boat";
import { bucketSpot } from "./bucketSpot";
import { mergePainted, mergeParts } from "./mergeParts";
import { anglerPose } from "./pose";
import { STILL_TIME, useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const TIN = "#8c98a0";
const RIM = "#5f6b72";
const WATER = "#3f6f7c";
const SHINER = "#d9e4ea";
const PUMP = "#3d5a4a";
const TUBE = "#2b3236";
const BUBBLE = "#eef8f4";
/** The bucket's height and its rim's radius. */
const HEIGHT = 0.2;
const RIM_R = 0.1;
const WATER_Y = HEIGHT * 0.8;
/** The pump box hangs outside the rim on the bucket's back, away from the angler's legs; its tube climbs over the rim and lies across the water to the airstone. */
const TUBE_X = -0.05;
const TUBE_Z = -0.045;
const PUMP_OUT = RIM_R + 0.0175;
const TUBE_IN = Math.hypot(TUBE_X, TUBE_Z);
const TUBE_Y = HEIGHT + 0.015;
const TUBE_R = 0.003;

/** The pump and its tube, built facing -z and turned toward where the tube dips in. */
function pumpShape() {
  return mergePainted([
    { geometry: new THREE.BoxGeometry(0.05, 0.05, 0.035), position: [0, HEIGHT - 0.03, -PUMP_OUT], color: PUMP },
    { geometry: new THREE.BoxGeometry(0.014, 0.006, 0.045), position: [-0.012, HEIGHT + 0.011, -PUMP_OUT + 0.01], color: TUBE },
    { geometry: new THREE.CylinderGeometry(TUBE_R, TUBE_R, 0.02, 5), position: [0, HEIGHT + 0.005, -PUMP_OUT], color: TUBE },
    { geometry: new THREE.CylinderGeometry(TUBE_R, TUBE_R, PUMP_OUT - TUBE_IN, 5).rotateX(Math.PI / 2), position: [0, TUBE_Y, -(PUMP_OUT + TUBE_IN) / 2], color: TUBE },
    { geometry: new THREE.CylinderGeometry(TUBE_R, TUBE_R, TUBE_Y - WATER_Y + 0.005, 5), position: [0, (TUBE_Y + WATER_Y - 0.005) / 2, -TUBE_IN], color: TUBE },
  ]).rotateY(Math.atan2(-TUBE_X, -TUBE_Z));
}

/** The tube's run across the water, from where it dips in to over the airstone. */
const RUN = Math.hypot(STONE_X - TUBE_X, STONE_Z - TUBE_Z);

function bucketShape(aerated: boolean) {
  const bucket = mergePainted([
    { geometry: new THREE.CylinderGeometry(RIM_R, RIM_R * 0.8, HEIGHT, 12, 1, true), position: [0, HEIGHT / 2, 0], color: TIN },
    { geometry: new THREE.CircleGeometry(RIM_R * 0.8, 12).rotateX(-Math.PI / 2), position: [0, 0.005, 0], color: RIM },
    { geometry: new THREE.TorusGeometry(RIM_R, 0.008, 4, 16).rotateX(Math.PI / 2), position: [0, HEIGHT, 0], color: RIM },
    { geometry: new THREE.TorusGeometry(RIM_R * 0.95, 0.005, 3, 12, Math.PI), position: [0, HEIGHT, 0], color: RIM },
    { geometry: new THREE.CircleGeometry(RIM_R * 0.94, 12).rotateX(-Math.PI / 2), position: [0, WATER_Y, 0], color: WATER },
  ]);
  if (!aerated) return bucket;
  const run = mergePainted([
    {
      geometry: new THREE.CylinderGeometry(TUBE_R, TUBE_R, RUN, 5).rotateX(Math.PI / 2).rotateY(Math.atan2(STONE_X - TUBE_X, STONE_Z - TUBE_Z)),
      position: [(TUBE_X + STONE_X) / 2, WATER_Y + 0.002, (TUBE_Z + STONE_Z) / 2],
      color: TUBE,
    },
  ]);
  return mergeParts([{ geometry: bucket }, { geometry: pumpShape() }, { geometry: run }]);
}

/** Where each spare shiner lies across the water in the bucket. */
const SHINERS: readonly [number, number, number][] = [
  [-0.03, 0.02, 0.4],
  [0.035, -0.02, -0.9],
  [0, 0.04, 2.1],
];

/**
 * The bait bucket at the angler's feet while they stand still, a shiner showing for each spare in it (bucketSpot.ts).
 * With the shack's aerator fitted, its pump hangs on the rim and bubbles break over the water (held still under reduced motion).
 */
export function BaitBucket({ count, aerated = false }: { count: number; aerated?: boolean }) {
  const group = useRef<THREE.Group>(null);
  const bubbles = useRef<THREE.InstancedMesh>(null);
  const still = useReducedMotion();
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const shape = useMemo(() => bucketShape(aerated), [aerated]);
  const fish = useMemo(() => new THREE.SphereGeometry(1, 6, 4), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const shiner = useMemo(() => new THREE.MeshToonMaterial({ color: SHINER, gradientMap: toonRamp() }), []);
  // Lit like the shiners, so the bubbles dim at night instead of glowing.
  const bubble = useMemo(() => new THREE.MeshToonMaterial({ color: BUBBLE, transparent: true, opacity: 0.8, depthWrite: false, gradientMap: toonRamp() }), []);
  useEffect(() => () => shape.dispose(), [shape]);
  useEffect(
    () => () => {
      [fish, material, shiner, bubble].forEach((item) => item.dispose());
    },
    [fish, material, shiner, bubble],
  );
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const spot = count > 0 && !anglerPose.moving && !aboard() ? bucketSpot(anglerPose.x, anglerPose.z, anglerPose.yaw) : null;
    g.visible = spot !== null;
    if (!spot) return;
    g.position.set(spot.x, spot.y, spot.z);
    // Turned with the angler, so the pump on its back faces the camera behind them.
    g.rotation.y = anglerPose.yaw;
    const beads = bubbles.current;
    if (!beads) return;
    const time = still ? STILL_TIME : clock.elapsedTime;
    for (let i = 0; i < AERATOR_BUBBLES; i += 1) {
      const b = aeratorBubble(i, time, WATER_Y);
      scratch.position.set(b.x, b.y, b.z);
      scratch.scale.setScalar(b.size);
      scratch.updateMatrix();
      beads.setMatrixAt(i, scratch.matrix);
    }
    beads.instanceMatrix.needsUpdate = true;
  });
  return (
    <group ref={group} name="bait-bucket" visible={false}>
      <mesh geometry={shape} material={material} castShadow />
      {SHINERS.map(([x, z, turn], i) => (
        <mesh key={i} geometry={fish} material={shiner} visible={i < count} position={[x, WATER_Y + 0.008, z]} rotation={[0, turn, 0]} scale={[0.012, 0.008, 0.045]} />
      ))}
      {aerated && <instancedMesh ref={bubbles} args={[fish, bubble, AERATOR_BUBBLES]} frustumCulled={false} />}
    </group>
  );
}
