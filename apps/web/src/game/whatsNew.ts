/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-14u";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t(). */
export const NEWS_ITEMS: readonly string[] = [
  "In spring and summer, terns circle and dive over the bubbling fish patch, so you can spot it from across the lake.",
  "A cormorant stands on a rock out in the lake drying its wings, and slips in now and then to fish.",
  "In spring, watch for a pair of grebes rearing up and rushing across the water side by side.",
  "Cast too close to the cormorant or the grebes and they slip under; the loon, otter and kingfisher now dive head first.",
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
