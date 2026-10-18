/** The eye has to move this far, in meters, before the sun's glitter and the moon's road are laid again. */
export const ROAD_RELAY = 1.5;
/** The sun's glitter runs this far out from the eye, in meters, toward the sun. */
export const SUN_ROAD_NEAR = 8;
export const SUN_ROAD_FAR = 24;
/** The moon's road starts just past the angler's feet at the dock (the eye stands back of them) and runs up the lake. */
export const MOON_ROAD_NEAR = 7;
export const MOON_ROAD_FAR = 28;

/** Where the eye stands over the water: light on the water always runs from there toward the sun or moon. */
export function roadFrom(eye: { x: number; z: number }) {
  return { x: eye.x, z: eye.z };
}

/** Splits glints into their shimmer bands, one instanced mesh each. */
export function roadBands<T extends { band: number }>(glints: readonly T[], bands: number) {
  return Array.from({ length: bands }, (_, band) => glints.filter((glint) => glint.band === band));
}
