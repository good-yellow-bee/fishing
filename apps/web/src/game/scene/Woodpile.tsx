import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { LakeSeason } from "@stillwater/shared";
import { mergePainted } from "./mergeParts";
import { toonRamp } from "./toon";
import { BLOCK_AT, LOG_LENGTH, LOG_R, WOODPILE_AT, woodpileLogs, woodpileSnowy } from "./woodStack";

const BARK = "#6b4a32";
const GRAIN = "#d8b07a";
const STAKE = "#5a3e2a";
const STUMP = "#7a5638";
const HANDLE = "#b98a55";
const STEEL = "#8c9399";
const SNOW = "#f3f6f8";

/** The stacked logs, their pale cut ends toward +z, between a stake at either side, with a cap of snow in winter. */
export function woodpileShape(season: LakeSeason) {
  const logs = woodpileLogs(season);
  const width = Math.max(...logs.map((log) => Math.abs(log.x))) + LOG_R;
  const top = Math.max(...logs.map((log) => log.y)) + LOG_R;
  const ridge = Math.max(...logs.filter((log) => log.y + LOG_R >= top - 1e-9).map((log) => Math.abs(log.x))) + LOG_R;
  return mergePainted([
    ...logs.flatMap((log, i) => {
      // Each split log is a little different in girth and sits a touch in or out.
      const r = LOG_R * (0.86 + ((i * 37) % 11) / 80);
      const dz = (((i * 53) % 7) - 3) * 0.012;
      return [
        { geometry: new THREE.CylinderGeometry(r, r, LOG_LENGTH, 7), position: [log.x, log.y, dz] as const, rotation: [Math.PI / 2, 0, 0] as const, color: BARK },
        { geometry: new THREE.CircleGeometry(r * 0.82, 7), position: [log.x, log.y, dz + LOG_LENGTH / 2 + 0.002] as const, color: GRAIN },
      ];
    }),
    ...[-1, 1].map((side) => ({
      geometry: new THREE.BoxGeometry(0.05, top + 0.12, 0.05),
      position: [side * (width + 0.04), (top + 0.12) / 2, 0] as const,
      color: STAKE,
    })),
    // The snow drifts over the top row in a soft mound.
    ...(woodpileSnowy(season) ? [{ geometry: new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, top - 0.035, 0] as const, scale: [ridge + 0.04, 0.07, LOG_LENGTH / 2 + 0.02] as const, color: SNOW }] : []),
  ]);
}

/** The chopping block with the axe sunk in its top at a slant, and snow on it in winter. */
export function blockShape(season: LakeSeason) {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.2, 0.22, 0.36, 9), position: [0, 0.18, 0], color: STUMP },
    { geometry: new THREE.CylinderGeometry(0.17, 0.17, 0.01, 9), position: [0, 0.362, 0], color: GRAIN },
    { geometry: new THREE.BoxGeometry(0.12, 0.08, 0.025), position: [0.03, 0.38, 0], rotation: [0, 0, 0.35], color: STEEL },
    { geometry: new THREE.CylinderGeometry(0.016, 0.02, 0.62, 6), position: [0.2, 0.62, 0], rotation: [0, 0, -0.55], color: HANDLE },
    ...(woodpileSnowy(season) ? [{ geometry: new THREE.CylinderGeometry(0.18, 0.2, 0.05, 9), position: [-0.04, 0.38, 0] as const, color: SNOW }] : []),
  ]);
}

/** The campfire's woodpile and chopping block west of the fire. */
export function Woodpile({ season }: { season: LakeSeason }) {
  const shapes = useMemo(() => ({ pile: woodpileShape(season), block: blockShape(season) }), [season]);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      shapes.pile.dispose();
      shapes.block.dispose();
    },
    [shapes],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <group name="woodpile">
      <mesh geometry={shapes.pile} material={material} position={[WOODPILE_AT.x, 0, WOODPILE_AT.z]} castShadow />
      <mesh geometry={shapes.block} material={material} position={[BLOCK_AT.x, 0, BLOCK_AT.z]} rotation={[0, 0.5, 0]} castShadow />
    </group>
  );
}
