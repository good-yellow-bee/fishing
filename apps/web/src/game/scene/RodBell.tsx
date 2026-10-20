import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { bellShown, bellSwing } from "./bellSwing";
import type { ScenePhase } from "./types";
import { toonRamp } from "./toon";

/** Meters the bell hangs below the rod tip. */
const DROP = 0.09;

/** A small brass bell clipped under the rod tip after dark; it jumps on a nibble and swings hard on the bite. */
export function RodBell({ rodTip, phase, nibble, night }: { rodTip: THREE.Vector3; phase: ScenePhase; nibble: boolean; night: boolean }) {
  const group = useRef<THREE.Group>(null);
  const jolt = useRef({ at: -10, bite: false, nibble: false, phase });

  useFrame((state) => {
    const bell = group.current;
    if (!bell) return;
    const t = state.clock.elapsedTime;
    const last = jolt.current;
    if (nibble && !last.nibble) jolt.current = { ...last, at: t, bite: false };
    if (phase === "hookset" && last.phase !== "hookset") jolt.current = { ...jolt.current, at: t, bite: true };
    jolt.current.nibble = nibble;
    jolt.current.phase = phase;
    bell.visible = bellShown(night, phase);
    if (!bell.visible) return;
    bell.position.set(rodTip.x, rodTip.y - DROP, rodTip.z);
    bell.rotation.z = bellSwing(t - jolt.current.at, jolt.current.bite);
  });

  return (
    <group ref={group} visible={false}>
      {/* Hung from its top, so it swings about the clip. */}
      <mesh position={[0, -0.035, 0]}>
        <coneGeometry args={[0.035, 0.06, 10, 1, true]} />
        <meshToonMaterial color="#c99a3a" gradientMap={toonRamp()} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.005, 0]}>
        <sphereGeometry args={[0.016, 8, 6]} />
        <meshToonMaterial color="#d8ad4d" gradientMap={toonRamp()} />
      </mesh>
    </group>
  );
}
