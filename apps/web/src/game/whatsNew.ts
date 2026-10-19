/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-19-pa28";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t().
 * The card shows only the newest four, and this list ships with every page, so older lines are dropped. */
export const NEWS_ITEMS: readonly string[] = [
  "With Sound captions on, a deer snorting on the far bank and ducklings peeping now get words on screen too, even with sound off. A keyboard player sees a clear ring on the catch card's and the toasts' buttons, and on a phone the Photos links for a fish without a photo and the Map list's Copy the place are easier to tap.",
  "Find a catch offers its best words as one-tap searches, and a search's spreadsheet is named after it. A fish's page says its place on the outing, such as fish 3 of 5.",
  "An old windmill now stands on the hills behind the far bank, its sails turning with the day's wind and standing still when it drops. By day in spring and fall a little flock of sheep grazes the hay field on those hills, and in spring their lambs skip along after them.",
  "On summer and fall evenings a pale barn owl hunts low over the hay fields on the far hills, hovering and dropping into the stubble. On summer days a little red tractor works the field, and on clear days the shadows of passing clouds slide over the hills as well as the water.",
  "A farmhouse and a red barn now stand on the hills behind the far bank: their windows glow in the evening, the chimney smokes on cold days, and from spring to fall three cows graze the pasture beside them. On calm, clear mornings a low bank of mist lies along the foot of the hills.",
  "Find an outing offers its best words as one-tap searches. In the small hours last evening's outing reads Last night, outing cards count missed strikes, and a water's tackle tips go on the list all at once.",
  "When a fish drops your bait before the strike, it was never hooked: cast straight back to the same spot and it may take again. And a sturgeon sulking on the bottom now takes two pumps to lift, like a catfish.",
  "Where a bigger fish hunts the small ones, stop reeling a hooked one for a moment and let it flutter: the pike, bass or walleye hunting there may take it. And a golden shiner landed in a clean fight goes back out as lively live bait that draws more of the hunters.",
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
