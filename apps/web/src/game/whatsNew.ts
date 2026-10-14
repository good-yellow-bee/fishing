/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-14b";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t(). */
export const NEWS_ITEMS: readonly string[] = [
  "Anglers now carry a title, from Greenhorn up to Lake legend.",
  "Press H for photo mode: every panel hides for a clean picture.",
  "Rain on a windy day can bring a storm, with lightning and thunder.",
  "Watch the far bank at dawn and dusk for an otter.",
  "Press ? for a card of every key and button.",
  "Leaves fall in autumn, mayflies dance over the evening rise, and lilies flower in summer.",
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
