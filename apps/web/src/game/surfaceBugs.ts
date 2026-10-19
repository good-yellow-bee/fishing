import { lureClass, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";
import { STRIDER_PATCH, stridersOut } from "./scene/striderSkate";
import { RAFT_DRIFT, WHIRLIGIG_RAFT, whirligigsOut } from "./scene/whirligigSpin";

/** How far past the striders' patch or the whirligigs' raft a lure can land and still be among the bugs, in metres. */
export const BUG_REACH = 0.3;
/** The fish there are looking up for bugs on the film, so a lure on top among them bites this much sooner. */
export const SURFACE_BUG_WAIT = 0.85;

/** Whether the lure sits on the surface like a bug: a popper or a dry fly. */
export function bugLike(lure: string | undefined) {
  if (lure === undefined || !lure.trim()) return false;
  const kind = lureClass(lure).id;
  return kind === "popper" || kind === "fly";
}

/** Whether a lure landing at (x, z) lands among the water striders or the whirligig beetles off the dock, while the scene has them out on calm water. */
export function amongSurfaceBugs(season: LakeSeason | undefined, hour: LakeHour, sky: Sky | undefined, wind: { x: number; z: number } | undefined, x: number, z: number) {
  if (!season) return false;
  const speed = wind ? Math.hypot(wind.x, wind.z) : 0;
  const onStriders = stridersOut(hour, sky, season, speed) && Math.hypot(STRIDER_PATCH.x - x, STRIDER_PATCH.z - z) <= STRIDER_PATCH.r + BUG_REACH;
  const onWhirligigs = whirligigsOut(hour, sky, season, speed) && Math.hypot(WHIRLIGIG_RAFT.x - x, WHIRLIGIG_RAFT.z - z) <= WHIRLIGIG_RAFT.r + RAFT_DRIFT + BUG_REACH;
  return onStriders || onWhirligigs;
}
