import type { LakeHour, LakeSeason } from "@stillwater/shared";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { cabinWindowsLit, chimneySmoking } from "./cabinLook";
import { BARN_OFFSET, CHIMNEY_TOP, FARM_AT, FARM_SCALE, farmPoint } from "./farmstead";
import { mergePainted, mergeParts, type PaintedPart } from "./mergeParts";
import { SmokePlume } from "./SmokePlume";
import { toonRamp } from "./toon";

const WALLS = "#ece6da";
const ROOF = "#9c3b2e";
const BARN = "#8e3a2c";
const BARN_ROOF = "#4a4440";
const DOOR = "#5a4030";
const SNOW = "#eef2f4";
const LIT = "#ffcf73";
const DARK = "#38404c";

/** A pitched roof, ridge along x, `width` across the gable and `length` along the ridge, its eaves at the origin. */
function roofGeometry(width: number, length: number, rise: number) {
  const shape = new THREE.Shape([new THREE.Vector2(-width / 2, 0), new THREE.Vector2(width / 2, 0), new THREE.Vector2(0, rise)]);
  return new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false }).translate(0, 0, -length / 2).rotateY(Math.PI / 2);
}

/** The farmhouse and barn, their fronts to +z, the house's ground at the origin. Roofs white under winter snow. */
export function farmShape(season: LakeSeason) {
  const snow = season === "winter";
  const house: PaintedPart[] = [
    { geometry: new THREE.BoxGeometry(1.1, 0.7, 0.7), position: [0, 0.35, 0], color: WALLS },
    { geometry: roofGeometry(0.86, 1.22, 0.4), position: [0, 0.7, 0], color: snow ? SNOW : ROOF },
    { geometry: new THREE.BoxGeometry(0.1, 0.3, 0.1), position: [CHIMNEY_TOP.x, CHIMNEY_TOP.y - 0.15, CHIMNEY_TOP.z], color: "#7a6a5e" },
    { geometry: new THREE.BoxGeometry(0.18, 0.34, 0.02), position: [0, 0.17, 0.355], color: DOOR },
  ];
  const barn: PaintedPart[] = [
    { geometry: new THREE.BoxGeometry(0.9, 0.85, 0.8), position: [0, 0.425, 0], color: BARN },
    { geometry: roofGeometry(0.96, 1, 0.45), position: [0, 0.85, 0], color: snow ? SNOW : BARN_ROOF },
    { geometry: new THREE.BoxGeometry(0.4, 0.5, 0.02), position: [0, 0.25, 0.405], color: "#d9cfbf" },
  ];
  const at = farmPoint(FARM_AT.x, FARM_AT.y);
  const barnAt = farmPoint(FARM_AT.x + BARN_OFFSET.x, FARM_AT.y + BARN_OFFSET.y);
  return mergeParts([
    { geometry: mergePainted(house) },
    { geometry: mergePainted(barn), position: [(barnAt.x - at.x) / FARM_SCALE, (barnAt.y - at.y) / FARM_SCALE, (barnAt.z - at.z) / FARM_SCALE], rotation: [0, -0.15, 0] },
  ]);
}

/** The farmhouse's front windows, either side of the door. */
export function windowsShape() {
  return mergeParts(
    [
      [-0.32, 0.38],
      [0.32, 0.38],
    ].map(([x, y]) => ({ geometry: new THREE.PlaneGeometry(0.16, 0.16), position: [x!, y!, 0.352] as const })),
  );
}

/** A farmhouse and barn on the hills behind the far bank, their windows warm and the chimney smoking when the cabin's are (farmstead.ts). */
export function Farmstead({ season, hour, wind }: { season: LakeSeason; hour: LakeHour; wind: { x: number; z: number } }) {
  const shape = useMemo(() => farmShape(season), [season]);
  const windows = useMemo(() => windowsShape(), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const glass = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  glass.color.set(cabinWindowsLit(hour) ? LIT : DARK);
  useEffect(() => () => shape.dispose(), [shape]);
  useEffect(
    () => () => {
      windows.dispose();
      material.dispose();
      glass.dispose();
    },
    [windows, material, glass],
  );
  const at = farmPoint(FARM_AT.x, FARM_AT.y);
  return (
    <group name="farmstead" position={[at.x, at.y, at.z]} scale={FARM_SCALE}>
      <mesh geometry={shape} material={material} />
      <mesh geometry={windows} material={glass} />
      {chimneySmoking(hour, season) && (
        <group position={[CHIMNEY_TOP.x, CHIMNEY_TOP.y - 0.55, CHIMNEY_TOP.z]}>
          <SmokePlume hour={hour} wind={wind} scale={0.8} />
        </group>
      )}
    </group>
  );
}
