/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-19-field53";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t().
 * The card shows only the newest four, and this list ships with every page, so older lines are dropped. */
export const NEWS_ITEMS: readonly string[] = [
  "Home's What's new keeps to the field log. With nothing planned, Home's Next says when you were last out, with Go again, and behind a year's goal it says how many fish a week it needs. The book file gives this year's catches as a sheet of their own, and its last copy says how many fish it held.",
  "On grey and rainy days low cloud now hangs on the tops of the hills behind the far bank, drifting slowly along the ridge with the wind. On calm summer days two bright blue damselflies settle on the dock posts beside you, dart out to hover over the water, and come back.",
  "On fine, breezy days from spring to fall a paraglider soars along the ridge of the hills behind the far bank, banking round at each end. On fall evenings a bonfire burns on those hills between the hay fields, glowing in the dark with its smoke leaning away on the wind.",
  "With Sound captions on, a deer snorting on the far bank and ducklings peeping now get words on screen too, even with sound off. A keyboard player sees a clear ring on the catch card's and the toasts' buttons, and on a phone the Photos links for a fish without a photo and the Map list's Copy the place are easier to tap.",
  "At level 15, One with the lake, a strike in the first 48% of the bite sets the hook solid, not 40%. Far out the line stretches, so a long cast needs a quicker strike for a solid hook. And in winter, work a jig, spoon, popper or streamer slowly: touched again too soon, it puts the cold fish off.",
  "Find a catch offers its best words as one-tap searches, and a search's spreadsheet is named after it. A fish's page says its place on the outing, such as fish 3 of 5.",
  "An old windmill now stands on the hills behind the far bank, its sails turning with the day's wind and standing still when it drops. By day in spring and fall a little flock of sheep grazes the hay field on those hills, and in spring their lambs skip along after them.",
  "On summer and fall evenings a pale barn owl hunts low over the hay fields on the far hills, hovering and dropping into the stubble. On summer days a little red tractor works the field, and on clear days the shadows of passing clouds slide over the hills as well as the water.",
  "A farmhouse and a red barn now stand on the hills behind the far bank: their windows glow in the evening, the chimney smokes on cold days, and from spring to fall three cows graze the pasture beside them. On calm, clear mornings a low bank of mist lies along the foot of the hills.",
  "Find an outing offers its best words as one-tap searches. In the small hours last evening's outing reads Last night, outing cards count missed strikes, and a water's tackle tips go on the list all at once.",
  "When a fish drops your bait before the strike, it was never hooked: cast straight back to the same spot and it may take again. And a sturgeon sulking on the bottom now takes two pumps to lift, like a catfish.",
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
