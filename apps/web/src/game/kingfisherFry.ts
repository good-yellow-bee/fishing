import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";
import { DIVE_REACH, KINGFISHER_PERCH, kingfisherOut } from "./scene/kingfisherFlight";

/** How far from the kingfisher's snag a lure can land and still be over the fry it dives on: its dives' reach and a little more. */
export const FRY_REACH = DIVE_REACH + 0.6;
/** The perch and bass hunt the same fry shoal under the snag, so a cast over it bites this much sooner. */
export const KINGFISHER_FRY_WAIT = 0.85;

/** Whether a lure landing at (x, z) lands over the fry under the kingfisher's snag: while the kingfisher is out to fish them, as the scene shows it. */
export function overKingfisherFry(season: LakeSeason | undefined, hour: LakeHour, sky: Sky | undefined, x: number, z: number) {
  if (!season || !kingfisherOut(hour, sky, season)) return false;
  return Math.hypot(KINGFISHER_PERCH.x - x, KINGFISHER_PERCH.z - z) <= FRY_REACH;
}
