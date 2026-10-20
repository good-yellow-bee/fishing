import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { SpotId } from "@stillwater/shared";
import { mergePainted } from "./mergeParts";
import { stakeAt } from "./stakeSpot";
import { toonRamp } from "./toon";

/** The stick's length and its lean out over the water, and how far out the line meets the water. */
const STICK = 0.9;
const LEAN = 0.45;
const LINE_OUT = 1.3;

/** A forked hazel stick leaning out along +z from its foot, a white tag at its tip, and the line down into the water. */
function stakeShape(footY: number) {
  const tip = new THREE.Vector3(0, Math.cos(LEAN) * STICK, Math.sin(LEAN) * STICK);
  const end = new THREE.Vector3(0, -footY + 0.02, tip.z + LINE_OUT);
  const line = end.clone().sub(tip);
  const lineMid = tip.clone().add(end).multiplyScalar(0.5);
  const lineTurn = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), line.clone().normalize()));
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.012, 0.02, STICK, 5), position: [0, tip.y / 2, tip.z / 2], rotation: [LEAN, 0, 0], color: "#6b5236" },
    { geometry: new THREE.CylinderGeometry(0.008, 0.01, 0.14, 4), position: [0.03, tip.y - 0.05, tip.z - 0.03], rotation: [LEAN, 0, -0.5], color: "#6b5236" },
    { geometry: new THREE.BoxGeometry(0.08, 0.045, 0.006), position: [0, tip.y - 0.03, tip.z], color: "#f2efe6" },
    { geometry: new THREE.CylinderGeometry(0.004, 0.004, line.length(), 3), position: [lineMid.x, lineMid.y, lineMid.z], rotation: [lineTurn.x, lineTurn.y, lineTurn.z], color: "#d8d4c8" },
  ]);
}

/** The angler's night line, staked at the bank it was set at while it is out (stakeSpot.ts): one draw. */
export function NightLineStake({ bank }: { bank: SpotId }) {
  const stake = stakeAt(bank);
  const shape = useMemo(() => (stake ? stakeShape(stake.y) : null), [stake?.y]);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(() => () => shape?.dispose(), [shape]);
  useEffect(() => () => material.dispose(), [material]);
  if (!stake || !shape) return null;
  return <mesh name="night-line" geometry={shape} material={material} position={[stake.x, stake.y, stake.z]} rotation={[0, stake.yaw, 0]} />;
}
