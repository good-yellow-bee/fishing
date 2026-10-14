/** Seconds from the hand to the water when a landed fish is let go. */
export const RELEASE_DROP_SEC = 0.8;
/** How long the ring spreads where it went in. */
export const RELEASE_RING_SEC = 0.7;
/** The farthest out from the hand the fish is lowered, in meters. */
export const RELEASE_REACH = 1.6;
/** How high the toss lifts it at the top of the arc. */
const RELEASE_ARC = 0.25;

type Point = { x: number; y: number; z: number };

/** Where the fish goes back in: toward where it came out, at most `RELEASE_REACH` out from the hand. */
export function releaseEntry(out: { x: number; z: number }, hand: Point, from: { x: number; z: number }) {
  const dx = from.x - hand.x;
  const dz = from.z - hand.z;
  const far = Math.hypot(dx, dz);
  const k = far > RELEASE_REACH ? RELEASE_REACH / far : 1;
  out.x = hand.x + dx * k;
  out.z = hand.z + dz * k;
  return out;
}

/** Progress of the drop, 0 to 1; -1 before it starts. */
export function releaseDrop(age: number) {
  if (age < 0) return -1;
  return Math.min(1, age / RELEASE_DROP_SEC);
}

/** The ring where it went in, 0 to 1 as it spreads; -1 before the fish reaches the water and once it has faded. */
export function releaseRing(age: number) {
  const since = age - RELEASE_DROP_SEC;
  if (since < 0 || since >= RELEASE_RING_SEC) return -1;
  return since / RELEASE_RING_SEC;
}

/** The fish along a short lob from the hand to the water at `k` of the drop. */
export function releasePoint(out: Point, hand: Point, entry: { x: number; z: number }, waterY: number, k: number) {
  const ease = k * k * (3 - 2 * k);
  out.x = hand.x + (entry.x - hand.x) * ease;
  out.z = hand.z + (entry.z - hand.z) * ease;
  out.y = hand.y + (waterY - hand.y) * k * k + Math.sin(Math.PI * k) * RELEASE_ARC;
  return out;
}

/** Nose down as it goes in: level in the hand, steep at the water. */
export function releasePitch(k: number) {
  return -1.1 * k * k;
}
