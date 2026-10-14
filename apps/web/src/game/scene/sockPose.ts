/** Where the windsock's pole stands: at the pier's left rail, toward the shore, so it is in view from the bank and the dock. */
export const WINDSOCK_AT = { x: -0.86, z: 7.7 };
/** Meters from the deck to the top of the pole. */
export const WINDSOCK_POLE = 1.7;
/** The strongest wind's drift (m/s); a sock at this or more stands straight out. */
const FULL_WIND = 0.13;

export type SockPose = { yaw: number; droop: number; flutter: number };

/**
 * How the sock hangs in the day's wind: pointing downwind (yaw about +y, 0 = toward +z), drooping from
 * straight down on a calm day to nearly level on a strong one, and fluttering more as it fills.
 */
export function windsockPose(wind: { x: number; z: number }, time: number): SockPose {
  const speed = Math.hypot(wind.x, wind.z);
  const fill = Math.min(1, speed / FULL_WIND);
  const yaw = speed > 1e-6 ? Math.atan2(wind.x, wind.z) : 0.6;
  // Calm: hangs nearly straight down; full: about level with a little sag.
  const droop = (1 - fill) * 1.45 + 0.08;
  const flutter = (0.03 + fill * 0.09) * Math.sin(time * (3 + fill * 6));
  return { yaw, droop, flutter };
}
