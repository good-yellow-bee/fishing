import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, type LakeHour, type LakeSeason } from "@stillwater/shared";

/**
 * Dew on the shore grass: at dawn, outside winter, tiny drops along the banks
 * catch the low sun one after another, and the sparkle thins out as the
 * morning warms.
 */
export const DEW_GLINT_COUNT = 140;
/** From just past the water's edge back into the grass, as shares of the lake's radius. */
const BANK_FROM = 1.04;
const BANK_TO = 1.16;
/** Seconds into the visit over which the dew burns off down to what stays in the shade. */
export const DEW_BURN_SEC = 240;
export const DEW_LEFT = 0.3;

export function dewGlintsOut(hour: LakeHour, season: LakeSeason) {
  return hour === "dawn" && season !== "winter";
}

function hash(i: number, salt: number) {
  const s = Math.sin(i * 91.7 + salt * 27.1) * 43758.5453;
  return s - Math.floor(s);
}

/** Where drop `index` sits in the grass. */
export function dewGlintSpot(index: number) {
  const angle = hash(index, 1) * Math.PI * 2;
  const reach = BANK_FROM + hash(index, 2) * (BANK_TO - BANK_FROM);
  return {
    x: Math.cos(angle) * LAKE_RX * reach,
    y: 0.06 + hash(index, 3) * 0.2,
    z: LAKE_CENTER_Z + Math.sin(angle) * LAKE_RZ * reach,
  };
}

/** How much dew is left `time` seconds into the visit, 1 down to DEW_LEFT. */
export function dewLeft(time: number) {
  const u = Math.min(1, Math.max(0, time / DEW_BURN_SEC));
  return 1 - (1 - DEW_LEFT) * u;
}

/** Drop `index`'s sparkle at `time`, 0..1: mostly dark, with a brief bright glint now and then. */
export function dewGlint(index: number, time: number) {
  const rate = 0.6 + hash(index, 4) * 0.9;
  const wave = Math.max(0, Math.sin(time * rate + hash(index, 5) * Math.PI * 2));
  return wave ** 6 * dewLeft(time);
}
