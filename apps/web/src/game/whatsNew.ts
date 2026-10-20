/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-20-field66";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t().
 * The card shows only the newest four, and this list ships with every page, so older lines are dropped. */
export const NEWS_ITEMS: readonly string[] = [
  "On the Map, a water you are out on now offers Log a catch for that outing, and a list's Works on this water tips say how many fish each lure took there.",
  "A fish hooked along the point's rock edge now dives off the ledge instead of dragging your line over the rocks. A perch or smallmouth hooked raiding the sunfish beds bolts from the guarding sunfish, so its first run is the long one. And on a windy day a fish hooked in a foam lane lets a slack line drift out faster still.",
  "At night your headlamp now draws moths: from spring to fall a few find the beam one by one and flutter round it, and on summer nights a bat comes now and then to hawk them.",
  "With a screen reader, the call to strike is now said the moment a fish takes, not after the hint before it; in your first fight the coach no longer repeats each run over the fight card; and following Field log from the lake lands on the page's heading. On a small or sideways phone the fight card keeps clear of the Reel button.",
  "Home's Next says Out now while today's outing is being fished, and offers today's plan for the calendar until it is under way. The outings spreadsheet counts the fish released on each outing.",
  "The lake now runs a little smoother on a phone: it spends less of each frame sorting out how to draw its creatures and their shadows. And on spring nights the pollen on the water no longer glows yellow in the dark.",
  "Out on the boat, a fish hooked tight to the far rock runs round it: turn every run, or the rock frays your line. A fish hooked through the duckweed comes in slower under a ball of weed until its first run strips it off. And a bank you fished hard yesterday starts today wary, its first casts biting slower, unless you bring groundbait or a lure the fish haven't seen.",
  "A search's summary splits its fish by water too, each opening that water's. A fish's page says how near it came to your longest or heaviest of its kind, and a kind typed two ways, such as Perch and Perches, keeps one name and one record on every catch page.",
  "The lake now opens sooner, above all on a phone: the creatures you only meet at night, in one season or in the rain load when their time comes instead of all at once, without popping in when they appear.",
  "An outing's page opens every outing on its water in one tap, and a copied outing says how many of the fish hooked were landed.",
  "On Waters, a water's card says Out now while you are fishing it, and a water's page says when its first fish came. A kind typed two ways, such as Perch and Perches, is one kind on every page, chip and record.",
  "On Bests, the longest and heaviest tiles say how long a record has stood, and the month-by-month table names the best month the book has ever had. Not yet this year counts a kind once however it was typed, in your language's order.",
  "On Gear, each coming outing can copy its plan with what is still to pack, and the lure record says when a lure that never took a fish was last packed. On the Map, a water you have fished today says Out now.",
  "Home's Next box copies the plan for a message. The outings spreadsheet lists the lures each outing took, and from January to March the book file offers last year's catches as a sheet of their own. A lure typed two ways reads once in the spreadsheets and copied texts.",
  "A fish's page offers to step through its water's fish, and on an outing it says how long after the one before it came. A loose fish on a day with a dawn and a dusk outing goes to the nearer one, a length can be written in feet and inches, such as 2 ft 3 in, and a lure typed two ways reads as one.",
  "On Trips, last evening's outing still going after midnight says Out now, with a last night quick search, and the average's count of outings without a fish opens them. A copied plan says how the last outing on that water went, lost fish and missed strikes included, and Home names the last outing's lure only when it led.",
  "On Waters, each card names the water's best fish and says when it has rested a week or more. A water's copied summary says when it was last fished, and a water fished only blank can be copied too.",
  "On Bests, a water's card names its biggest fish, the record tiles say the day, and a season marks each kind that set a new best and names its best lure. The year's goal box says how many days since your last fish, and the goal form offers a goal that beats last year.",
  "An outing's tackle list offers Undo after Unpack all or taking a piece off. On the Map, a water's next outing says how much of its bag is packed, and in the small hours the water you are on says Out now. Gear's best lures to pack put those of the outing's own water first.",
  "Home's What's new keeps to the field log. With nothing planned, Home's Next says when you were last out, with Go again, and behind a year's goal it says how many fish a week it needs. The book file gives this year's catches as a sheet of their own, and its last copy says how many fish it held.",
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
