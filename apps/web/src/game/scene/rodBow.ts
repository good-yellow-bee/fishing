import type { FightSurge } from "./fightMotion";

/** The most the rod's tip bows toward the fish, in the grip's units (the rod is about 0.94 long). */
export const ROD_BOW_MAX = 0.3;
/** fishing-rod.glb's mesh units per grip unit: the node's 100x times the 0.19 the rod is drawn at. */
export const ROD_MESH_SCALE = 19;

/** How far the tip bows: more under tension, more again while the fish surges. */
export function rodBowAmount(tension: number, surge: FightSurge) {
  const load = Math.min(1, Math.max(0, tension) * 0.8 + surge * 0.12);
  return load * ROD_BOW_MAX;
}

/**
 * The sideways offset, in mesh units along the mesh's -y (the grip's +z,
 * toward the line), of a rod vertex `along` the rod's length in mesh units.
 * The butt below the hand stays straight; above it the bow grows with the
 * square of the distance, like a rod loading from the tip down.
 */
export function rodBowOffset(along: number, length: number, amount: number) {
  if (along <= 0 || length <= 0) return 0;
  const u = Math.min(1, along / length);
  return (amount * u * u) / ROD_MESH_SCALE;
}

/** Where the bowed tip sits in grip space: pulled toward the line and a little shorter. */
export function rodTipAt(amount: number, straight: number) {
  return { y: straight - amount * amount * 0.6, z: amount };
}
