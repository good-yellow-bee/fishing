/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-20-game41";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t().
 * The card shows only the newest four, and this list ships with every page, so older lines are dropped. */
export const NEWS_ITEMS: readonly string[] = [
  "Bigger fish no longer just slide in: once one is played out it lies at the net, and you let go of the reel, then strike as its head comes up to net it; strike too soon and it bolts off again. And now and then the bubbles boil in a feeding frenzy for a minute and a half: the bank's sign gets a star, and casts into it bite twice as fast with the hunters crowding in.",
  "Fishing from the bank by day, the robin now comes to you too, landing by your feet to hop about and peck before it flies off. And the lake now draws about a third fewer pieces each frame, so it runs smoother on a phone.",
  "Every kind of fish now climbs mastery tiers as you land it, Known at 5, Skilled at 15 and Master at 40: the field guide shows how far you are, and a mastered kind pays 1.1× points. And the shack board adds three challenges that run all week, Monday to Sunday, for bigger rewards.",
  "On a smaller phone the fight card now hangs just under the lake's header instead of rising over it, and the header's chips step aside until the fish is in. And while you wait for a bite, the hint's \"2 more reasons\" is much easier to tap.",
  "On a phone, the lake's hint now sits below the bank chip when the chip has a lot to say, instead of under it. Held sideways, a long bank note ends in an ellipsis before the shore signs, and with larger text on a short screen the lure moves up beside the bank chip, clear of the walk stick.",
  "On summer evenings a bat now and then swoops in to hawk the moths by the dock's lantern. And on snowy winter nights the little owl comes to the snow-capped post too.",
  "On Waters, a water's card says Out now while you are fishing it, and a water's page says when its first fish came. A kind typed two ways, such as Perch and Perches, is one kind on every page, chip and record.",
  "Strike a fish while the mallard is on the dock and it bursts off over the water. And on summer nights a few fireflies now drift and blink over the water right beside the dock.",
  "On Bests, the longest and heaviest tiles say how long a record has stood, and the month-by-month table names the best month the book has ever had. Not yet this year counts a kind once however it was typed, in your language's order.",
  "On Gear, each coming outing can copy its plan with what is still to pack, and the lure record says when a lure that never took a fish was last packed. On the Map, a water you have fished today says Out now.",
  "Home's Next box copies the plan for a message. The outings spreadsheet lists the lures each outing took, and from January to March the book file offers last year's catches as a sheet of their own. A lure typed two ways reads once in the spreadsheets and copied texts.",
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
