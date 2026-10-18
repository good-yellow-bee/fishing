/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-18-scene20";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t().
 * The card shows only the newest four, and this list ships with every page, so older lines are dropped. */
export const NEWS_ITEMS: readonly string[] = [
  "On dry summer days two people toss a flying disc back and forth on the far bank, and in winter two children have a snowball fight there, ducking the throws. On rainy days an angler sits it out on the far bank under a big green umbrella tipped into the wind, and in the fall a grown-up rakes the leaves back onto the pile the child keeps jumping into.",
  "The moon now matters by day too: for an hour either side of it passing overhead or underfoot the fish come on the feed at every bank, and the shack's chalk board says when. And mind the low sun at your back: at dawn at the Drop-off and at dusk at the Inlet your long shadow falls across the water and the fish shy from it.",
  "The boats at their moorings now fill with the weather: snow in winter, rainwater in the rain and fallen leaves in the fall. In spring a pair of Canada geese graze the far bank with their goslings, on dry fall days a child takes running leaps into a pile of raked leaves, and on calm, clear days someone sets up an easel under a sun umbrella on the far bank and paints the hills.",
  "A kind's page says when its next round number is a few fish away (3 more to 25 of this kind), and its biggest of this year beside the all-time record.",
  "A search with fish of several kinds or years splits them “By kind” and “By year”, each a tap to narrow it, and a season's best day on Bests opens its fish.",
  "On fall and winter days someone splits firewood beside the far cabin, and on calm dawns a sculler rows a racing shell along the far half of the lake. The dog walker now comes out in the rain too, under an umbrella, and on windy days the rain and snow slant down the wind.",
  "On a touch tablet the walking stick no longer covers \"Lately on the lake\": the feed now sits beside it, and the stick keeps its size with larger text, so it stays clear of the lure panel. While the first-cast guide shows on a laptop or tablet, the bank name beside it stops short of the guide instead of running under it.",
  "When a cloud slides over the sun on a bright day, the fish move up into the shallows to feed, so the Dock, the Reeds, the Point and the Inlet bite sooner while it lasts. A fish hooked out by the lily pads now fights like one in the weeds and dives for the pad stems, so turn every run. And when a bank is fished hard, a kind of lure its wary fish haven't seen yet catches them off guard.",
  "Gear's lure record can pack its best lures for your next outing in one go.",
  "On dry summer days a hummingbird zips in to the wildflowers by the shack and hovers at them one by one, and on clear summer days someone swims breaststroke in the shallows off the far bank, their towel on the sand. From spring to fall someone walks the far bank with a dog that runs on ahead and stops to sniff. On foggy days a lone angler in a yellow oilskin fishes from a rowboat anchored out on the lake.",
  "The Map's own sheet has a scale bar, each water on the Map names the lure that took most of its fish, and a sample water's page links to its place on the Map.",
  "On a phone held sideways the fight card now stays under the top bar and clear of the Reel button, even with the largest text, and the shack and Settings give their lists more room. The notice that effects went to Lite now waits until the fight is over instead of covering the tension bar.",
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
