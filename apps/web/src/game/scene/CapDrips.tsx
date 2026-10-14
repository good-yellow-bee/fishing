import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BRIM_REACH, BRIM_UP, DRIP_POINTS, dripAt } from "./brimDrips";
import { anglerPose } from "./pose";
import { useReducedMotion } from "./reducedMotion";

const DRIP_COLOR = "#dcebf2";

/** Rain dripping off the angler's cap brim. */
export function CapDrips() {
  const still = useReducedMotion();
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 6, 5), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: DRIP_COLOR, transparent: true, opacity: 0.8, toneMapped: false }), []);
  const drops = useRef<Array<THREE.Mesh | null>>([]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    drops.current.forEach((mesh, i) => {
      if (!mesh) return;
      const drip = still ? null : dripAt(i, t);
      mesh.visible = !!drip;
      if (!drip) return;
      const angle = anglerPose.yaw + drip.angle;
      const top = anglerPose.y + anglerPose.bob + BRIM_UP;
      mesh.position.set(anglerPose.x + Math.sin(angle) * BRIM_REACH, Math.max(anglerPose.y, top - drip.drop), anglerPose.z + Math.cos(angle) * BRIM_REACH);
      // Stretched as it speeds up.
      mesh.scale.set(0.012 * drip.size, 0.012 * drip.size * (1 + drip.drop * 2), 0.012 * drip.size);
    });
  });
  return Array.from({ length: DRIP_POINTS }, (_, i) => (
    <mesh
      key={i}
      geometry={geometry}
      material={material}
      visible={false}
      ref={(mesh) => {
        drops.current[i] = mesh;
      }}
    />
  ));
}
