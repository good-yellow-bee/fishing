import { BASKING_LOG } from "./scene/turtleMotion";

/** How far from the half-sunk log a lure can land and still be tight to it, in metres. */
export const LOG_REACH = 0.7;
/** Fish hold in the shade under the log, so a cast tight to it bites this much sooner. */
export const SUNKEN_LOG_WAIT = 0.85;

/** How far (x, z) lies from the log as the scene lays it: along x in its own frame, turned `yaw` about the vertical. */
function fromLog(x: number, z: number) {
  const ax = Math.cos(BASKING_LOG.yaw);
  const az = -Math.sin(BASKING_LOG.yaw);
  const dx = x - BASKING_LOG.x;
  const dz = z - BASKING_LOG.z;
  const along = Math.max(-BASKING_LOG.length / 2, Math.min(BASKING_LOG.length / 2, dx * ax + dz * az));
  return Math.hypot(dx - along * ax, dz - along * az);
}

/** Whether a lure landing at (x, z) is tight to the half-sunk log off the west bank, there all year. */
export function tightToLog(x: number, z: number) {
  return fromLog(x, z) <= LOG_REACH;
}
