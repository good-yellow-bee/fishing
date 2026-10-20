import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ScenePhase } from "./types";
import { followPose } from "./followPose";
import { waterHeight } from "./water";

type Props = { phase: ScenePhase; follow: "follow" | "turn" | null; bobber: THREE.Vector3; rodTip: THREE.Vector3 };

/** A pike's long shadow trailing the lure in to the bank, and swinging round as it turns (followPose.ts). */
export function FollowShadow({ phase, follow, bobber, rodTip }: Props) {
  const visible = phase === "waiting" && follow !== null;
  const mesh = useRef<THREE.Mesh>(null);
  const turnStart = useRef<number | null>(null);
  useFrame((state) => {
    const fish = mesh.current;
    if (!fish) return;
    fish.visible = visible;
    if (!visible) {
      turnStart.current = null;
      return;
    }
    const time = state.clock.elapsedTime;
    if (follow === "turn") turnStart.current ??= time;
    else turnStart.current = null;
    const ax = rodTip.x - bobber.x;
    const az = rodTip.z - bobber.z;
    const len = Math.hypot(ax, az) || 1;
    const { dx, dz, heading } = followPose(time, { x: ax / len, z: az / len }, turnStart.current === null ? null : time - turnStart.current);
    const x = bobber.x + dx;
    const z = bobber.z + dz;
    fish.position.set(x, waterHeight(x, z, time) + 0.01, z);
    fish.rotation.y = heading;
  });
  return (
    <mesh ref={mesh} visible={false} scale={[0.26, 0.02, 0.95]} renderOrder={2}>
      <sphereGeometry args={[1, 12, 6]} />
      <meshBasicMaterial color="#04101a" transparent opacity={0.6} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
