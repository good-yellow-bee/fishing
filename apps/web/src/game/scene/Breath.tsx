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

/** Where a mouth is in the world and which way it faces, on the ground plane, filled in each frame. */
export type Mouth = { x: number; y: number; z: number; fx: number; fz: number };

type PuffProps = {
  /** Dims the puffs at night. */
  light: number;
  /** The puff's age at a time (breathPuff.ts), given lite effects' `every`. */
  age: (time: number, every: number) => number;
  /** Fills in the mouth for this frame. */
  mouth: (out: Mouth) => void;
  /** Their size against the angler's. */
  size?: number;
};

/** Small pale puffs of breath from a mouth in the cold, blowing out the way it faces. */
export function BreathPuffs({ light, age: ageAt, mouth, size = 1 }: PuffProps) {
  const still = useReducedMotion();
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: PUFF_COLOR, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
    [],
  );
  const blobs = useRef<Array<THREE.Mesh | null>>([]);
  const at = useMemo<Mouth>(() => ({ x: 0, y: 0, z: 0, fx: 0, fz: 1 }), []);
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
    const age = still ? -1 : ageAt(state.clock.elapsedTime, settings.particles === "lite" ? 2 : 1);
    if (age >= 0) mouth(at);
    let peak = 0;
    blobs.current.forEach((mesh, i) => {
      if (!mesh) return;
      mesh.visible = age >= 0;
      if (age < 0) return;
      const blob = puffBlob(i, age);
      const forward = blob.forward * size;
      const side = blob.side * size;
      mesh.position.set(at.x + at.fx * forward - at.fz * side, at.y + blob.up * size, at.z + at.fz * forward + at.fx * side);
      mesh.scale.setScalar(blob.scale * size);
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

function anglerMouth(out: Mouth) {
  out.fx = Math.sin(anglerPose.yaw);
  out.fz = Math.cos(anglerPose.yaw);
  out.x = anglerPose.x + out.fx * MOUTH_AHEAD;
  out.y = anglerPose.y + anglerPose.bob + MOUTH_UP;
  out.z = anglerPose.z + out.fz * MOUTH_AHEAD;
}

/** Small pale puffs of breath from the angler's face in the cold; `light` dims them at night. */
export function Breath({ light }: { light: number }) {
  return <BreathPuffs light={light} age={puffAge} mouth={anglerMouth} />;
}
