/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-19-field57";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t().
 * The card shows only the newest four, and this list ships with every page, so older lines are dropped. */
export const NEWS_ITEMS: readonly string[] = [
  "On Trips, last evening's outing still going after midnight says Out now, with a last night quick search, and the average's count of outings without a fish opens them. A copied plan says how the last outing on that water went, lost fish and missed strikes included, and Home names the last outing's lure only when it led.",
  "While your rowboat lies tied up by the pier, a bow line and a stern line now hold it to the posts, sagging and drawing tight as it rides the chop. And on summer days, if your line sits quiet for a while, a blue dragonfly may come and settle on the tip of your rod until a nibble sends it off.",
  "Two new lodge badges to chase: Whole lake, for landing every kind of fish in the lake, and Trophy hunter, for five kinds at trophy weight. And the shack now sells a live shiner for 50 points: it goes on your hook for the next cast and draws the hunters, and a shiner on the hook stays there through a reload.",
  "On a narrow phone or with larger text, outing and catch cards now put the date, size and photo above the words instead of squeezing them into a strip, and the lodge board's fish of the week does the same. Keyboard focus in the field log stops below the phone's top bar, the catch form's time and nearest-water buttons are easier to tap, and on a phone held sideways the coach and the news card stay off the shore signs.",
  "On calm, sunny summer days two people pedal a white swan pedal boat slowly round the water off to the right, its paddle wheel churning behind. And on evenings and nights from spring to fall a little field mouse sometimes scurries across the dock behind you, sits up to nibble a crumb, and darts off over the edge.",
  "On Waters, each card names the water's best fish and says when it has rested a week or more. A water's copied summary says when it was last fished, and a water fished only blank can be copied too.",
  "Beat your own best of a kind and the catch now earns 1.25× points, marked on the landed card. And the shack sells groundbait: 60 points a handful, up to three in the bag, and they keep until you throw them.",
  "On Bests, a water's card names its biggest fish, the record tiles say the day, and a season marks each kind that set a new best and names its best lure. The year's goal box says how many days since your last fish, and the goal form offers a goal that beats last year.",
  "An orchard now grows below the farm on the far hills: white and pink blossom in spring, gold leaves and red apples in the fall, bare in winter. From spring through summer a pair of white storks stands in a nest on the barn roof, clattering their bills now and then.",
  "A little steam train now runs along the foot of the hills behind the far bank, puffing out of one tunnel and into the other, then back the other way a while later. After dark its carriage windows glow as it goes.",
  "An outing's tackle list offers Undo after Unpack all or taking a piece off. On the Map, a water's next outing says how much of its bag is packed, and in the small hours the water you are on says Out now. Gear's best lures to pack put those of the outing's own water first.",
  "In spring the field under the windmill on the hills behind the far bank flowers bright yellow with rapeseed, in close rows along the slope, and its colour fades with the evening light.",
  "Home's What's new keeps to the field log. With nothing planned, Home's Next says when you were last out, with Go again, and behind a year's goal it says how many fish a week it needs. The book file gives this year's catches as a sheet of their own, and its last copy says how many fish it held.",
  "Find a catch offers its best words as one-tap searches, and a search's spreadsheet is named after it. A fish's page says its place on the outing, such as fish 3 of 5.",
  "Find an outing offers its best words as one-tap searches. In the small hours last evening's outing reads Last night, outing cards count missed strikes, and a water's tackle tips go on the list all at once.",
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
