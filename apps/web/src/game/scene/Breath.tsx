import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { settings } from "../settings";
import { PUFF_BLOBS, puffAge, puffBlob } from "./breathPuff";
import { anglerPose } from "./pose";
import { useReducedMotion } from "./reducedMotion";

const PUFF_COLOR = "#eef3f6";
/** The angler's mouth, above the feet and ahead of the body's centre. */
const MOUTH_UP = 1.3;
const MOUTH_AHEAD = 0.22;

/** Small pale puffs of breath from the angler's face in the cold; `light` dims them at night. */
export function Breath({ light }: { light: number }) {
  const still = useReducedMotion();
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: PUFF_COLOR, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
    [],
  );
  const blobs = useRef<Array<THREE.Mesh | null>>([]);
  useEffect(() => {
    material.color.set(PUFF_COLOR).multiplyScalar(Math.max(0.35, light));
  }, [light, material]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame((state) => {
    const age = still ? -1 : puffAge(state.clock.elapsedTime, settings.particles === "lite" ? 2 : 1);
    const fx = Math.sin(anglerPose.yaw);
    const fz = Math.cos(anglerPose.yaw);
    const mouthX = anglerPose.x + fx * MOUTH_AHEAD;
    const mouthZ = anglerPose.z + fz * MOUTH_AHEAD;
    const mouthY = anglerPose.y + anglerPose.bob + MOUTH_UP;
    let peak = 0;
    blobs.current.forEach((mesh, i) => {
      if (!mesh) return;
      mesh.visible = age >= 0;
      if (age < 0) return;
      const blob = puffBlob(i, age);
      mesh.position.set(mouthX + fx * blob.forward - fz * blob.side, mouthY + blob.up, mouthZ + fz * blob.forward + fx * blob.side);
      mesh.scale.setScalar(blob.scale);
      peak = Math.max(peak, blob.opacity);
    });
    material.opacity = peak * 0.45;
  });
  return Array.from({ length: PUFF_BLOBS }, (_, i) => (
    <mesh
      key={i}
      geometry={geometry}
      material={material}
      visible={false}
      renderOrder={5}
      ref={(mesh) => {
        blobs.current[i] = mesh;
      }}
    />
  ));
}
