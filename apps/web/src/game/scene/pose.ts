import { DOCK_STAND_X, DOCK_STAND_Z, footHeight } from "@stillwater/shared";

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
};

export function shortestYaw(from: number, to: number) {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}
