import { lureClass, type LakeHour, type LakeSeason, type SpotId } from "@stillwater/shared";
import { t } from "../i18n";
import {
  crankPilingWaitMul,
  crankRockWaitMul,
  fallBigLureWaitMul,
  favorsLargeFish,
  flashWaitMul,
  floatReedWaitMul,
  flyDriftWaitMul,
  flyHatchWaitMul,
  jigWaitMul,
  jigWinterWaitMul,
  postFrontWaitMul,
  lureStrengthAt,
  spinnerInletWaitMul,
  spinnerReedWaitMul,
  spinnerThumpWaitMul,
  spoonOpenWaitMul,
  streamerLedgeWaitMul,
  topwaterNightWaitMul,
  topwaterWaitMul,
  wormInletWaitMul,
  wormNightWaitMul,
  wormPilingWaitMul,
} from "./logic";
import type { ScenePhase } from "./scene/types";

/** Below this Strength most of what a big lure draws snaps the line. */
export const BIG_LURE_STRENGTH = 3;

/** Idle and the charge are still on the bank. Flight, fight, and landing keep the lure. */
export function lureCanChange(phase: ScenePhase): boolean {
  return phase === "idle" || phase === "casting";
}

/** The lure tied on until the angler picks one: the first small lure while the line is light. */
export function defaultLure(choices: readonly string[], strength: number): string {
  const first = choices[0] ?? "Bobber";
  if (strength >= BIG_LURE_STRENGTH) return first;
  return choices.find((lure) => !favorsLargeFish(lure)) ?? first;
}

export function smallLuresFirst(choices: readonly string[]): string[] {
  return [...choices.filter((lure) => !favorsLargeFish(lure)), ...choices.filter((lure) => favorsLargeFish(lure))];
}

/** The lure `step` places on from `current` in the picker's order, wrapping round; `current` itself when nothing else is packed. */
export function nextLure(choices: readonly string[], current: string, step: 1 | -1): string {
  const order = smallLuresFirst(choices);
  if (order.length === 0) return current;
  const at = order.indexOf(current);
  if (at < 0) return order[0]!;
  return order[(at + step + order.length) % order.length]!;
}

export function lureBlurb(lure: string, spot: SpotId): string {
  if (favorsLargeFish(lure)) return t("Big lure — heavier fish (Strength {rank}+ to land most)", { rank: BIG_LURE_STRENGTH });
  // The light half of every bank still holds fish a Strength 1 line cannot land.
  return t("Small lure — lighter fish (some here need Strength {rank})", { rank: lureStrengthAt(spot, lure) });
}

/** The bank bonuses a lure gets whatever the weather: a spinner along the reeds, a worm by the pilings, a jig down the ledge. */
const BANK_WAITS = [
  crankPilingWaitMul,
  crankRockWaitMul,
  floatReedWaitMul,
  flyDriftWaitMul,
  jigWaitMul,
  spinnerInletWaitMul,
  spinnerReedWaitMul,
  spoonOpenWaitMul,
  streamerLedgeWaitMul,
  wormInletWaitMul,
  wormPilingWaitMul,
];

/** Whether a lure draws the bite sooner at this bank in any weather, so the picker can point it out. */
export function suitsBank(lure: string, spot: SpotId): boolean {
  return BANK_WAITS.some((waitMul) => waitMul(lure, spot) < 1);
}

/** The lake as it is right now: what the lure bonuses that come and go read. `moon` is the moon's lit share; `rising` is the evening rise; `date` is the clock, now unless given. */
export type LureConditions = { sky: string; hour: LakeHour; season: LakeSeason; wind: string | undefined; moon: number; rising: boolean; date?: Date };

/**
 * Whether the season, hour and weather draw the bite sooner on this lure right now: a spinner or spoon flashing on a clear day,
 * a worm or popper after dark, a spinner thumping in murky water, a fly on the rise, a big lure in fall, a jig in winter.
 * A breezy chop helps every lure but a popper alike, so it marks none. On the bright morning after the rain, the slow jig or worm the
 * sulking fish still take is marked too, though it only escapes the slow bite every other lure has.
 */
export function suitsNow(lure: string, now: LureConditions): boolean {
  const date = now.date ?? new Date();
  if (postFrontWaitMul(date, now.sky, undefined) > 1 && postFrontWaitMul(date, now.sky, lure) === 1) return true;
  const topwater = lure.trim() !== "" && lureClass(lure).id === "popper";
  const wait =
    topwaterWaitMul(topwater, now.wind) *
    topwaterNightWaitMul(topwater, now.hour) *
    flashWaitMul(lure, now.sky, now.hour, now.moon) *
    wormNightWaitMul(lure, now.hour) *
    spinnerThumpWaitMul(lure, now.sky) *
    flyHatchWaitMul(lure, now.rising) *
    fallBigLureWaitMul(lure, now.season) *
    jigWinterWaitMul(lure, now.season);
  return wait < 1;
}
