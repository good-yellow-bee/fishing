/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-19-game32";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t().
 * The card shows only the newest four, and this list ships with every page, so older lines are dropped. */
export const NEWS_ITEMS: readonly string[] = [
  "Clear the shack's whole board of a day's requests and the last claim pays 25 points on top. And let a trophy-weight fish go from the catch card and it earns you 20 more points: the Release button says so.",
  "On nights without rain a little owl now glides in low over the water and lands on the post beside the lantern. It bobs its head, turns it right round to look behind it, follows the moths circling the lantern outside winter, and glides off again. And the swallows on the moored boat's rope now burst off together when you untie it under them.",
  "On a tablet or a phone held sideways, the Map's list of waters gives each water's last fish and next outing room to read in a line, and with larger text a water's details go under its name. The lodge's catch log now scrolls its own table sideways at every width instead of pushing the whole page, and a screen reader now reads out what the season and the sky mean for the fish, and the day's wind.",
  "On fine spring and summer days a little paper boat now and then drifts slowly past in front of the dock. Your dog turns to watch it go by, and the robin on the posts too, and in winter it wears a red knitted jumper.",
  "Level 17, Child of the lake, waits at 57000 points, and from there the shack sells you groundbait and live shiners a fifth cheaper. Take a lodge record from another angler and the catch earns 1.5× points, and so does your first fish of a day that makes three or more days in a row.",
  "By day, unless it rains, a golden dog now lies on the dock behind you. It watches a fresh cast, dozes off when nothing bites, and sits up with its tail going when a fish takes. And on fine spring and summer days swallows sometimes come and sit in a row on the moored rowboat's rope.",
  "On Trips, last evening's outing still going after midnight says Out now, with a last night quick search, and the average's count of outings without a fish opens them. A copied plan says how the last outing on that water went, lost fish and missed strikes included, and Home names the last outing's lure only when it led.",
  "While your rowboat lies tied up by the pier, a bow line and a stern line now hold it to the posts, sagging and drawing tight as it rides the chop. And on summer days, if your line sits quiet for a while, a blue dragonfly may come and settle on the tip of your rod until a nibble sends it off.",
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
