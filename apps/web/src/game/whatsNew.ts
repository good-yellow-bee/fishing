/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-19-scene24";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t().
 * The card shows only the newest four, and this list ships with every page, so older lines are dropped. */
export const NEWS_ITEMS: readonly string[] = [
  "On cold clear dawns in fall and winter wisps of steam rise off the lake and lean away on the breeze. On still summer dawns a hot-air balloon drifts over the far water, its burner roaring now and then, and dips its basket to touch the lake before climbing away. On winter days loads of snow slip off the trees across the lake in a puff of powder.",
  "The full-size photo steps through the other photos of the list it was opened from, Photos can show the largest first and counts the fish still without a photo, the find box offers your last three searches, and a fish's page can step through the rest of its outing's fish.",
  "Smallmouth bass and rainbow trout now charge: once a fight one may turn and run straight at you, and the fight card shouts REEL, so wind fast to keep the line tight, or a light hook drops out of the slack. And on a breezy day, cast into the foam lanes the wind rakes across the water: it gathers drowned insects there, and the fish feeding along them bite sooner.",
  "At dusk in fall a great flock of starlings wheels over the far shore, its mirror crossing the still lake, and in winter black-headed gulls stand on the ice floes, now and then wheeling out over the water. By day a robin drops in on the dock's front posts, and in the rain or on a dewy morning a snail glides across the planks behind you.",
  "Outings can be found by the time of day of their fish (\"night\", \"dawn\"), an outing names the others on its water that day, planned ones say how many days are left, and the calendar file lists what works on the water and what is still to pack.",
  "Of an evening from spring to fall someone rocks in a chair in front of the far cabin, a lantern flickering beside them, and on winter evenings coloured lights twinkle along its eaves. At dawn in spring and fall a little flock of sandpipers works the far bank's waterline, and a pair of coots keeps to the lilies at the lake's west end, diving now and then and squabbling across the water in spring.",
  "On a tablet or a narrow laptop window with larger text, the field log keeps everything on the page: Home's cards and columns stack instead of squeezing words one letter a line, and Spots shows one card a row. The side menu now reaches Gear and Bests on a short window, and a full-size photo fits the screen with Close in reach.",
  "At dusk and at night an angler sits out on the far bank with a glowing float on the water, their headlamp's beam following where they look. On calm days a child skims stones from the water's edge, a ring spreading at every skip. In spring a birdwatcher scans the lake through binoculars from the far bank, and on winter days a jogger in a bobble hat runs the shore below the ski track.",
  "Past outings' bags opened on Gear stay open when you come Back from an outing, and \"Fold all\" closes them in one tap.",
  "A water's page opens its last outing with what it gave, and copies its place for a sounder; Waters cards name the best lure, and long water pickers start with the ones fished lately.",
  "On dry summer days two people toss a flying disc back and forth on the far bank, and in winter two children have a snowball fight there, ducking the throws. On rainy days an angler sits it out on the far bank under a big green umbrella tipped into the wind, and in the fall a grown-up rakes the leaves back onto the pile the child keeps jumping into.",
  "The moon now matters by day too: for an hour either side of it passing overhead or underfoot the fish come on the feed at every bank, and the shack's chalk board says when. And mind the low sun at your back: at dawn at the Drop-off and at dusk at the Inlet your long shadow falls across the water and the fish shy from it.",
  "The boats at their moorings now fill with the weather: snow in winter, rainwater in the rain and fallen leaves in the fall. In spring a pair of Canada geese graze the far bank with their goslings, on dry fall days a child takes running leaps into a pile of raked leaves, and on calm, clear days someone sets up an easel under a sun umbrella on the far bank and paints the hills.",
  "A kind's page says when its next round number is a few fish away (3 more to 25 of this kind), and its biggest of this year beside the all-time record.",
  "A search with fish of several kinds or years splits them “By kind” and “By year”, each a tap to narrow it, and a season's best day on Bests opens its fish.",
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
