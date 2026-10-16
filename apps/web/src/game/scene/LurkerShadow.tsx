import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { lurkerPose } from "./schoolPose";
import type { ScenePhase } from "./types";
import { waterHeight } from "./water";

type Props = { phase: ScenePhase; lurking: boolean; bobber: { x: number; z: number } };

/** One big, slow shadow circling wide of the float while a fish that got away, or a hunter, is still about this bank. */
export function LurkerShadow({ phase, lurking, bobber }: Props) {
  const visible = phase === "waiting" && lurking;
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const fish = mesh.current;
    if (!fish) return;
    fish.visible = visible;
    if (!visible) return;
    const time = state.clock.elapsedTime;
    const { dx, dz, heading } = lurkerPose(time);
    const x = bobber.x + dx;
    const z = bobber.z + dz;
    fish.position.set(x, waterHeight(x, z, time) - 0.05, z);
    fish.rotation.y = heading;
  });
  return (
    <mesh ref={mesh} visible={false} scale={[0.26, 0.02, 0.75]} renderOrder={2}>
      <sphereGeometry args={[1, 12, 6]} />
      <meshBasicMaterial color="#04101a" transparent opacity={0.5} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
