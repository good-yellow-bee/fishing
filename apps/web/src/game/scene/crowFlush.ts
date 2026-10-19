import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";
import { joggerAt } from "./jogRun";

/**
 * Winter crows: a few crows strut about the snowy far shore at the water's edge, pecking, now
 * and then one lifting its head to caw. When the winter jogger comes running along the sand
 * they burst up, swing round in a loop out over the water and drop back down once the jogger
 * has gone by. Pure in time.
 */

/** At dawn and by day in winter, unless it is foggy. */
export function crowsOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return (hour === "dawn" || hour === "day") && season === "winter" && sky !== "fog";
}

export const CROWS = 3;
/** Where they feed: round the far shore between the woodpecker's snag and the old stump, just up from the water. */
export const FEED_ANGLE = 1.56;
const FEED_OUT = [0.45, 0.75, 0.6];
const FEED_SPREAD = [-0.9, 0.2, 1.1];
/** How close the jogger comes before they fly, and how long the loop out over the water takes. */
export const FLUSH_R = 3.2;
export const FLIGHT_SEC = 6;
const LOOK_BACK_SEC = 2 * (FLIGHT_SEC + 1);
/** The longest any crow waits before taking off. */
const MAX_DELAY = 0.5;
const LOOP_R = 2.4;
const LOOP_UP = 2.2;
const WANDER = 0.35;

function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function shore(angle: number, out: number) {
  const edge = lakeEdge(angle);
  return { x: Math.cos(angle) * (LAKE_RX * edge + out), z: LAKE_CENTER_Z - Math.sin(angle) * (LAKE_RZ * edge + out) };
}

/** Crow `i`'s feeding spot. */
export function crowHome(i: number) {
  const along = FEED_SPREAD[i % FEED_SPREAD.length]!;
  // A metre along the shore is about 1/RX of angle.
  return shore(FEED_ANGLE + along / LAKE_RX, FEED_OUT[i % FEED_OUT.length]!);
}

/** Seconds since the jogger last came running up within FLUSH_R of the flock, or null if not in the last while (or no jogger is out). */
export function sinceFlushed(time: number, jogging: boolean) {
  if (!jogging) return null;
  const middle = crowHome(1);
  const near = (at: number) => {
    const j = joggerAt(at);
    return Math.hypot(j.x - middle.x, j.z - middle.z) < FLUSH_R;
  };
  // Step back to the moment they came within reach; measured from a fixed grid so it never wavers between frames.
  const STEP = 0.1;
  const grid = Math.floor(time / STEP) * STEP;
  const comings: number[] = [];
  for (let back = LOOK_BACK_SEC; back >= 0; back -= STEP) {
    if (near(grid - back) && !near(grid - back - STEP)) comings.push(grid - back);
  }
  // A jogger coming by again while the crows are still up doesn't start a new loop.
  let flight: number | null = null;
  for (const at of comings) if (flight === null || at - flight >= FLIGHT_SEC + MAX_DELAY) flight = at;
  return flight === null ? null : time - flight;
}

export type CrowPose = { x: number; y: number; z: number; yaw: number; flap: number; peck: number; caw: number; flying: boolean };

function smooth(k: number) {
  const c = Math.min(1, Math.max(0, k));
  return c * c * (3 - 2 * c);
}

/**
 * Crow `i` at `time`: on the ground (height 0) strutting and pecking, or flying its loop; `flap`
 * is the wings' beat (-1 to 1), `peck` the head down (0 to 1), `caw` the beak open (0 to 1).
 * `flushed` is sinceFlushed() for this moment. `still` stands it on the shore.
 */
export function crowAt(i: number, time: number, flushed: number | null, still = false): CrowPose {
  const home = crowHome(i);
  const t = still ? 8 : time;
  const seed = i * 17;
  // Lake-ward from the shore, and the way along it.
  const outward = Math.atan2(-home.x, LAKE_CENTER_Z - home.z);
  const delay = hash(seed) * MAX_DELAY;
  const into = flushed === null || still ? null : flushed - delay;
  if (into !== null && into >= 0 && into < FLIGHT_SEC) {
    const k = into / FLIGHT_SEC;
    // Round a loop out over the water, starting and ending at home.
    const turn = 2 * Math.PI * smooth(k) * (i % 2 === 0 ? 1 : -1);
    const r = LOOP_R * (0.85 + 0.3 * hash(seed + 1));
    const cx = home.x + Math.sin(outward) * r;
    const cz = home.z + Math.cos(outward) * r;
    const from = outward + Math.PI;
    const a = from + turn;
    // Lifting off from, and landing back at, wherever it was strutting.
    const off = ground(i, t - into, false);
    const on = ground(i, t - into + FLIGHT_SEC, false);
    const leave = 1 - smooth(k / 0.15);
    const land = smooth((k - 0.85) / 0.15);
    const x = cx + Math.sin(a) * r + leave * (off.x - home.x) + land * (on.x - home.x);
    const z = cz + Math.cos(a) * r + leave * (off.z - home.z) + land * (on.z - home.z);
    const yaw = a + (turn >= 0 ? Math.PI / 2 : -Math.PI / 2);
    return { x, y: LOOP_UP * Math.sin(Math.PI * k) ** 0.7, z, yaw, flap: Math.sin(into * 15 + seed), peck: 0, caw: 0, flying: true };
  }
  return ground(i, t, still);
}

/** Crow `i` strutting about its spot at `t`, now this way, now that. */
function ground(i: number, t: number, still: boolean): CrowPose {
  const home = crowHome(i);
  const seed = i * 17;
  const wander = WANDER;
  const x = home.x + wander * Math.sin(t * 0.21 + seed) * Math.cos(t * 0.13 + seed * 2);
  const z = home.z + wander * 0.6 * Math.sin(t * 0.17 + seed * 3);
  const dx = wander * (0.21 * Math.cos(t * 0.21 + seed) * Math.cos(t * 0.13 + seed * 2) - 0.13 * Math.sin(t * 0.21 + seed) * Math.sin(t * 0.13 + seed * 2));
  const dz = wander * 0.6 * 0.17 * Math.cos(t * 0.17 + seed * 3);
  const yaw = Math.atan2(dx, dz);
  const peckCycle = (t * (0.5 + hash(seed + 2) * 0.3) + hash(seed + 3)) % 1;
  const peck = peckCycle < 0.2 ? Math.sin((peckCycle / 0.2) * Math.PI) : 0;
  const cawCycle = (t / (6 + hash(seed + 4) * 4) + hash(seed + 5)) % 1;
  const caw = cawCycle < 0.06 ? Math.sin((cawCycle / 0.06) * Math.PI) : 0;
  return { x, y: 0, z, yaw, flap: 0, peck: still ? 0 : peck, caw: still ? 0 : caw, flying: false };
}

