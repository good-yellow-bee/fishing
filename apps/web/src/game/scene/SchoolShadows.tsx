import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SCHOOL_SIZE, schoolPose } from "./schoolPose";
import type { ScenePhase } from "./types";
import { waterHeight } from "./water";

type Props = { phase: ScenePhase; schooled: boolean; bobber: { x: number; z: number } };

/** Small panfish shadows milling round the float while it sits in a school. */
export function SchoolShadows({ phase, schooled, bobber }: Props) {
  const visible = phase === "waiting" && schooled;
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    const school = group.current;
    if (!school) return;
    school.visible = visible;
    if (!visible) return;
    const time = state.clock.elapsedTime;
    school.children.forEach((fish, i) => {
      const { dx, dz, heading } = schoolPose(i, time);
      const x = bobber.x + dx;
      const z = bobber.z + dz;
      fish.position.set(x, waterHeight(x, z, time) - 0.02, z);
      fish.rotation.y = heading;
    });
  });
  return (
    <group ref={group} visible={false}>
      {Array.from({ length: SCHOOL_SIZE }, (_, i) => (
        <mesh key={i} scale={[0.07, 0.01, 0.16]} renderOrder={2}>
          <sphereGeometry args={[1, 10, 6]} />
          <meshBasicMaterial color="#06141c" transparent opacity={0.45} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
