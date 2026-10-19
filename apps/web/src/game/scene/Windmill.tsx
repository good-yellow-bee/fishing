import type { LakeSeason } from "@stillwater/shared";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HUB, MILL_SCALE, SAIL_REACH, TOWER_HEIGHT, millPoint, sailAngle } from "./millSails";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const WALLS = "#e9e1d0";
const CAP = "#5c4a3e";
const SNOW = "#eef2f4";
const DOOR = "#4a3a2e";
const STOCK = "#6b5442";
const CLOTH = "#d9ccb2";

/** The tower, its door and window to +z, and its cap, white under winter snow. */
export function towerShape(season: LakeSeason) {
  const body = TOWER_HEIGHT - 0.24;
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.24, 0.33, body, 8), position: [0, body / 2, 0], color: WALLS },
    { geometry: new THREE.ConeGeometry(0.29, 0.3, 8), position: [0, body + 0.15, 0], color: season === "winter" ? SNOW : CAP },
    { geometry: new THREE.BoxGeometry(0.16, 0.28, 0.04), position: [0, 0.14, 0.31], color: DOOR },
    { geometry: new THREE.BoxGeometry(0.09, 0.11, 0.04), position: [0, 0.62, 0.26], color: DOOR },
    { geometry: new THREE.CylinderGeometry(0.05, 0.06, 0.16, 8), position: [0, HUB.y, HUB.z - 0.08], rotation: [Math.PI / 2, 0, 0], color: CAP },
  ]);
}

/** The four sails round the hub, each a stock with its lattice of cloth to one side, turning about z. */
export function sailsShape() {
  return mergePainted(
    [0, 1, 2, 3].flatMap((arm) => {
      const angle = (arm * Math.PI) / 2;
      const along = (reach: number, side: number) =>
        [Math.cos(angle) * reach - Math.sin(angle) * side, Math.sin(angle) * reach + Math.cos(angle) * side, 0] as const;
      return [
        { geometry: new THREE.BoxGeometry(SAIL_REACH, 0.035, 0.03), position: along(SAIL_REACH / 2, 0), rotation: [0, 0, angle] as const, color: STOCK },
        { geometry: new THREE.BoxGeometry(SAIL_REACH * 0.72, 0.15, 0.015), position: along(SAIL_REACH * 0.6, 0.09), rotation: [0, 0, angle] as const, color: CLOTH },
      ];
    }),
  );
}

/** An old tower mill on the far hills whose sails turn with the day's wind (millSails.ts): two draws. */
export function Windmill({ season, wind }: { season: LakeSeason; wind: { x: number; z: number } }) {
  const still = useReducedMotion();
  const sails = useRef<THREE.Mesh>(null);
  const tower = useMemo(() => towerShape(season), [season]);
  const sailShape = useMemo(() => sailsShape(), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(() => () => tower.dispose(), [tower]);
  useEffect(
    () => () => {
      sailShape.dispose();
      material.dispose();
    },
    [sailShape, material],
  );
  useFrame(({ clock }) => {
    if (sails.current) sails.current.rotation.z = sailAngle(clock.elapsedTime, wind, still);
  });
  const at = millPoint();
  return (
    <group name="windmill" position={[at.x, at.y, at.z]} scale={MILL_SCALE}>
      <mesh geometry={tower} material={material} />
      <mesh ref={sails} geometry={sailShape} material={material} position={[0, HUB.y, HUB.z]} />
    </group>
  );
}
