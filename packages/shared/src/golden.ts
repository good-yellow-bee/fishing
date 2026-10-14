/** About one fish in this many lands golden. */
export const GOLDEN_ODDS = 40;
/** Points multiplier for a golden fish; it stacks with the fish of the week. */
export const GOLDEN_BONUS = 2;

/**
 * Whether the catch with this request ID is golden. The roll is a hash of the ID, so the landed card,
 * the server and an offline retry all agree without sending a flag. The client picks the ID, so like hour
 * and sky this waits on the deferred anti-cheat.
 */
export function isGolden(requestId: string): boolean {
  // FNV-1a, 32 bit.
  let hash = 0x811c9dc5;
  const id = requestId.toLowerCase();
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % GOLDEN_ODDS === 0;
}
