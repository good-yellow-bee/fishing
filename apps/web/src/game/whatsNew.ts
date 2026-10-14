/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-14o";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t(). */
export const NEWS_ITEMS: readonly string[] = [
  "On some clear fall and winter nights, northern lights shimmer over the far shore and glow in the lake.",
  "In fall, a V of geese crosses high over the far shore. Look for it mirrored in the water.",
  "A woodpecker drums in the woods on dry mornings and days.",
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
