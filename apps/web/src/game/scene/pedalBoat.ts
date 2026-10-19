import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";

/**
 * A swan pedalo: on calm, fine summer days two people pedal a white swan-shaped pedal boat in a
 * slow lazy loop out on the east water, its paddle wheel churning at the stern. It takes the water
 * the sailing dinghy uses on breezy days, so the two never meet. Pure in time.
 */

/** Out by day in summer under a clear or broken sky, when there is too little breeze to sail. */
export function pedaloOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason, wind: { x: number; z: number }) {
  return hour === "day" && season === "summer" && (sky === undefined || sky === "clear" || sky === "partly-cloudy") && Math.hypot(wind.x, wind.z) < CALM;
}

/** Below this breeze the dinghy stays in (sailingTrip's BREEZE), and the pedalo comes out. */
export const CALM = 0.035;
/** Its loop: an ellipse on open water north-east of the dock where it shows from the dock, clear of the canoe's far-shore route, the open-water fishing spot and the cormorant's rock. */
export const PEDAL_LOOP = { x: 8.6, z: -7.6, rx: 2.4, rz: 1.1 };
/** Seconds for one lap, going round anticlockwise seen from above. */
export const LAP_SEC = 110;
/** Seconds for one turn of the pedals. */
export const CRANK_SEC = 1.4;

export type PedaloPose = {
  x: number;
  z: number;
  /** Which way the bow points; the bow is +z. */
  yaw: number;
  /** The pedals' and paddle wheel's turn, in radians. */
  crank: number;
};

/** The pedalo `time` seconds in. `still` holds it on the near side of its loop with the pedals at rest. */
export function pedaloAt(time: number, still = false): PedaloPose {
  const angle = still ? Math.PI / 2 : (2 * Math.PI * time) / LAP_SEC;
  const { x: cx, z: cz, rx, rz } = PEDAL_LOOP;
  const x = cx + rx * Math.cos(angle);
  const z = cz + rz * Math.sin(angle);
  // Heading along the loop, as the angle grows.
  const yaw = Math.atan2(-rx * Math.sin(angle), rz * Math.cos(angle));
  return { x, z, yaw, crank: still ? 0 : (2 * Math.PI * time) / CRANK_SEC };
}
