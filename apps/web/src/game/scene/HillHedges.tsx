import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { LakeHour, LakeSeason } from "@stillwater/shared";
import { mergePainted, type PaintedPart } from "./mergeParts";
import { BUSH, hedgeBushes, hedgeColor } from "./hedgeRows";
import { toonRamp } from "./toon";

/** Every hedgerow bush in the season's look, as one painted shape. */
export function hedgeShape(season: LakeSeason, hour: LakeHour) {
  const parts: PaintedPart[] = hedgeBushes().map((bush, k) => {
    const { hex, dim } = hedgeColor(season, hour, bush.shade);
    return {
      geometry: new THREE.IcosahedronGeometry(BUSH * bush.size, 0),
      position: [bush.x, bush.y, bush.z],
      scale: [1.3, 0.75, 1],
      rotation: [0, k, 0],
      color: new THREE.Color(hex).multiplyScalar(dim),
    };
  });
  return mergePainted(parts);
}

/** The hedgerows across the upper hills (hedgeRows.ts): one draw. */
export function HillHedges({ season, hour }: { season: LakeSeason; hour: LakeHour }) {
  const shape = useMemo(() => hedgeShape(season, hour), [season, hour]);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(() => () => shape.dispose(), [shape]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh name="hill-hedges" geometry={shape} material={material} />;
}
