/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-14";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t(). */
export const NEWS_ITEMS: readonly string[] = [
  "Trout, bass and salmon now leap mid-fight. Let go when they jump.",
  "One bank runs hot each day. The shack's chalk board says which.",
  "At warm, still dusks fish rise. Cast to a fresh ring for a quicker bite.",
  "Casts into the reeds' weed can snag. Tap three times to work the lure free.",
  "Clear nights have stars, mirrored in the lake, and a rod bell rings on a nibble.",
  "New settings: text size, left-handed, and high contrast.",
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
