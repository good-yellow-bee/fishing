import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { settings } from "../settings";
import { LANTERN_COLOR } from "./lanternLight";
import { MINNOW_COUNT, MINNOW_DEPTH, minnowAt } from "./minnowSwirl";
import { useReducedMotion } from "./reducedMotion";
import { waterHeight } from "./water";

/** Lantern-warmed silver, so they glint in the glow rather than read as dark specks. */
const MINNOW = new THREE.Color("#d8e4e0").lerp(new THREE.Color(LANTERN_COLOR), 0.35);

/**
 * Minnows milling in the dock lanterns' light after dark, the bait the lantern bite comes from (lanternDockWaitMul);
 * motion lives in minnowSwirl.ts. One instanced draw for the whole shoal.
 */
export function LanternMinnows() {
  const still = useReducedMotion();
  const geo = useMemo(() => new THREE.BoxGeometry(0.16, 0.025, 0.045), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: MINNOW, transparent: true, opacity: 0.8, depthWrite: false }), []);
  const shoal = useRef<THREE.InstancedMesh>(null);
  const place = useMemo(() => ({ matrix: new THREE.Matrix4(), at: new THREE.Vector3(), turn: new THREE.Quaternion(), up: new THREE.Vector3(0, 1, 0), size: new THREE.Vector3(1, 1, 1) }), []);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  useFrame((state) => {
    const mesh = shoal.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    const count = settings.particles === "lite" ? MINNOW_COUNT / 2 : MINNOW_COUNT;
    for (let i = 0; i < count; i += 1) {
      const pose = minnowAt(i, t, still);
      place.at.set(pose.x, waterHeight(pose.x, pose.z, t) - MINNOW_DEPTH, pose.z);
      place.turn.setFromAxisAngle(place.up, pose.yaw);
      place.matrix.compose(place.at, place.turn, place.size);
      mesh.setMatrixAt(i, place.matrix);
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={shoal} args={[geo, mat, MINNOW_COUNT]} frustumCulled={false} />;
}
