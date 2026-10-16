import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { lurkerPose } from "./schoolPose";
import type { ScenePhase } from "./types";
import { waterHeight } from "./water";

type Props = { phase: ScenePhase; lurking: boolean; closeInMs?: number; bobber: { x: number; z: number } };

/** One big, slow shadow circling wide of the float while a fish that got away, or a hunter, is still about this bank.
 * When that fish is the one coming to bite (closeInMs > 0), its ring tightens on the float over the wait. */
export function LurkerShadow({ phase, lurking, closeInMs = 0, bobber }: Props) {
  const visible = phase === "waiting" && lurking;
  const mesh = useRef<THREE.Mesh>(null);
  const shownAt = useRef<number | null>(null);
  useFrame((state) => {
    const fish = mesh.current;
    if (!fish) return;
    fish.visible = visible;
    if (!visible) {
      shownAt.current = null;
      return;
    }
    const time = state.clock.elapsedTime;
    shownAt.current ??= time;
    const close = closeInMs > 0 ? (time - shownAt.current) / (closeInMs / 1000) : 0;
    const { dx, dz, heading } = lurkerPose(time, close);
    const x = bobber.x + dx;
    const z = bobber.z + dz;
    fish.position.set(x, waterHeight(x, z, time) + 0.01, z);
    fish.rotation.y = heading;
  });
  return (
    <mesh ref={mesh} visible={false} scale={[0.38, 0.02, 1.05]} renderOrder={2}>
      <sphereGeometry args={[1, 12, 6]} />
      <meshBasicMaterial color="#04101a" transparent opacity={0.62} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
