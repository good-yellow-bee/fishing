import { DOCK_STAND_X, DOCK_STAND_Z, OPEN_PAD } from "@stillwater/shared";

/**
 * The rowboat. It lies moored alongside the pier until the angler unties it,
 * rows out to the anchor over the deep hole, and rows back again.
 */

export type BoatMode = "moored" | "rowingOut" | "anchored" | "rowingBack";

/** Tied up off the east side of the pier, bow toward the lake. */
export const MOORING = { x: 1.75, z: 6.7 };
export const ANCHOR = { x: OPEN_PAD.x, z: OPEN_PAD.z };
/** Bends the row out east of the straight line, so the boat clears the pier's end. */
const BEND = { x: 4.6, z: 2.4 };

export const ROW_SECONDS = 6;
/** Moored bow-out, toward the open lake. */
export const MOORED_YAW = Math.PI;
/** The angler stands this high in the hull, over the water line. */
export const BOAT_DECK = 0.2;

export const boat = {
  mode: "moored" as BoatMode,
  /** 0 at the mooring, 1 at anchor. */
  u: 0,
  /** Where the bow points. Moored, it points out along the pier. */
  yaw: MOORED_YAW,
  /** At anchor, how far a run has swung the hull round on its anchor line, added to the yaw. */
  swing: 0,
};

/** How far the hull swings round toward a run at anchor, in radians. */
export const BOAT_SWING = 0.22;

/**
 * Where a fight swings the anchored hull: toward the fish on a run, back square between runs.
 * runSide is the scene's lateral lead sign, where positive is the angler's right, which turns the bow to a lower yaw.
 */
export function boatSwingTarget(surge: 0 | 1 | 2, runSide: number, jump = false) {
  return surge === 2 && !jump ? -BOAT_SWING * Math.max(-1, Math.min(1, runSide)) : 0;
}

const listeners = new Set<() => void>();

function setMode(mode: BoatMode) {
  if (boat.mode === mode) return;
  boat.mode = mode;
  for (const listener of listeners) listener();
}

export function subscribeBoat(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function boatMode() {
  return boat.mode;
}

/** The angler is in the boat: rowing or at anchor. */
export function aboard(mode: BoatMode = boat.mode) {
  return mode !== "moored";
}

/** Untie and row out. Only from the mooring. */
export function rowOut() {
  if (boat.mode !== "moored") return false;
  setMode("rowingOut");
  return true;
}

/** Pull the anchor and row home. Only at anchor. */
export function rowBack() {
  if (boat.mode !== "anchored") return false;
  setMode("rowingBack");
  return true;
}

export function resetBoat() {
  boat.u = 0;
  boat.yaw = MOORED_YAW;
  boat.swing = 0;
  setMode("moored");
}

function ease(u: number) {
  return u * u * (3 - 2 * u);
}

/** A point on the row between the mooring and the anchor, with the heading the bow points. */
export function boatPathPoint(u: number) {
  const t = ease(Math.min(1, Math.max(0, u)));
  const a = 1 - t;
  const x = a * a * MOORING.x + 2 * a * t * BEND.x + t * t * ANCHOR.x;
  const z = a * a * MOORING.z + 2 * a * t * BEND.z + t * t * ANCHOR.z;
  // Bezier tangent, never zero here since the bend is off the line.
  const dx = 2 * a * (BEND.x - MOORING.x) + 2 * t * (ANCHOR.x - BEND.x);
  const dz = 2 * a * (BEND.z - MOORING.z) + 2 * t * (ANCHOR.z - BEND.z);
  return { x, z, yaw: Math.atan2(dx, dz) };
}

/** Advance the row. Returns true on the frame the boat comes home, so the angler can step back onto the pier. */
export function stepBoat(dt: number) {
  if (boat.mode === "rowingOut") {
    boat.u = Math.min(1, boat.u + dt / ROW_SECONDS);
    if (boat.u >= 1) setMode("anchored");
    return false;
  }
  if (boat.mode === "rowingBack") {
    boat.u = Math.max(0, boat.u - dt / ROW_SECONDS);
    if (boat.u <= 0) {
      boat.yaw = MOORED_YAW;
      setMode("moored");
      return true;
    }
  }
  return false;
}

/** Where the angler steps back onto the planks. */
export const LANDING_STEP = { x: DOCK_STAND_X, z: DOCK_STAND_Z };
