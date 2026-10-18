import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { settings } from "../settings";
import { WHIRLIGIG_COUNT, whirligigAt } from "./whirligigSpin";
import { useReducedMotion } from "./reducedMotion";
import { waterHeight } from "./water";

const SHELL = "#121614";
const WAKE = "#e9f2f0";
/** Drawn larger than life: a true-size whirligig is a speck from the dock. */
const WHIRLIGIG_SCALE = 3;

/**
 * A raft of whirligig beetles whirling in tight loops on the still water off the dock, each in its
 * own ring of ripple (whirligigSpin.ts). All the beetles are one instanced draw and all the rings another.
 */
export function Whirligigs() {
  const still = useReducedMotion();
  const shellGeo = useMemo(() => new THREE.SphereGeometry(1, 8, 5).scale(0.006, 0.003, 0.009), []);
  const wakeGeo = useMemo(() => new THREE.RingGeometry(0.014, 0.019, 16).rotateX(-Math.PI / 2), []);
  const shellMat = useMemo(() => new THREE.MeshBasicMaterial({ color: SHELL }), []);
  const wakeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: WAKE, transparent: true, opacity: 0.5, depthWrite: false }), []);
  const shells = useRef<THREE.InstancedMesh>(null);
  const wakes = useRef<THREE.InstancedMesh>(null);
  const place = useMemo(() => ({ matrix: new THREE.Matrix4(), at: new THREE.Vector3(), turn: new THREE.Quaternion(), up: new THREE.Vector3(0, 1, 0), size: new THREE.Vector3().setScalar(WHIRLIGIG_SCALE) }), []);
  useEffect(
    () => () => {
      [shellGeo, wakeGeo, shellMat, wakeMat].forEach((thing) => thing.dispose());
    },
    [shellGeo, wakeGeo, shellMat, wakeMat],
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const count = settings.particles === "lite" ? WHIRLIGIG_COUNT / 2 : WHIRLIGIG_COUNT;
    for (let i = 0; i < count; i += 1) {
      const pose = whirligigAt(i, t, still);
      place.at.set(pose.x, waterHeight(pose.x, pose.z, still ? 0 : t) + 0.004, pose.z);
      place.turn.setFromAxisAngle(place.up, pose.yaw);
      place.matrix.compose(place.at, place.turn, place.size);
      shells.current?.setMatrixAt(i, place.matrix);
      wakes.current?.setMatrixAt(i, place.matrix);
    }
    for (const mesh of [shells.current, wakes.current]) {
      if (!mesh) continue;
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <>
      <instancedMesh ref={shells} name="whirligigs" args={[shellGeo, shellMat, WHIRLIGIG_COUNT]} frustumCulled={false} />
      <instancedMesh ref={wakes} name="whirligig-wakes" args={[wakeGeo, wakeMat, WHIRLIGIG_COUNT]} frustumCulled={false} />
    </>
  );
}
