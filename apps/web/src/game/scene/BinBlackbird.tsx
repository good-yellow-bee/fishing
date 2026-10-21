import { useCallback, useRef } from "react";
import { stanceAt } from "@stillwater/shared";
import { BIN_BIRD_SCALE, binBirdAt, binVisit } from "./binVisit";
import { BLACKBIRD, RobinBird } from "./DockRobin";
import { anglerPose } from "./pose";
import { useReducedMotion } from "./reducedMotion";

const LOOK = { ...BLACKBIRD, scale: BIN_BIRD_SCALE };

/** Whether the angler is by the shack, where the bin can be seen. */
const byShack = () => stanceAt(anglerPose.x, anglerPose.z) === "shop";

/** A blackbird raiding the shack's worm bin now and then (binVisit.ts); only on visits that start while the angler is by the shack, so it never pops in or draws unseen. */
export function BinBlackbird() {
  const still = useReducedMotion();
  const seen = useRef({ index: Number.NaN, shown: false });
  const poseAt = useCallback(
    (time: number) => {
      const pose = binBirdAt(time, still);
      if (still) return byShack() ? pose : { ...pose, here: false };
      const { index } = binVisit(time);
      if (seen.current.index !== index) seen.current = { index, shown: byShack() };
      return seen.current.shown ? pose : { ...pose, here: false };
    },
    [still],
  );
  return <RobinBird name="bin-blackbird" poseAt={poseAt} look={LOOK} carries />;
}
