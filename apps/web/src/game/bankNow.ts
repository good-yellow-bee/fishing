import type { SpotId } from "@stillwater/shared";
import { dockShadeWaitMul, lanternDockWaitMul, longShadowWaitMul, openGlareWaitMul, rainInletWaitMul, springShallowsWaitMul, summerDeepWaitMul, turnoverWaitMul, windPointWaitMul, windwardWaitMul, winterSunWaitMul } from "./logic";
import type { LureConditions } from "./lureChoice";

/**
 * Whether the season, hour and weather draw the bite sooner at this bank right now, whatever the lure: the Reeds in spring
 * or under a clear winter sun, the Drop-off on a summer day, the Dock's shade under a clear summer sky or its lanterns after dark, the Point in a
 * strong wind, a bank a light breeze blows onto, the Inlet in rain or while the lake turns over. The boat's summer glare, the angler's shadow under a low sun and the turnover elsewhere only slow it.
 */
export function bankSuitsNow(spot: SpotId, now: LureConditions): boolean {
  const wait =
    springShallowsWaitMul(spot, now.season) *
    winterSunWaitMul(spot, now.season, now.hour, now.sky) *
    summerDeepWaitMul(spot, now.season, now.hour) *
    dockShadeWaitMul(spot, now.season, now.hour, now.sky) *
    lanternDockWaitMul(spot, now.hour) *
    windPointWaitMul(spot, now.wind) *
    windwardWaitMul(spot, now.wind) *
    rainInletWaitMul(spot, now.sky) *
    openGlareWaitMul(spot, now.season, now.hour, now.sky) *
    longShadowWaitMul(spot, now.hour, now.sky) *
    turnoverWaitMul(now.date ?? new Date(), spot, now.season);
  return wait < 1;
}
