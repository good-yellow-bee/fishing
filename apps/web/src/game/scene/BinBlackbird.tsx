import { useCallback, useRef } from "react";
import { stanceAt } from "@stillwater/shared";
import { BIN_BIRD_SCALE, binBirdAt, binLatch, type BinLatch } from "./binVisit";
import { BLACKBIRD, RobinBird } from "./DockRobin";
import { anglerPose } from "./pose";
import { useReducedMotion } from "./reducedMotion";

const LOOK = { ...BLACKBIRD, scale: BIN_BIRD_SCALE };

/** Whether the angler is by the shack, where the bin can be seen. */
const byShack = () => stanceAt(anglerPose.x, anglerPose.z) === "shop";

/** A blackbird raiding the shack's worm bin now and then (binVisit.ts); only on visits seen to start while the angler is by the shack, so it never pops in or draws unseen. */
export function BinBlackbird() {
  const still = useReducedMotion();
  const latch = useRef<BinLatch | null>(null);
  const poseAt = useCallback(
    (time: number) => {
      const pose = binBirdAt(time, still);
      if (still) return byShack() ? pose : { ...pose, here: false };
      latch.current = binLatch(latch.current, time, byShack);
      return latch.current.shown ? pose : { ...pose, here: false };
    },
    [still],
  );
  return <RobinBird name="bin-blackbird" poseAt={poseAt} look={LOOK} carries />;
}
