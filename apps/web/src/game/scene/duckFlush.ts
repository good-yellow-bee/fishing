/**
 * Ducks paddle their loops until a cast lands close; then they run along the
 * water, lift off away from the splash and are gone for a while before they
 * glide back in. Pure functions of time, like the heron.
 */

/** A cast landing closer than this flushes a duck. */
export const DUCK_SCARE_RADIUS = 4;
/** Only a splash this fresh counts, so an old one never flushes a duck that just came back. */
export const SPLASH_FRESH_SEC = 0.6;
/** Seconds from the flush until it is out of sight, how long it stays away, and the glide back. */
export const DUCK_FLUSH_SEC = 6;
export const DUCK_AWAY_SEC = 30;
export const DUCK_RETURN_SEC = 5;
/** How far it flies out and how high it climbs; the glide back starts partway along the same line. */
const FLUSH_DIST = 42;
const FLUSH_HEIGHT = 11;
const RETURN_DIST = 22;
const RETURN_HEIGHT = 6;

export type Splash = { x: number; z: number; at: number };

/** Where the last cast entered the water, in scene clock seconds; -Infinity until the first. */
export const lastSplash: Splash = { x: 0, z: 0, at: Number.NEGATIVE_INFINITY };

export function markSplash(x: number, z: number, at: number) {
  lastSplash.x = x;
  lastSplash.z = z;
  lastSplash.at = at;
}

export type Heading = { x: number; z: number };

export type DuckState =
  | { mode: "paddling" }
  | { mode: "flushed"; since: number; from: Heading; dir: Heading }
  | { mode: "away"; since: number; dir: Heading }
  | { mode: "returning"; since: number; dir: Heading };

export type DuckFlight = { x: number; y: number; z: number; yaw: number; flap: number };

/** Advances one duck's state given where it would paddle now and the last splash. */
export function stepDuck(state: DuckState, time: number, at: Heading, splash: Splash): DuckState {
  if (state.mode === "paddling") {
    const fresh = time - splash.at >= 0 && time - splash.at < SPLASH_FRESH_SEC;
    const dx = at.x - splash.x;
    const dz = at.z - splash.z;
    const dist = Math.hypot(dx, dz);
    if (!fresh || dist >= DUCK_SCARE_RADIUS) return state;
    // Straight away from the splash; a splash right on the duck sends it off along +x.
    const dir = dist > 1e-6 ? { x: dx / dist, z: dz / dist } : { x: 1, z: 0 };
    return { mode: "flushed", since: time, from: { x: at.x, z: at.z }, dir };
  }
  if (state.mode === "flushed" && time - state.since >= DUCK_FLUSH_SEC) return { mode: "away", since: time, dir: state.dir };
  if (state.mode === "away" && time - state.since >= DUCK_AWAY_SEC) return { mode: "returning", since: time, dir: state.dir };
  if (state.mode === "returning" && time - state.since >= DUCK_RETURN_SEC) return { mode: "paddling" };
  return state;
}

/** The flush: a short pattering run, then a climb out over the trees, wings beating fast. */
export function duckFlush(age: number, from: Heading, dir: Heading): DuckFlight {
  const u = Math.min(1, Math.max(0, age / DUCK_FLUSH_SEC));
  const reach = FLUSH_DIST * u ** 1.6;
  return {
    x: from.x + dir.x * reach,
    y: FLUSH_HEIGHT * Math.max(0, u - 0.05) ** 1.3,
    z: from.z + dir.z * reach,
    yaw: Math.atan2(dir.x, dir.z),
    flap: Math.sin(age * 38),
  };
}

/** The glide back: in from the side it left by, settling onto where it would be paddling. */
export function duckReturn(age: number, to: Heading, dir: Heading): DuckFlight {
  const u = Math.min(1, Math.max(0, age / DUCK_RETURN_SEC));
  const left = 1 - u * u * (3 - 2 * u);
  return {
    x: to.x + dir.x * RETURN_DIST * left,
    y: RETURN_HEIGHT * left ** 1.5,
    z: to.z + dir.z * RETURN_DIST * left,
    yaw: Math.atan2(-dir.x, -dir.z),
    // Wings held out in the glide, a few beats just before touching down.
    flap: u > 0.75 ? Math.sin(age * 30) : 0.35,
  };
}
