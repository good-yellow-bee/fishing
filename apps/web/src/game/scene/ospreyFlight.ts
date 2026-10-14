import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";

/**
 * An osprey on fine days: now and then it glides in over the far shore,
 * circles low over the open water, hangs a moment, folds and plunges feet
 * first with a splash, then labours off over the far trees, sometimes with a
 * fish. The dock camera sees little sky, so it hunts low enough to see
 * against the hills. Pure functions of time.
 */
export const OSPREY_CYCLE_SEC = 110;
export const OSPREY_START_SEC = 14;
export const ARRIVE_SEC = 6;
export const CIRCLE_SEC = 22;
export const HOVER_SEC = 1.6;
export const PLUNGE_SEC = 0.9;
export const DUNK_SEC = 0.5;
export const CLIMB_SEC = 7;
export const RING_SEC = 1.4;
const RADIUS = 5.5;
const CIRCLE_Y = 3.8;
const HOVER_Y = 3.4;
const FROM = { x: -32, y: 6.5, z: -18 } as const;
const AWAY = { x: 32, y: 8, z: -20 } as const;

export function ospreyOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return hour === "day" && season !== "winter" && (sky === "clear" || sky === "partly-cloudy");
}

function unit(slot: number, salt: number) {
  const s = Math.sin(slot * 29.3 + salt * 61.7) * 43758.5453;
  return s - Math.floor(s);
}

function lerp(a: number, b: number, u: number) {
  return a + (b - a) * u;
}

function ease(u: number) {
  const t = Math.min(1, Math.max(0, u));
  return t * t * (3 - 2 * t);
}

export type OspreyPose = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Nose down for the plunge, up as it labours away, in radians. */
  pitch: number;
  /** 1 wings spread, 0 folded back for the plunge. */
  spread: number;
  /** Beating its wings (hovering or climbing) rather than gliding. */
  flapping: boolean;
  /** Carrying a fish away. */
  fish: boolean;
  /** The splash where it went in, 0..1 as it spreads; -1 when there is none. */
  ring: number;
  ringX: number;
  ringZ: number;
};

/** Where this cycle's hunt circles, and the spot it plunges at. */
export function ospreyHunt(slot: number) {
  const cx = (unit(slot, 1) * 2 - 1) * 8;
  const cz = -5 - unit(slot, 2) * 4;
  return { cx, cz, dive: { x: cx + (unit(slot, 3) * 2 - 1) * 2, z: cz + (unit(slot, 4) * 2 - 1) * 1.5 } };
}

function circleAt(cx: number, cz: number, u: number) {
  const a = Math.PI + u * Math.PI * 2 * 1.5;
  return { x: cx + Math.cos(a) * RADIUS, y: CIRCLE_Y + Math.sin(u * 7) * 0.3, z: cz + Math.sin(a) * RADIUS * 0.7 };
}

/** The osprey at `time`, or null while it is away. */
export function ospreyAt(time: number): OspreyPose | null {
  const slot = Math.floor(time / OSPREY_CYCLE_SEC);
  let into = time - slot * OSPREY_CYCLE_SEC - OSPREY_START_SEC;
  if (into < 0) return null;
  const { cx, cz, dive } = ospreyHunt(slot);
  const caught = unit(slot, 5) < 0.6;
  const quiet = { ring: -1, ringX: dive.x, ringZ: dive.z };
  const head = (from: { x: number; z: number }, to: { x: number; z: number }) => Math.atan2(to.x - from.x, to.z - from.z);

  if (into < ARRIVE_SEC) {
    const start = circleAt(cx, cz, 0);
    const u = ease(into / ARRIVE_SEC);
    return { x: lerp(FROM.x, start.x, u), y: lerp(FROM.y, start.y, u), z: lerp(FROM.z, start.z, u), yaw: head(FROM, start), pitch: 0, spread: 1, flapping: false, fish: false, ...quiet };
  }
  into -= ARRIVE_SEC;
  if (into < CIRCLE_SEC) {
    const u = into / CIRCLE_SEC;
    const at = circleAt(cx, cz, u);
    const ahead = circleAt(cx, cz, u + 0.01);
    return { ...at, yaw: head(at, ahead), pitch: 0, spread: 1, flapping: false, fish: false, ...quiet };
  }
  into -= CIRCLE_SEC;
  const end = circleAt(cx, cz, 1);
  if (into < HOVER_SEC) {
    const u = ease(into / HOVER_SEC);
    return { x: lerp(end.x, dive.x, u), y: lerp(end.y, HOVER_Y, u), z: lerp(end.z, dive.z, u), yaw: head(end, dive), pitch: 0.25, spread: 1, flapping: true, fish: false, ...quiet };
  }
  into -= HOVER_SEC;
  const yaw = head(end, dive);
  if (into < PLUNGE_SEC) {
    const u = into / PLUNGE_SEC;
    return { x: dive.x, y: HOVER_Y * (1 - u * u), z: dive.z, yaw, pitch: -1.3, spread: 1 - ease(u * 1.5) * 0.85, flapping: false, fish: false, ...quiet };
  }
  into -= PLUNGE_SEC;
  const ring = into < RING_SEC ? into / RING_SEC : -1;
  if (into < DUNK_SEC) {
    return { x: dive.x, y: 0, z: dive.z, yaw, pitch: -0.3, spread: 0.5, flapping: false, fish: false, ring, ringX: dive.x, ringZ: dive.z };
  }
  into -= DUNK_SEC;
  if (into < CLIMB_SEC) {
    const u = into / CLIMB_SEC;
    const k = ease(u);
    return {
      x: lerp(dive.x, AWAY.x, k),
      y: lerp(0.2, AWAY.y, Math.sqrt(u)),
      z: lerp(dive.z, AWAY.z, k),
      yaw: head(dive, AWAY),
      pitch: 0.35 * (1 - u),
      spread: 1,
      flapping: true,
      fish: caught,
      ring: into + DUNK_SEC < RING_SEC ? (into + DUNK_SEC) / RING_SEC : -1,
      ringX: dive.x,
      ringZ: dive.z,
    };
  }
  return null;
}

/** Seconds into the cycle when it hits the water. */
export function ospreyStrikeAt(slot: number) {
  return slot * OSPREY_CYCLE_SEC + OSPREY_START_SEC + ARRIVE_SEC + CIRCLE_SEC + HOVER_SEC + PLUNGE_SEC;
}
