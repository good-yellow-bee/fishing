import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SpotId } from "@stillwater/shared";
import { mergePainted, rod } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { stakeAt } from "./stakeSpot";
import { stakeNod, stakePose, type LineState } from "./stakePose";
import { toonRamp } from "./toon";

const HAZEL = "#6b5236";

/** A forked hazel stick leaning out along +z from its foot, bowed once a fish is on, a white tag at its tip, and the line down into the water. */
function stakeShape(footY: number, state: LineState) {
  const { joint, topLean, tip, line } = stakePose(state, footY);
  const up = new THREE.Vector3(0, Math.cos(topLean), Math.sin(topLean));
  // The top starts a little below the bend, so a bowed stick shows no notch at the joint.
  const topFoot = joint.clone().addScaledVector(up, -0.02);
  const twig = tip.clone().addScaledVector(up, -0.058);
  return mergePainted([
    rod(new THREE.Vector3(), joint, 0.017, HAZEL, 5),
    { geometry: new THREE.CylinderGeometry(0.012, 0.016, tip.distanceTo(topFoot), 5), position: topFoot.clone().lerp(tip, 0.5).toArray(), rotation: [topLean, 0, 0], color: HAZEL },
    { geometry: new THREE.CylinderGeometry(0.008, 0.01, 0.14, 4), position: [0.03, twig.y, twig.z], rotation: [topLean, 0, -0.5], color: HAZEL },
    { geometry: new THREE.BoxGeometry(0.08, 0.045, 0.006), position: [0, tip.y - 0.03, tip.z], color: "#f2efe6" },
    ...line.slice(1).map((to, i) => rod(line[i], to, 0.004, "#d8d4c8")),
  ]);
}

/** The angler's night line, staked at the bank it was set at while it is out (stakeSpot.ts): one draw; once ready it bows and now and then knocks. */
export function NightLineStake({ bank, state }: { bank: SpotId; state: LineState }) {
  const still = useReducedMotion();
  const stick = useRef<THREE.Mesh>(null);
  const stake = stakeAt(bank);
  const shape = useMemo(() => (stake ? stakeShape(stake.y, state) : null), [stake?.y, state]);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(() => () => shape?.dispose(), [shape]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ clock }) => {
    if (stick.current) stick.current.rotation.x = state === "ready" ? stakeNod(clock.elapsedTime, still) : 0;
  });
  if (!stake || !shape) return null;
  return (
    <group position={[stake.x, stake.y, stake.z]} rotation={[0, stake.yaw, 0]}>
      <mesh ref={stick} name="night-line" geometry={shape} material={material} />
    </group>
  );
}
