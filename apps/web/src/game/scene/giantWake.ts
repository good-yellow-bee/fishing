import type { SpotId } from "@stillwater/shared";

/**
 * Signs of a bank's giant (GT417) while it is still out this week: now and then a big swirl out on that bank's
 * water, two wide rings spreading and a dark back rolling up and under. Pure in time.
 */

/** Seconds between one bank's swirls, and how long each lasts. */
export const SWIRL_EVERY = 55;
export const SWIRL_SEC = 2.6;
/** Where each bank's giant rolls: out on that bank's own water (spotAt), where the dock's view can catch it. */
const WATER: Partial<Record<SpotId, { x: number; z: number }>> = {
  dock: { x: 1.2, z: 1.5 },
  point: { x: -5.2, z: 6.5 },
  reeds: { x: -11, z: 5 },
  dropoff: { x: 12, z: -4.5 },
  inlet: { x: -17, z: -6 },
};

/** Each bank's turn in the swirls, fixed, so a giant landed elsewhere never shifts the others' timing. */
export function swirlTurn(bank: SpotId) {
  return Object.keys(WATER).indexOf(bank);
}

/** Where `bank`'s giant shows, or null for open water. */
export function giantWaterAt(bank: SpotId): { x: number; z: number } | null {
  return WATER[bank] ?? null;
}

/** How far through its swirl bank number `index` is at `time` (0..1), or null between swirls; banks take turns. */
export function swirlPhase(time: number, index: number): number | null {
  const t = (((time + index * 17.3) % SWIRL_EVERY) + SWIRL_EVERY) % SWIRL_EVERY;
  return t < SWIRL_SEC ? t / SWIRL_SEC : null;
}
