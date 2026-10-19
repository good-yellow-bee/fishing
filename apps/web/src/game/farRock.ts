import type { SpotId } from "@stillwater/shared";
import { CORMORANT_ROCK } from "./scene/cormorantPerch";

/** The far rock out in the open water reaches this far from its middle at the waterline; past the other it is just open water. */
export const FAR_ROCK_RADIUS = 0.8;
export const FAR_ROCK_REACH = 1.7;
/** The walleye hold in the rock's shadow, so a cast tight to it bites this much sooner. */
export const FAR_ROCK_WAIT = 0.85;

/** Whether a cast landing at (x, z) on `spot` lands tight to the far rock, from the boat. */
export function tightToFarRock(spot: SpotId, x: number, z: number) {
  if (spot !== "open") return false;
  const off = Math.hypot(x - CORMORANT_ROCK.x, z - CORMORANT_ROCK.z);
  return off > FAR_ROCK_RADIUS && off <= FAR_ROCK_REACH;
}
