/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-14d";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t(). */
export const NEWS_ITEMS: readonly string[] = [
  "Pick your float's colour in Settings.",
  "A turtle basks on a log on bright summer days. Cast close and it slides off.",
  "Listen for the owl on the far bank after dark.",
  "Now and then a fish leaps clear out on the open lake.",
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
