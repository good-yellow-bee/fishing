import type { SpotId } from "@stillwater/shared";

/**
 * A trophy that broke a line, still about its bank, trails the snapped float (SC292): cocked over on that bank's
 * water, it sits a while, dips under as the fish shifts, then slides off to the next stop round a small ring,
 * leaning as it is towed. Pure in time; held at its first stop under reduced motion.
 */

/** Where each bank's lost float drifts: out on that bank's own water, clear of where its giant swirls (giantWake.ts). */
const HOME: Partial<Record<SpotId, { x: number; z: number }>> = {
  dock: { x: 1.8, z: 3.2 },
  point: { x: -4.1, z: 10 },
  reeds: { x: -8.4, z: 8.9 },
  dropoff: { x: 13.6, z: -3 },
  inlet: { x: -19.2, z: -5.4 },
};

/** The ring the float wanders, a stop at a time. */
export const LOOP_R = 0.5;
const STOPS = 5;
/** Seconds between slides, and how long each slide lasts. */
const SLIDE_EVERY = 11;
const SLIDE_SEC = 1.6;
/** Partway through each rest the float dips under for a moment, this deep at most. */
const DIP_AT = 5.5;
const DIP_SEC = 0.9;
export const DIP = 0.22;
/** A snapped float lies cocked over, and leans further while it is towed. */
export const REST_TILT = 0.35;
const TOW_TILT = 0.35;

/** Where `bank`'s lost float drifts, or null for open water. */
export function lostFloatAt(bank: SpotId): { x: number; z: number } | null {
  return HOME[bank] ?? null;
}

/** Each bank's float keeps its own beat, so two lost floats never dip together. */
export function driftTurn(bank: SpotId) {
  return Object.keys(HOME).indexOf(bank);
}

/** The float's offset from its home, how far it is pulled under, its lean, and the yaw that turns the lean along its path. */
export function driftFloatPose(time: number, index: number, still: boolean) {
  const t = still ? 0 : time + index * 4.1;
  const leg = Math.floor(t / SLIDE_EVERY);
  const into = t - leg * SLIDE_EVERY;
  const slide = Math.min(1, into / SLIDE_SEC);
  const angle = ((leg + slide * slide * (3 - 2 * slide)) * 2 * Math.PI) / STOPS + index;
  const towed = slide < 1 ? Math.sin(slide * Math.PI) : 0;
  const dip = (into - DIP_AT) / DIP_SEC;
  return {
    x: LOOP_R * Math.cos(angle),
    z: LOOP_R * Math.sin(angle),
    sink: dip >= 0 && dip < 1 ? DIP * Math.sin(dip * Math.PI) : 0,
    tilt: REST_TILT + TOW_TILT * towed,
    // Unturned the float leans along +z; the path round the ring runs along (-sin, cos) of the angle.
    yaw: -angle,
  };
}
