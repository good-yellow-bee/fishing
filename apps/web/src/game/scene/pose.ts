import { DOCK_STAND_X, DOCK_STAND_Z, footHeight } from "@stillwater/shared";
import { MIN_WALK, walkPath, type WalkPoint } from "./walkPath";

export const anglerPose = {
  x: DOCK_STAND_X,
  z: DOCK_STAND_Z,
  y: footHeight(DOCK_STAND_X, DOCK_STAND_Z),
  yaw: Math.PI,
  moving: false,
  vx: 0,
  vz: 0,
  bob: 0,
  lean: 0,
  pitch: 0,
  gait: 0,
  /** Tap-to-walk waypoints still ahead. Keys clear it. */
  route: [] as WalkPoint[],
};

const POSE_START = { ...anglerPose };

/** Back on the dock, standing still, with nowhere to walk. */
export function resetAnglerPose() {
  Object.assign(anglerPose, POSE_START, { route: [] });
}

export function shortestYaw(from: number, to: number) {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

/** Sets the angler walking to a point on the shore. False when it is too close or out of reach. */
export function walkAnglerTo(x: number, z: number) {
  if (Math.hypot(x - anglerPose.x, z - anglerPose.z) < MIN_WALK) return false;
  const path = walkPath(anglerPose.x, anglerPose.z, x, z);
  if (!path) return false;
  anglerPose.route = path;
  return true;
}
