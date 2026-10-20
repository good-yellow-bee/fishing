import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SpotId } from "@stillwater/shared";
import { giantWaterAt, swirlPhase } from "./giantWake";
import { useReducedMotion } from "./reducedMotion";
import { waterHeight } from "./water";

const RING = new THREE.RingGeometry(0.92, 1, 40).rotateX(-Math.PI / 2);
const BACK = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);

/** One bank's giant rolling now and then (giantWake.ts): drawn only while it swirls. */
function SwirlAt({ bank, index }: { bank: SpotId; index: number }) {
  const at = giantWaterAt(bank);
  const group = useRef<THREE.Group>(null);
  const rings = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)];
  const back = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const g = group.current;
    if (!g || !at) return;
    const time = state.clock.elapsedTime;
    const p = swirlPhase(time, index);
    g.visible = p !== null;
    if (p === null) return;
    g.position.set(at.x, waterHeight(at.x, at.z, time) + 0.02, at.z);
    rings.forEach((ring, i) => {
      const r = ring.current;
      if (!r) return;
      // The second ring follows the first a little later.
      const q = Math.max(0, p - i * 0.18) / (1 - i * 0.18);
      r.scale.setScalar(0.4 + q * 2.4);
      (r.material as THREE.MeshBasicMaterial).opacity = q > 0 ? 0.55 * (1 - q) : 0;
    });
    const b = back.current;
    if (b) {
      // The back rolls up and under in the first half.
      const roll = p < 0.5 ? Math.sin((p / 0.5) * Math.PI) : 0;
      b.visible = roll > 0.01;
      b.scale.set(0.32, 0.16 * roll, 1.1);
    }
  });
  if (!at) return null;
  return (
    <group ref={group} visible={false} rotation={[0, index * 1.3, 0]}>
      {rings.map((ring, i) => (
        <mesh key={i} ref={ring} geometry={RING} renderOrder={2}>
          <meshBasicMaterial color="#e6f1ee" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      <mesh ref={back} geometry={BACK}>
        <meshBasicMaterial color="#1b2a2a" />
      </mesh>
    </group>
  );
}

/** Swirls on the water of each bank whose giant is still out this week; none for reduced motion. */
export function GiantSwirl({ banks }: { banks: readonly SpotId[] }) {
  const still = useReducedMotion();
  if (still) return null;
  return banks.map((bank, i) => <SwirlAt key={bank} bank={bank} index={i} />);
}
