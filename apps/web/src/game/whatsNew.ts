/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-18-field33";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t().
 * The card shows only the newest four, and this list ships with every page, so older lines are dropped. */
export const NEWS_ITEMS: readonly string[] = [
  "The Map's own sheet has a scale bar, each water on the Map names the lure that took most of its fish, and a sample water's page links to its place on the Map.",
  "On a phone held sideways the fight card now stays under the top bar and clear of the Reel button, even with the largest text, and the shack and Settings give their lists more room. The notice that effects went to Lite now waits until the fight is over instead of covering the tension bar.",
  "Home offers “Set a goal for the year” once the year has fish, the Days out calendar marks its busiest month, and the catches spreadsheet gives a night session's small-hours fish its outing's day.",
  "Little waves now lap in and out along the shore, washing furthest up the bank the wind blows onto, and the canoe and the dinghy leave a wake. On breezy days from spring to fall a child flies a kite out over the lake from the upwind bank. Campers have pitched a tent on the far bank: it glows with lantern light from dusk, and in the evening they sit out by their campfire. In fall pumpkins sit under the big tree by the shack, one carved into a jack-o'-lantern that glows after dark, and in winter someone skis along the far bank.",
  "A worm cast six times without landing a fish now soaks pale and loses its scent, so bites on it come slower until you put a fresh one on with Rebait (or T). And the lake's water temperature now matters: on a day the water has warmed since yesterday the fish wake up to feed and bite sooner, on a day it has cooled they bite slower, and the shack's chalk board says which days, with the temperature.",
  "The lake loads faster: the angler's model is half its old size. On a phone held sideways the top bar fits on one row, and with the largest text the catch card shows the fish before its buttons. A laptop zoomed to 200% now gets the same compact layout, so the lake is no longer hidden under the header.",
  "A fish's page offers “Add a photo” when it has none and says how the same day went in an earlier year, and Photos can show one year at a time.",
  "At night the far cabin's lit windows shine on the lake as streaks of warm light. On breezy days a little sailing dinghy reaches back and forth across the lake, heeling to the wind, and a tyre swing hangs from the oak by the shack, rocking in the breeze and capped with snow in winter.",
  "The field log and the lake open faster on a phone: the first download is 20 KB smaller, and in Polish the language file is half its old size. The lake's hint bar and controls strip now mention the arrow keys for aiming. With reduce motion on, rain, snow and falling leaves hold still instead of sweeping across the screen.",
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
