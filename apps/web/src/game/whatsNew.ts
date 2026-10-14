/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-14g";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t(). */
export const NEWS_ITEMS: readonly string[] = [
  "A deer comes down to drink on the far bank at dawn and dusk. Cast close and it bounds away.",
  "Water striders skate the calm water off the dock.",
  "In spring a duck leads her ducklings round the east shallows.",
  "Cattail fluff drifts off the reeds in summer and fall.",
];

/** Whether this angler should see the card: someone who has fished before and not yet dismissed this batch. */
export function newsDue(caughtTotal: number, seen: string | null) {
  return caughtTotal > 0 && seen !== NEWS_ID;
}

export function readSeenNews(): string | null {
  try {
    return localStorage.getItem(NEWS_KEY);
  } catch {
    return null;
  }
}

export function markNewsSeen() {
  try {
    localStorage.setItem(NEWS_KEY, NEWS_ID);
  } catch {
    // Private mode: the card shows again next visit.
  }
}
