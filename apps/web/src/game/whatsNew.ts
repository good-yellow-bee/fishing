/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-20-game68";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t().
 * The card shows only the newest four, and this list ships with every page, so older lines are dropped. */
export const NEWS_ITEMS: readonly string[] = [
  "Your arm now tires sooner in a long fight: past nine seconds of reeling it slows bit by bit, and it rests while the fish waits at the net, so a big catfish or burbot can wear down a weak arm. And the free handful of groundbait now comes once a day: a reload no longer gives back one you spent.",
  "On Bests, a kind that set a new best in the season picked says the record it beat, and a kind's card says how many of it went back, opening them. Twin waters spelled two ways count as one, and a month's outings match the list they open.",
  "The shack now has a shiner trap: bait it with a handful of groundbait, and after six hours it holds a shiner or two for your bait bucket. And holding a run on a heavy drag now tires your arm as reeling does.",
  "Gear's lure record says where each lure took most of its fish, opening them, and a packed piece says how many fish it took on the outing's water. Undo on a packing list never puts a piece back twice.",
  "While your bait bucket holds spare shiners, it now stands at your feet on the dock or at the bank. And a fish hooked through the duckweed comes in under a green ball of weed until its first run strips it off.",
  "On a clear dawn or dusk the low sun now lays long shadows across the lake, yours among them: at the drop-off at dawn and the inlet at dusk you can see it fall on the water the fish are watching. And on a phone held upright the lake sits a little lower, so the far bank and the hills show clear of the panels at the top.",
  "The outings spreadsheet says when each outing's fish came, so a dawn and a dusk tell apart. Adding a book file says how many of its fish were the game's, and Home's Next goes to the outing you are fishing when a day has two.",
  "While a bank's giant is still out there this week, now and then it rolls on that bank's water in a big swirl. And a night line you leave out now shows at its bank: a forked stick leaning over the water, the line running down into it.",
  "The angler who fishes the day's crowded bank now sits there on a camp chair a few steps from you, rod out, from dawn to dusk. And a pike that follows your lure in for the figure-eight now shows as a long shadow behind the float, swinging round as it turns.",
  "On a phone you can now watch the whole fight: the fight card moves up to the top of the screen, over the far shore, and the header steps aside until the fish is in; held sideways it waits beside the action, above the steering buttons. Left-handed, the steering buttons now take the other corner from the Reel button instead of lying under it.",
  "A search's summary now splits its fish by lure too, each opening that lure's fish, and a fish caught after midnight says whose night it counts on. The catch form finds a kind typed in Polish however the book wrote it.",
  "The lake opens more smoothly on a phone: it prepares its shading before the first frame instead of stalling as it draws each thing for the first time, the hedgerows no longer hitch as the evening falls, and the windsock, the rod bell and the damselflies are drawn in the same simple style as the rest.",
  "Hedgerows now part the upper hills into fields, as a phone held upright sees them above the farm, green through spring and summer, turning in the fall and bare over the winter snow. And at night the moon road and the lights mirrored on the lake shimmer softly instead of lying in hard bars.",
  "Two outings on one water and day now show when each one's fish came, so a dawn and a dusk tell apart on Trips. The outing search finds those “with a note” and those left “untitled”, and an outing's page names kinds and lures as the rest of the book does.",
  "The lake asks a little less of your phone again: shadows are redrawn at most thirty times a second, the shore's foam does less work each frame, and the anglers you only see in rain or fog and the deer, moose and hare of dawn and dusk now load only when they come out.",
  "A water's page names kinds and lures as the rest of the book does, and each of its counts opens just the fish it counted. Its copied summary adds the next outing there and the fish lost or missed.",
  "On Bests, a season names the water it was won on beside its best lure, each opening its fish, and a kind's Last fish opens that fish. A kind's page and its catch cards name it as Bests does.",
  "On the Map, a water you are out on now offers Log a catch for that outing, and a list's Works on this water tips say how many fish each lure took there.",
  "Home's Next says Out now while today's outing is being fished, and offers today's plan for the calendar until it is under way. The outings spreadsheet counts the fish released on each outing.",
  "A search's summary splits its fish by water too, each opening that water's. A fish's page says how near it came to your longest or heaviest of its kind, and a kind typed two ways, such as Perch and Perches, keeps one name and one record on every catch page.",
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
