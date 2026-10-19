/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-19-scene46";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t().
 * The card shows only the newest four, and this list ships with every page, so older lines are dropped. */
export const NEWS_ITEMS: readonly string[] = [
  "On wet evenings and nights from spring to fall a toad now hops slowly across the dock behind you. In winter your dog's breath puffs in the cold, and the robin stays on the posts into dusk, the last bird to go to roost.",
  "On Gear, each coming outing can copy its plan with what is still to pack, and the lure record says when a lure that never took a fish was last packed. On the Map, a water you have fished today says Out now.",
  "Out on the boat, the anchor's splash puts the fish down for a few seconds, so give it a moment before you cast. And in a strong wind the anchored hull is held back on its line and follows a run less, so a run takes more line.",
  "In fall a leaf now and then comes seesawing down onto your cap, and in spring a blossom petal, riding there until your next cast shakes it off. And when a fish nibbles at your float, your dog wakes, lifts its head and cocks it at the float.",
  "Home's Next box copies the plan for a message. The outings spreadsheet lists the lures each outing took, and from January to March the book file offers last year's catches as a sheet of their own. A lure typed two ways reads once in the spreadsheets and copied texts.",
  "Patience 7 keeps a fish that dropped the bait about, so a cast straight back has it take again more often, and Accuracy 7 drops your lure into the gaps, so a cast into the weeds, the lily pads or the rocks snags half as often. The shack's tackle box now says what rank 7 of each skill brings.",
  "On a phone held sideways, the first-cast coach and the news card now leave the shore signs clear from the moment the lake opens. In the field log, tabbing to a field the bottom tab bar half covers scrolls it into full view, and an outing link that wraps onto two lines is as easy to tap on each.",
  "Strike a fish from the dock and the robin or the little owl on the posts takes fright and flies off, to come back another time. And in winter you now wrap up in a red knitted scarf to match your dog's jumper, its ends blowing in the wind.",
  "A fish's page offers to step through its water's fish, and on an outing it says how long after the one before it came. A loose fish on a day with a dawn and a dusk outing goes to the nearer one, a length can be written in feet and inches, such as 2 ft 3 in, and a lure typed two ways reads as one.",
  "On Trips, last evening's outing still going after midnight says Out now, with a last night quick search, and the average's count of outings without a fish opens them. A copied plan says how the last outing on that water went, lost fish and missed strikes included, and Home names the last outing's lure only when it led.",
  "On Waters, each card names the water's best fish and says when it has rested a week or more. A water's copied summary says when it was last fished, and a water fished only blank can be copied too.",
  "On Bests, a water's card names its biggest fish, the record tiles say the day, and a season marks each kind that set a new best and names its best lure. The year's goal box says how many days since your last fish, and the goal form offers a goal that beats last year.",
  "An outing's tackle list offers Undo after Unpack all or taking a piece off. On the Map, a water's next outing says how much of its bag is packed, and in the small hours the water you are on says Out now. Gear's best lures to pack put those of the outing's own water first.",
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
