import { inLake, onDockPlanks } from "@stillwater/shared";
import { aboard } from "./boat";
import { anglerPose } from "./pose";

/** Whether the angler stands ashore: off the dock's boards, out of the boat and not in the water. */
export function anglerAshore() {
  return !aboard() && !onDockPlanks(anglerPose.x, anglerPose.z) && !inLake(anglerPose.x, anglerPose.z);
}
