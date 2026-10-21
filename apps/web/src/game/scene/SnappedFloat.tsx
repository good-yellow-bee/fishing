import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import type { SpotId } from "@stillwater/shared";
import { driftFloatPose, driftTurn, lostFloatAt } from "./driftFloatPose";
import { FloatModel } from "./FloatModel";
import { useSettings } from "../settings";
import { useReducedMotion } from "./reducedMotion";
import { waterHeight } from "./water";

/** One bank's snapped float, drifting about its water (driftFloatPose.ts): one draw. */
function DriftingFloat({ bank }: { bank: SpotId }) {
  const still = useReducedMotion();
  // Never the angler's own colour, so it is not taken for their float.
  const colour = useSettings().floatColour === "red" ? "orange" : "red";
  const float = useRef<THREE.Group>(null);
  const home = lostFloatAt(bank);
  const turn = driftTurn(bank);
  useFrame(({ clock }) => {
    const g = float.current;
    if (!g || !home) return;
    const time = still ? 0 : clock.elapsedTime;
    const pose = driftFloatPose(time, turn, still);
    const x = home.x + pose.x;
    const z = home.z + pose.z;
    g.position.set(x, waterHeight(x, z, time) - pose.sink, z);
    g.rotation.set(pose.tilt, pose.yaw, 0, "YXZ");
  });
  if (!home) return null;
  return (
    <group ref={float} name="snapped-float">
      <FloatModel colour={colour} />
    </group>
  );
}

/** The float a lost trophy still about its bank trails, at each such bank (the old foe's, or one the lodge reports lost). */
export function SnappedFloat({ banks }: { banks: readonly SpotId[] }) {
  return banks.map((bank) => <DriftingFloat key={bank} bank={bank} />);
}
