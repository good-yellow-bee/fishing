import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { LakeHour, LakeSeason } from "@stillwater/shared";
import { mergePainted, type PaintedPart } from "./mergeParts";
import { TREE_HEIGHT, orchardLook, orchardTrees } from "./orchardRows";
import { toonRamp } from "./toon";

const BARK = "#6b4e36";
/** Under the night sky the orchard darkens as the hills do. */
const NIGHT_DIM = 0.55;

/** The whole orchard in the season's look, as one painted shape: trunks, their bare limbs, and crowns with any flowers or fruit. */
export function orchardShape(season: LakeSeason, hour: LakeHour) {
  const look = orchardLook(season);
  const dim = hour === "night" ? NIGHT_DIM : 1;
  const paint = (hex: string) => new THREE.Color(hex).multiplyScalar(dim);
  const parts: PaintedPart[] = [];
  orchardTrees().forEach((tree, k) => {
    const s = tree.size;
    const trunk = TREE_HEIGHT * 0.45 * s;
    parts.push({ geometry: new THREE.CylinderGeometry(0.025 * s, 0.035 * s, trunk, 5), position: [tree.x, tree.y + trunk / 2, tree.z], color: paint(BARK) });
    if (!look.crown) {
      // Bare in winter: a few limbs spread from the top of the trunk.
      [-0.7, 0, 0.7].forEach((lean) =>
        parts.push({
          geometry: new THREE.CylinderGeometry(0.008 * s, 0.018 * s, 0.28 * s, 4),
          position: [tree.x + Math.sin(lean) * 0.1 * s, tree.y + trunk + 0.11 * s, tree.z],
          rotation: [0, 0, -lean],
          color: paint(BARK),
        }),
      );
      return;
    }
    const crownY = tree.y + trunk + 0.14 * s;
    parts.push({ geometry: new THREE.IcosahedronGeometry(0.2 * s, 0), position: [tree.x, crownY, tree.z], scale: [1.15, 0.9, 1], rotation: [0, k, 0], color: paint(look.crown) });
    if (look.dots) {
      for (let d = 0; d < 6; d += 1) {
        const turn = (d / 6) * Math.PI * 2 + k;
        parts.push({
          geometry: new THREE.IcosahedronGeometry(0.035 * s, 0),
          position: [tree.x + Math.cos(turn) * 0.17 * s, crownY + Math.sin(turn * 2.3) * 0.08 * s, tree.z + 0.1 * s + Math.sin(turn) * 0.05 * s],
          color: paint(look.dots),
        });
      }
    }
  });
  return mergePainted(parts);
}

/** The orchard below the farm on the far hills (orchardRows.ts): one draw. */
export function Orchard({ season, hour }: { season: LakeSeason; hour: LakeHour }) {
  const shape = useMemo(() => orchardShape(season, hour), [season, hour]);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(() => () => shape.dispose(), [shape]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh name="orchard" geometry={shape} material={material} />;
}
