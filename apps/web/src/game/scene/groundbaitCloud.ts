import { LAKE_CENTER_Z, type SpotId } from "@stillwater/shared";
import { BANK_STANDS, PLACES } from "../hotspot";
import { GROUNDBAIT_CASTS, SWIM_MAX_CASTS, TOPUP_MAX, type Groundbait } from "../logic";

/** How wide the cloud of groundbait spreads on the water, in metres. */
export const CLOUD_RADIUS = 1.1;

/** How far out from the stand, toward the middle of the lake, a handful is tossed. */
export const TOSS_M = 4;
/** And this far to the angler's right, so the angler's own back does not hide the cloud from the camera behind. */
export const TOSS_SIDE_M = 1.6;

/** Where a handful tossed from a bank lands: the open water nearest a short toss out toward the middle of the lake. */
export function cloudCenter(spot: SpotId): { x: number; z: number } {
  const stand = BANK_STANDS[spot];
  const out = Math.hypot(stand.x, LAKE_CENTER_Z - stand.z) || 1;
  const dx = -stand.x / out;
  const dz = (LAKE_CENTER_Z - stand.z) / out;
  const aim = { x: stand.x + dx * TOSS_M - dz * TOSS_SIDE_M, z: stand.z + dz * TOSS_M + dx * TOSS_SIDE_M };
  const away = (place: { x: number; z: number }) => Math.hypot(place.x - aim.x, place.z - aim.z);
  return PLACES[spot].reduce((best, place) => (away(place) < away(best) ? place : best));
}

/** A swim whose feeders were scattered (GT477) shows this much of its cloud, until they come back. */
const SCATTERED_THIN = 0.6;

/** The cloud thins as its casts are fished out: faint on the last cast, full at a fresh handful's casts, and thicker still on a swim topped up past them; thinner while its feeders are scattered. */
export function cloudOpacity(casts: number, scattered = false): number {
  const fresh = Math.max(0, Math.min(1, casts / GROUNDBAIT_CASTS));
  const topped = Math.max(0, Math.min(1, (casts - GROUNDBAIT_CASTS) / (SWIM_MAX_CASTS - GROUNDBAIT_CASTS)));
  return (0.1 + 0.3 * fresh + 0.15 * topped) * (scattered ? SCATTERED_THIN : 1);
}

/** Feeders dimpling over a swim they have gathered at (GT442): rings at a time, each this long, and how far out over the cloud. */
export const DIMPLES = 4;
export const DIMPLE_SEC = 1.8;
const DIMPLE_REACH = 0.75;

/** Feeders show over a swim they gathered at while it was left, or over one topped up as it faded, until a lost big feeder scatters them. */
export function feedersShow(bait: Groundbait, primed: boolean): boolean {
  return !bait.spooked && (primed || (bait.built ?? 0) > 0);
}

/** A lost big feeder scatters the feeders: this many wakes fan out toward open water over this long, in a spread of this many radians. */
export const SCATTER_WAKES = 3;
export const SCATTER_SEC = 2;
const SCATTER_FAN = 1.1;
/** How far from the cloud's middle a wake has gone by its end, and the span of the bow arc it draws. */
const SCATTER_RUN = 1.3;
export const WAKE_ARC = 1.8;

/** The way out over open water from a bank, as a heading (a +z-facing figure turned by it): from the stand through the cloud. */
export function openWaterYaw(spot: SpotId): number {
  const stand = BANK_STANDS[spot];
  const at = cloudCenter(spot);
  return Math.atan2(at.x - stand.x, at.z - stand.z);
}

/** Wake `i` of the scatter, `age` seconds on, fanning from the cloud's middle along `yaw`: its heading, how far it has run, how big its bow arc is and how bright (0..1); null once it has faded. Pure. */
export function scatterWakeAt(i: number, age: number, yaw: number): { yaw: number; run: number; size: number; glow: number } | null {
  const k = age / SCATTER_SEC;
  if (k < 0 || k >= 1) return null;
  const fan = SCATTER_WAKES > 1 ? i / (SCATTER_WAKES - 1) - 0.5 : 0;
  return { yaw: yaw + fan * SCATTER_FAN, run: SCATTER_RUN * (1 - (1 - k) ** 2), size: 0.18 + 0.4 * k, glow: (1 - k) ** 2 };
}

/** Dimple `i` at `time` over a swim topped up `built` times: where over the cloud's middle it rings and how far through its spread (0..1). Pure. */
export function dimpleAt(i: number, time: number, built = 0): { dx: number; dz: number; age: number } {
  // Each ring has its own cycle length, so they never fall into step; a built swim's feeders ring again sooner.
  const cycle = DIMPLE_SEC + (0.7 + i * 0.53) * (1 - 0.35 * Math.min(built, TOPUP_MAX));
  const round = Math.floor((time + i * 1.17) / cycle);
  const age = ((time + i * 1.17) % cycle) / DIMPLE_SEC;
  const turn = Math.sin((round + 1) * 12.9898 + i * 78.233) * 43758.5453;
  const angle = (turn - Math.floor(turn)) * Math.PI * 2;
  const out = DIMPLE_REACH * Math.sqrt(Math.abs(Math.cos(turn)));
  return { dx: Math.cos(angle) * out, dz: Math.sin(angle) * out, age };
}

/** A big feeder rolls at the cloud's edge at most once in this many seconds, its back and tail over in this long. */
export const ROLL_GAP_SEC = 15;
export const ROLL_SEC = 1.6;
/** Its swirl spreads on after the tail goes under, to this many roll lengths. */
export const ROLL_SPAN = 1.8;

function hash(i: number) {
  const s = Math.sin(i * 91.7 + 17.3) * 43758.5453;
  return s - Math.floor(s);
}

/** The roll under way at `time`, if any: where by the cloud's middle, which way it heads round the edge, and how far through (0..ROLL_SPAN; the fish shows below 1). Pure. */
export function rollAt(time: number): { dx: number; dz: number; yaw: number; age: number } | null {
  const slot = Math.floor(time / ROLL_GAP_SEC);
  const start = slot * ROLL_GAP_SEC + hash(slot) * (ROLL_GAP_SEC - ROLL_SEC * ROLL_SPAN);
  const age = (time - start) / ROLL_SEC;
  if (age < 0 || age >= ROLL_SPAN) return null;
  const angle = hash(slot + 0.5) * Math.PI * 2;
  const out = CLOUD_RADIUS * (0.8 + 0.15 * hash(slot + 0.25));
  const turn = hash(slot + 0.75) < 0.5 ? 1 : -1;
  return { dx: Math.cos(angle) * out, dz: Math.sin(angle) * out, yaw: Math.atan2(-Math.sin(angle) * turn, Math.cos(angle) * turn), age };
}

/** Bait thieves crowding a swim (GT484): this many shiners over a fresh one, fewer once topped up, none once built all the way. */
export const THIEVES = 5;
const TOPPED_THIEVES = 2;

/** How many shiners crowd a swim topped up `built` times. */
export function thiefCount(built = 0): number {
  if (built >= TOPUP_MAX) return 0;
  return built > 0 ? TOPPED_THIEVES : THIEVES;
}

/** Each shiner's dart takes about this long; it darts in from past the cloud's edge, turns at this share of it and darts back out, gone from this share on. */
const THIEF_SEC = 2.2;
const THIEF_TURN = 0.3;
const THIEF_GONE = 0.7;
/** It starts and ends its dart this far out from the cloud's middle, and turns away this far in. */
export const THIEF_OUT = 1.15 * CLOUD_RADIUS;
const THIEF_IN = 0.8 * CLOUD_RADIUS;
/** How far round the cloud it slips while turning in, and by the end of the dart. */
const THIEF_SLIP = 0.25;
const THIEF_SWING = 0.9;

function edgePoint(angle: number, out: number) {
  return { x: Math.cos(angle) * out, z: Math.sin(angle) * out };
}

function heading(from: { x: number; z: number }, to: { x: number; z: number }) {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

/** Shiner `i` at `time`: where by the cloud's middle, its heading (a +z-facing fish turned by it) and how much of it shows (0..1); null between darts. Held at the turn of its dart when `still`. Pure. */
export function thiefAt(i: number, time: number, still = false): { dx: number; dz: number; yaw: number; show: number } | null {
  const cycle = THIEF_SEC + 0.41 * i;
  const round = still ? 0 : Math.floor((time + i * 0.83) / cycle);
  const k = still ? THIEF_TURN : ((time + i * 0.83) % cycle) / cycle;
  if (k < 0 || k >= THIEF_GONE) return null;
  const angle = still ? (i / THIEVES) * Math.PI * 2 + 0.4 : hash(round * 7 + i * 13.1) * Math.PI * 2;
  const side = still || hash(round * 7 + i * 13.1 + 0.5) < 0.5 ? 1 : -1;
  const from = edgePoint(angle, THIEF_OUT);
  const turn = edgePoint(angle + THIEF_SLIP * side, THIEF_IN);
  const away = edgePoint(angle + THIEF_SWING * side, THIEF_OUT);
  const show = still ? 1 : Math.min(1, k / 0.06, (THIEF_GONE - k) / 0.1);
  const inYaw = heading(from, turn);
  if (k < THIEF_TURN) {
    const u = 1 - (1 - k / THIEF_TURN) ** 2;
    return { dx: from.x + (turn.x - from.x) * u, dz: from.z + (turn.z - from.z) * u, yaw: inYaw, show };
  }
  const v = (k - THIEF_TURN) / (THIEF_GONE - THIEF_TURN);
  const u = 1 - (1 - v) ** 2;
  // It whips round over the first fifth of the dart away.
  const swing = Math.atan2(Math.sin(heading(turn, away) - inYaw), Math.cos(heading(turn, away) - inYaw));
  return { dx: turn.x + (away.x - turn.x) * u, dz: turn.z + (away.z - turn.z) * u, yaw: inYaw + swing * Math.min(1, v / 0.2), show };
}
