import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { settings } from "../settings";
import { STRIDER_COUNT, striderAt } from "./striderSkate";
import { striderBodyGeometry, striderDimpleGeometry } from "./striderShape";
import { useReducedMotion } from "./reducedMotion";
import { waterHeight } from "./water";

const BODY = "#2b2620";
const DIMPLE = "#e9f2f0";
/** Drawn larger than life: a true-size strider is a speck from the dock. */
const STRIDER_SCALE = 2.6;

/**
 * A few water striders darting about the calm water off the dock; motion lives in striderSkate.ts.
 * Every strider's body and legs are one instanced draw and every dimple another, not nine meshes each.
 */
export function Striders() {
  const still = useReducedMotion();
  const bodyGeo = useMemo(() => striderBodyGeometry(), []);
  const dimpleGeo = useMemo(() => striderDimpleGeometry(), []);
  const bodyMat = useMemo(() => new THREE.MeshBasicMaterial({ color: BODY }), []);
  const dimpleMat = useMemo(() => new THREE.MeshBasicMaterial({ color: DIMPLE, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }), []);
  const bodies = useRef<THREE.InstancedMesh>(null);
  const dimples = useRef<THREE.InstancedMesh>(null);
  const place = useMemo(() => ({ matrix: new THREE.Matrix4(), at: new THREE.Vector3(), turn: new THREE.Quaternion(), up: new THREE.Vector3(0, 1, 0), size: new THREE.Vector3().setScalar(STRIDER_SCALE) }), []);
  useEffect(
    () => () => {
      [bodyGeo, dimpleGeo, bodyMat, dimpleMat].forEach((thing) => thing.dispose());
    },
    [bodyGeo, dimpleGeo, bodyMat, dimpleMat],
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const count = settings.particles === "lite" ? STRIDER_COUNT / 2 : STRIDER_COUNT;
    for (let i = 0; i < count; i += 1) {
      const pose = striderAt(i, t, still);
      place.at.set(pose.x, waterHeight(pose.x, pose.z, t) + 0.01, pose.z);
      place.turn.setFromAxisAngle(place.up, pose.yaw);
      place.matrix.compose(place.at, place.turn, place.size);
      bodies.current?.setMatrixAt(i, place.matrix);
      dimples.current?.setMatrixAt(i, place.matrix);
    }
    for (const mesh of [bodies.current, dimples.current]) {
      if (!mesh) continue;
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    }
  });
  // Spread over the water, so the instances' combined bounds would need refitting each frame; they are cheap to draw.
  return (
    <>
      <instancedMesh ref={bodies} args={[bodyGeo, bodyMat, STRIDER_COUNT]} frustumCulled={false} />
      <instancedMesh ref={dimples} args={[dimpleGeo, dimpleMat, STRIDER_COUNT]} frustumCulled={false} />
    </>
  );
}
