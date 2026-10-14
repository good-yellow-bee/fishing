import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { settings } from "../settings";
import { CUP_HEIGHT, CUP_SPOT, STEAM_BLOBS, THERMOS_SPOT, steamBlob } from "./steamWisp";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const FLASK = "#3f6b4f";
const STEEL = "#c9cfd2";
const STEAM = "#f1f5f7";

/** A thermos and its steel cup on the dock; on cold mornings and in winter a wisp of steam curls up from the cup. `light` dims the steam at night. */
export function Thermos({ steaming, light }: { steaming: boolean; light: number }) {
  const still = useReducedMotion();
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: STEAM, transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false }),
    [],
  );
  const blobs = useRef<Array<THREE.Mesh | null>>([]);
  useEffect(() => {
    material.color.set(STEAM).multiplyScalar(Math.max(0.35, light));
  }, [light, material]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame((state) => {
    const t = still ? 1.2 : state.clock.elapsedTime;
    const count = settings.particles === "lite" ? Math.ceil(STEAM_BLOBS / 2) : STEAM_BLOBS;
    blobs.current.forEach((mesh, i) => {
      if (!mesh) return;
      mesh.visible = steaming && i < count;
      if (!mesh.visible) return;
      const blob = steamBlob(i, t);
      mesh.position.set(CUP_SPOT.x + blob.x, CUP_SPOT.y + CUP_HEIGHT + blob.y, CUP_SPOT.z + blob.z);
      // One shared material, so each blob fades by shrinking as it thins.
      mesh.scale.setScalar(blob.scale * (0.4 + 0.6 * blob.opacity));
    });
  });
  return (
    <group name="thermos">
      <group position={[THERMOS_SPOT.x, THERMOS_SPOT.y, THERMOS_SPOT.z]}>
        <mesh position={[0, 0.13, 0]} castShadow>
          <cylinderGeometry args={[0.055, 0.055, 0.26, 12]} />
          <meshToonMaterial color={FLASK} gradientMap={toonRamp()} />
        </mesh>
        <mesh position={[0, 0.275, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.045, 0.035, 10]} />
          <meshToonMaterial color={STEEL} gradientMap={toonRamp()} />
        </mesh>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.057, 0.057, 0.02, 12]} />
          <meshToonMaterial color={STEEL} gradientMap={toonRamp()} />
        </mesh>
      </group>
      <mesh position={[CUP_SPOT.x, CUP_SPOT.y + CUP_HEIGHT / 2, CUP_SPOT.z]} castShadow>
        <cylinderGeometry args={[0.045, 0.038, CUP_HEIGHT, 12]} />
        <meshToonMaterial color={STEEL} gradientMap={toonRamp()} />
      </mesh>
      <mesh position={[CUP_SPOT.x, CUP_SPOT.y + CUP_HEIGHT - 0.008, CUP_SPOT.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.04, 12]} />
        <meshToonMaterial color="#5a3a24" gradientMap={toonRamp()} />
      </mesh>
      {Array.from({ length: STEAM_BLOBS }, (_, i) => (
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
      ))}
    </group>
  );
}
