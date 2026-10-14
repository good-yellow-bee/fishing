import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { settings } from "../settings";
import { STRIDER_COUNT, striderAt } from "./striderSkate";
import { useReducedMotion } from "./reducedMotion";
import { waterHeight } from "./water";

const BODY = "#2b2620";
const DIMPLE = "#e9f2f0";
/** Drawn larger than life: a true-size strider is a speck from the dock. */
const STRIDER_SCALE = 2.6;
/** The four long legs, as angles round from the head and their reach. */
const LEGS: Array<[number, number]> = [
  [0.75, 0.085],
  [-0.75, 0.085],
  [2.35, 0.1],
  [-2.35, 0.1],
];

/** A few water striders darting about the calm water off the dock; motion lives in striderSkate.ts. */
export function Striders() {
  const still = useReducedMotion();
  const bodyGeo = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);
  const legGeo = useMemo(() => new THREE.BoxGeometry(0.003, 0.003, 1), []);
  const dimpleGeo = useMemo(() => new THREE.RingGeometry(0.6, 1, 16), []);
  const bodyMat = useMemo(() => new THREE.MeshBasicMaterial({ color: BODY }), []);
  const dimpleMat = useMemo(() => new THREE.MeshBasicMaterial({ color: DIMPLE, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }), []);
  const groups = useRef<Array<THREE.Group | null>>([]);
  useEffect(
    () => () => {
      [bodyGeo, legGeo, dimpleGeo, bodyMat, dimpleMat].forEach((thing) => thing.dispose());
    },
    [bodyGeo, legGeo, dimpleGeo, bodyMat, dimpleMat],
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const count = settings.particles === "lite" ? STRIDER_COUNT / 2 : STRIDER_COUNT;
    groups.current.forEach((group, i) => {
      if (!group) return;
      group.visible = i < count;
      if (i >= count) return;
      const pose = striderAt(i, t, still);
      group.position.set(pose.x, waterHeight(pose.x, pose.z, t) + 0.01, pose.z);
      group.rotation.y = pose.yaw;
    });
  });
  return Array.from({ length: STRIDER_COUNT }, (_, i) => (
    <group
      key={i}
      scale={STRIDER_SCALE}
      ref={(group) => {
        groups.current[i] = group;
      }}
    >
      <mesh geometry={bodyGeo} material={bodyMat} scale={[0.008, 0.006, 0.03]} position={[0, 0.006, 0]} />
      {LEGS.map(([angle, reach]) => (
        <group key={angle} rotation={[0, angle, 0]}>
          <mesh geometry={legGeo} material={bodyMat} position={[0, 0.004, reach / 2]} scale={[1, 1, reach]} />
          <mesh geometry={dimpleGeo} material={dimpleMat} position={[0, 0, reach]} rotation={[-Math.PI / 2, 0, 0]} scale={0.012} />
        </group>
      ))}
    </group>
  ));
}
