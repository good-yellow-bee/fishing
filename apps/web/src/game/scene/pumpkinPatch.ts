import { SHOP_X, SHOP_Z, type LakeHour, type LakeSeason } from "@stillwater/shared";

/**
 * Pumpkins by the shack in fall: three of them sitting in the grass, the biggest carved into a
 * jack-o'-lantern with a candle in it that is lit after dark, flickering. Pure in time.
 */

export type Pumpkin = { x: number; z: number; size: number; yaw: number; carved: boolean };

/** Where they sit: on the grass at the foot of the big tree east of the shack, clear of the cat's napping spot, where they show from the shack. */
export const PUMPKINS: readonly Pumpkin[] = [
  { x: SHOP_X + 2.35, z: SHOP_Z + 0.55, size: 0.3, yaw: -0.15, carved: true },
  { x: SHOP_X + 2.9, z: SHOP_Z + 0.78, size: 0.22, yaw: 1.3, carved: false },
  { x: SHOP_X + 2.05, z: SHOP_Z + 0.95, size: 0.17, yaw: 2.4, carved: false },
];

/** Out in fall only. */
export function pumpkinsOut(season: LakeSeason) {
  return season === "fall";
}

/** How brightly the candle in the jack-o'-lantern burns, 0 when it is not lit to about 1, flickering. `still` holds it steady. */
export function candleGlow(hour: LakeHour, time: number, still = false) {
  const base = hour === "night" ? 1 : hour === "dusk" ? 0.8 : 0;
  if (base === 0 || still) return base;
  const flicker = 0.08 * Math.sin(time * 9.1) + 0.05 * Math.sin(time * 15.7 + 2) + 0.04 * Math.sin(time * 3.3 + 1);
  return base * (0.85 + flicker);
}
