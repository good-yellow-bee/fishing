import { SHOP_X, SHOP_Z, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * A snowshoe hare that comes out of the cover west of the shack at dawn and dusk, hops out onto
 * the grass, grazes, sits up now and then to look about, moves on to a second patch and hops home.
 * Brown from spring to fall, white in winter. Pure in time.
 */

type Spot = { x: number; z: number };

/** Where it hides between rounds: in the long grass beside the oak west of the shack. */
export const COVER: Spot = { x: SHOP_X - 4.3, z: SHOP_Z + 1.4 };
/** The two patches it grazes, out on the open grass behind the campfire, clear of the squirrels' run between the shack's trees. */
export const GRAZE: readonly Spot[] = [
  { x: SHOP_X - 2.3, z: SHOP_Z + 2.5 },
  { x: SHOP_X - 1.1, z: SHOP_Z + 2.9 },
];
const ROUTE: readonly Spot[] = [COVER, GRAZE[0]!, GRAZE[1]!, COVER];
/** Seconds hidden before each round, grazing on each patch, and per hop. */
const HIDE_SEC = 7;
const GRAZE_SEC = 9;
const HOP_SEC = 0.42;
/** The longest hop, in metres; a leg is split into as many hops as it needs. */
const HOP_LEN = 0.42;
const HOP_HEIGHT = 0.13;
/** How often it sits up while grazing, and how long it stays up. */
const SIT_EVERY = 4.2;
const SIT_SEC = 1.3;

/** Out at dawn and dusk, but it keeps to cover in the rain. */
export function hareOut(hour: LakeHour, sky: Sky | undefined) {
  return (hour === "dawn" || hour === "dusk") && sky !== "rain";
}

/** A snowshoe hare's coat turns white for the winter. */
export function hareCoat(season: LakeSeason) {
  return season === "winter" ? "white" : "brown";
}

type Leg = { from: Spot; to: Spot; start: number; hops: number; dur: number; grazeUntil: number };

function plan() {
  const legs: Leg[] = [];
  let t = HIDE_SEC;
  for (let k = 0; k + 1 < ROUTE.length; k += 1) {
    const from = ROUTE[k]!;
    const to = ROUTE[k + 1]!;
    const hops = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / HOP_LEN));
    const dur = hops * HOP_SEC;
    const home = k + 2 === ROUTE.length;
    legs.push({ from, to, start: t, hops, dur, grazeUntil: home ? t + dur : t + dur + GRAZE_SEC });
    t = legs[legs.length - 1]!.grazeUntil;
  }
  return { legs, total: t };
}

const PLAN = plan();
/** Seconds for one whole round, hidden spell included. */
export const HARE_ROUND_SEC = PLAN.total;

export type HarePose = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** 0 on all fours, 1 sitting up on its haunches. */
  upright: number;
  /** How far its head is down at the grass, 0 to 1. */
  nibble: number;
  /** How far through the stretch of a hop, 0 crouched to 1 stretched out. */
  stretch: number;
  /** Out of sight in the cover. */
  away: boolean;
};

function smooth(x: number) {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
}

/** The hare `time` seconds in. `still` holds it grazing on its first patch. */
export function hareAt(time: number, still = false): HarePose {
  const into = still ? PLAN.legs[0]!.start + PLAN.legs[0]!.dur + 1 : ((time % HARE_ROUND_SEC) + HARE_ROUND_SEC) % HARE_ROUND_SEC;
  for (const leg of PLAN.legs) {
    if (into < leg.start || into >= leg.grazeUntil) continue;
    const dx = leg.to.x - leg.from.x;
    const dz = leg.to.z - leg.from.z;
    const yaw = Math.atan2(dx, dz);
    const hopping = into - leg.start;
    if (hopping < leg.dur) {
      const p = (hopping / leg.dur) * leg.hops;
      const idx = Math.min(leg.hops - 1, Math.floor(p));
      const f = p - idx;
      const along = (idx + smooth(f)) / leg.hops;
      return { x: leg.from.x + dx * along, y: Math.sin(Math.PI * f) * HOP_HEIGHT, z: leg.from.z + dz * along, yaw, upright: 0, nibble: 0, stretch: Math.sin(Math.PI * f), away: false };
    }
    // Grazing: head down at the grass, sitting up every so often with a look round.
    const grazing = hopping - leg.dur;
    const inSit = grazing % SIT_EVERY;
    const sitStart = SIT_EVERY - SIT_SEC;
    const upright = inSit < sitStart ? 0 : smooth((inSit - sitStart) / 0.25) * smooth((SIT_EVERY - inSit) / 0.25);
    const nibble = (1 - upright) * (0.75 + 0.25 * Math.sin(grazing * 7));
    const turn = Math.sin(grazing * 0.6 + leg.start) * 0.5;
    return { x: leg.to.x, y: 0, z: leg.to.z, yaw: yaw + turn, upright, nibble, stretch: 0, away: false };
  }
  return { x: COVER.x, y: 0, z: COVER.z, yaw: 0, upright: 0, nibble: 0, stretch: 0, away: true };
}
