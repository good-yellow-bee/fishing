import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { LakeHour } from "@stillwater/shared";
import { stripedFields } from "./HayBales";
import { RAPESEED_FIELD, RAPESEED_ROWS, ROW_COUNT } from "./rapeseedField";
import { toonRamp } from "./toon";

/** A little light of their own by the hour, so the flowers stay bright yellow under the hills' shade and haze by day, and fade with the light. */
const GLOW: Record<LakeHour, string> = { dawn: "#3a3004", day: "#806a08", dusk: "#3a3004", night: "#000000" };

/** The spring's yellow rapeseed field under the windmill on the far hills (rapeseedField.ts): one draw. */
export function Rapeseed({ hour }: { hour: LakeHour }) {
  const field = useMemo(() => stripedFields(RAPESEED_ROWS, hour, [RAPESEED_FIELD], ROW_COUNT), [hour]);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp(), emissive: GLOW[hour] }), [hour]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => field.dispose(), [field]);
  return <mesh name="rapeseed" geometry={field} material={material} />;
}
