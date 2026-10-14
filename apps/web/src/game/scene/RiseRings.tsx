import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SpotId } from "@stillwater/shared";
import { RISE_FRESH_MS, risesAt } from "../eveningRise";
import { waterHeight } from "./water";

/** At most this many rises are fresh at once. */
const MAX_RINGS = 5;
/** Seconds a ring takes to spread to its full width. */
const SPREAD_SEC = 2.4;
/** Meters across a ring at its widest. */
const RING_MAX = 1.1;

/** Rings spreading where fish dimple the surface during an evening rise; cast to a fresh one. */
export function RiseRings({ spot }: { spot: SpotId }) {
  const rings = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state) => {
    const now = Date.now();
    const rises = risesAt(spot, now);
    const t = state.clock.elapsedTime;
    rings.current.forEach((ring, i) => {
      if (!ring) return;
      const rise = rises[i];
      ring.visible = rise !== undefined;
      if (!rise) return;
      const age = (now - rise.bornAt) / 1000;
      const spread = Math.min(1, age / SPREAD_SEC);
      const size = 0.12 + (RING_MAX - 0.12) * (1 - (1 - spread) ** 2);
      ring.position.set(rise.x, waterHeight(rise.x, rise.z, t) + 0.04, rise.z);
      ring.scale.setScalar(size);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - (now - rise.bornAt) / RISE_FRESH_MS);
    });
  });

  return (
    <>
      {Array.from({ length: MAX_RINGS }, (_, i) => (
        <mesh key={i} ref={(mesh) => void (rings.current[i] = mesh)} rotation={[-Math.PI / 2, 0, 0]} visible={false} renderOrder={4}>
          <ringGeometry args={[0.9, 1, 40]} />
          <meshBasicMaterial color="#eef6f2" transparent depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}
