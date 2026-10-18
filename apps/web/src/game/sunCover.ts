import { useEffect, useState } from "react";
import type { LakeHour, Sky, SpotId } from "@stillwater/shared";

/** On a clear or partly cloudy day, fair-weather clouds drift over the sun in spells this long. */
export const CLOUD_SLOT_MS = 45_000;
/** The share of spells a cloud covers the sun. */
export const CLOUD_SHARE = 0.25;
/** While a cloud shades the sun the fish move up into the shallows, so a cast there bites sooner. */
export const CLOUD_SHADE_WAIT = 0.85;
/** The shallow banks the fish move up into under a cloud; the drop-off and the open water are deep already. */
export const SHALLOW_BANKS: ReadonlySet<SpotId> = new Set(["dock", "reeds", "point", "inlet"]);

function mix(value: number) {
  let n = value | 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return (n ^ (n >>> 16)) >>> 0;
}

/** Whether the sky has a sun for a cloud to cover: only by day, on a clear or partly cloudy day. */
function sunOut(sky: Sky | undefined, hour: LakeHour) {
  return hour === "day" && (sky === "clear" || sky === "partly-cloudy");
}

/** Whether a cloud covers the sun at `nowMs`: only while the sun is out, and the same for every angler at that moment. */
export function cloudOverSun(sky: Sky | undefined, hour: LakeHour, nowMs: number) {
  if (!sunOut(sky, hour)) return false;
  return mix(Math.floor(nowMs / CLOUD_SLOT_MS) * 131 + 7) % 1000 < CLOUD_SHARE * 1000;
}

/** How a cloud over the sun moves the wait at this bank: CLOUD_SHADE_WAIT in the shallows while it covers the sun, else 1. */
export function cloudShadeWaitMul(spot: SpotId, sky: Sky | undefined, hour: LakeHour, nowMs: number) {
  return SHALLOW_BANKS.has(spot) && cloudOverSun(sky, hour, nowMs) ? CLOUD_SHADE_WAIT : 1;
}

/** Whether a cloud covers the sun now, checked every second while one can, so the stance chip can say so. */
export function useCloudOverSun(sky: Sky | undefined, hour: LakeHour) {
  const [covered, setCovered] = useState(() => cloudOverSun(sky, hour, Date.now()));
  useEffect(() => {
    setCovered(cloudOverSun(sky, hour, Date.now()));
    if (!sunOut(sky, hour)) return;
    const timer = window.setInterval(() => setCovered(cloudOverSun(sky, hour, Date.now())), 1000);
    return () => window.clearInterval(timer);
  }, [sky, hour]);
  return covered;
}
