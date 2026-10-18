/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-18-pa19";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t().
 * The card shows only the newest four, and this list ships with every page, so older lines are dropped. */
export const NEWS_ITEMS: readonly string[] = [
  "On a touch tablet the walking stick no longer covers \"Lately on the lake\": the feed now sits beside it, and the stick keeps its size with larger text, so it stays clear of the lure panel. While the first-cast guide shows on a laptop or tablet, the bank name beside it stops short of the guide instead of running under it.",
  "When a cloud slides over the sun on a bright day, the fish move up into the shallows to feed, so the Dock, the Reeds, the Point and the Inlet bite sooner while it lasts. A fish hooked out by the lily pads now fights like one in the weeds and dives for the pad stems, so turn every run. And when a bank is fished hard, a kind of lure its wary fish haven't seen yet catches them off guard.",
  "Gear's lure record can pack its best lures for your next outing in one go.",
  "On dry summer days a hummingbird zips in to the wildflowers by the shack and hovers at them one by one, and on clear summer days someone swims breaststroke in the shallows off the far bank, their towel on the sand. From spring to fall someone walks the far bank with a dog that runs on ahead and stops to sniff. On foggy days a lone angler in a yellow oilskin fishes from a rowboat anchored out on the lake.",
  "The Map's own sheet has a scale bar, each water on the Map names the lure that took most of its fish, and a sample water's page links to its place on the Map.",
  "On a phone held sideways the fight card now stays under the top bar and clear of the Reel button, even with the largest text, and the shack and Settings give their lists more room. The notice that effects went to Lite now waits until the fight is over instead of covering the tension bar.",
  "Home offers “Set a goal for the year” once the year has fish, the Days out calendar marks its busiest month, and the catches spreadsheet gives a night session's small-hours fish its outing's day.",
  "Little waves now lap in and out along the shore, washing furthest up the bank the wind blows onto, and the canoe and the dinghy leave a wake. On breezy days from spring to fall a child flies a kite out over the lake from the upwind bank. Campers have pitched a tent on the far bank: it glows with lantern light from dusk, and in the evening they sit out by their campfire. In fall pumpkins sit under the big tree by the shack, one carved into a jack-o'-lantern that glows after dark, and in winter someone skis along the far bank.",
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
