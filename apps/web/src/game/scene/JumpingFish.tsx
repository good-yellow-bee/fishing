import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { LakeHour } from "@stillwater/shared";
import { JUMP_RING_SEC, JUMP_SEC, fishJumpAt, jumpArc } from "./fishJump";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const SCALE_COLOR = "#a7b8ac";
const BELLY = "#eef0e2";
/** Drawn larger than life so the flash of a jump reads from across the lake. */
const FISH_SCALE = 1.8;

/** Now and then a fish leaps clear out on the open lake, with a ring where it left and one where it fell back. */
export function JumpingFish({ hour }: { hour: LakeHour }) {
  const fish = useRef<THREE.Group>(null);
  const rise = useRef<THREE.Mesh>(null);
  const fall = useRef<THREE.Mesh>(null);
  const still = useReducedMotion();

  useFrame((state) => {
    const group = fish.current;
    if (!group) return;
    const time = state.clock.elapsedTime;
    const jump = still ? null : fishJumpAt(time, hour);
    const airborne = jump !== null && jump.progress >= 0 && jump.progress <= 1;
    group.visible = airborne;
    const forward = { x: jump ? Math.sin(jump.yaw) : 0, z: jump ? Math.cos(jump.yaw) : 0 };
    // It covers a body length or so of water through the leap.
    const reach = 0.9;
    if (jump && airborne) {
      const arc = jumpArc(jump.progress);
      const along = (jump.progress - 0.5) * reach;
      const x = jump.x + forward.x * along;
      const z = jump.z + forward.z * along;
      group.position.set(x, waterHeight(x, z, time) + arc.y, z);
      // A +z-facing fish: nose up is a negative turn about x.
      group.rotation.set(-arc.pitch, jump.yaw, 0, "YXZ");
    }
    const ring = (mesh: THREE.Mesh | null, age: number, at: number) => {
      if (!mesh || !jump) {
        if (mesh) mesh.visible = false;
        return;
      }
      const k = age / JUMP_RING_SEC;
      mesh.visible = k >= 0 && k <= 1;
      if (!mesh.visible) return;
      const x = jump.x + forward.x * at;
      const z = jump.z + forward.z * at;
      mesh.position.set(x, waterHeight(x, z, time) + 0.03, z);
      mesh.scale.setScalar(0.3 + k * 1.4);
      (mesh.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.55;
    };
    ring(rise.current, jump ? jump.since : -1, -reach / 2);
    ring(fall.current, jump ? jump.since - JUMP_SEC : -1, reach / 2);
  });

  return (
    <>
      <group ref={fish} visible={false} scale={FISH_SCALE}>
        <mesh scale={[0.05, 0.07, 0.18]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshToonMaterial color={SCALE_COLOR} gradientMap={toonRamp()} />
        </mesh>
        <mesh position={[0, -0.02, 0.01]} scale={[0.045, 0.045, 0.15]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshToonMaterial color={BELLY} gradientMap={toonRamp()} />
        </mesh>
        <mesh position={[0, 0, -0.2]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1.6]}>
          <coneGeometry args={[0.055, 0.08, 4]} />
          <meshToonMaterial color={SCALE_COLOR} gradientMap={toonRamp()} />
        </mesh>
      </group>
      {[rise, fall].map((ref, i) => (
        <mesh key={i} ref={ref} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[0.32, 0.4, 24]} />
          <meshBasicMaterial color="#e2efe9" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}
