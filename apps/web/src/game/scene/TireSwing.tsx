import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { LakeSeason } from "@stillwater/shared";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { ROPE_LENGTH, ROPE_TOP, SWING_AT, TYRE_R, swingAngles, tyreSnowy } from "./swingPendulum";
import { toonRamp } from "./toon";

const ROPE = "#c9b68a";
const RUBBER = "#2b2b2e";
const SNOW = "#f3f6f8";

/** The rope and the tyre hanging from its end, upright, hung from the knot at the origin. */
export function swingShape(season: LakeSeason) {
  const tyreMiddle = -ROPE_LENGTH - TYRE_R;
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.014, 0.014, ROPE_LENGTH, 5), position: [0, -ROPE_LENGTH / 2, 0], color: ROPE },
    // The knot round the top of the tyre.
    { geometry: new THREE.SphereGeometry(0.035, 6, 4), position: [0, -ROPE_LENGTH, 0], color: ROPE },
    { geometry: new THREE.TorusGeometry(TYRE_R - 0.06, 0.075, 8, 16), position: [0, tyreMiddle, 0], scale: [1, 1, 1.4], color: RUBBER },
    ...(tyreSnowy(season)
      ? [{ geometry: new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, tyreMiddle + TYRE_R - 0.02, 0] as const, scale: [0.13, 0.05, 0.09] as const, color: SNOW }]
      : []),
  ]);
}

/** A tyre swing on a rope from the oak west of the shack, rocking in the day's `wind`. */
export function TireSwing({ season, wind }: { season: LakeSeason; wind: { x: number; z: number } }) {
  const still = useReducedMotion();
  const swing = useRef<THREE.Group>(null);
  const shape = useMemo(() => swingShape(season), [season]);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(() => () => shape.dispose(), [shape]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ clock }) => {
    if (!swing.current) return;
    const turn = swingAngles(clock.elapsedTime, wind, still);
    swing.current.rotation.set(turn.x, 0, turn.z);
  });
  return (
    <group ref={swing} name="tire-swing" position={[SWING_AT.x, ROPE_TOP, SWING_AT.z]}>
      <mesh geometry={shape} material={material} castShadow />
    </group>
  );
}
