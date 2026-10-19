import type { LakeHour, LakeSeason } from "@stillwater/shared";
import { SCHOOL_ROAM, SCHOOL_SPREAD, TADPOLE_SCHOOLS, tadpolesOut } from "./scene/tadpoleSchools";

/** How far from a school's shallows a lure can land and still be among the tadpoles: as far as they wander and spread. */
export const TADPOLE_REACH = SCHOOL_ROAM + SCHOOL_SPREAD;
/** The fish come into the warm shallows to gorge on spring's tadpoles, so a cast among them bites this much sooner. */
export const TADPOLE_WAIT = 0.85;

/** Whether a lure landing at (x, z) lands among a school of tadpoles: spring, by daylight, as the scene shows them. */
export function amongTadpoles(season: LakeSeason | undefined, hour: LakeHour, x: number, z: number) {
  if (!season || !tadpolesOut(season, hour)) return false;
  return TADPOLE_SCHOOLS.some((school) => Math.hypot(school.x - x, school.z - z) <= TADPOLE_REACH);
}
