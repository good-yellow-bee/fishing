import { NEWS_ID, NEWS_ITEMS, markNewsSeen, readSeenNews } from "../game/whatsNew";

/**
 * The What's new lines about the field log, as the game's card lists them: Home shows these, not the game's scenery.
 * Each new field-log line goes in here too, newest first, word for word as in `NEWS_ITEMS`.
 */
export const FIELD_NEWS: ReadonlySet<string> = new Set([
  "A water's page now says Only from this water for the kinds no other water has given you, each opening its fish there, and in the small hours last evening's outing still going reads as fished today beside Out now. Beside the sample week with only a water of your own, Waters, a water's page and the Map now leave its made-up plans out, and a water with several namesakes names them all.",
  "On Bests, this year's days on the water now say how many of them gave a fish, and in a season picked, a water whose first fish came that season says New this season. Beside the sample week with only a water of your own, Bests' runs of outings and its calendar now leave the made-up plans out.",
  "Tackle's recent outings now say under each month which lure took most of its fish. Today's outing under Coming up says Out now once a fish is in on its water, with no plan to copy beside it, as Home does, and the lure record counts it.",
  "Home now gives this week's fish beside the month's, and today's outing stops offering its plan to copy or add to the calendar once a fish is in on its water, as Out now says. Beside the sample week with only a water of your own, the outing and day counts, the outings sheet and the year goal now leave its made-up plans and fish out.",
  "On a water with a dawn and a dusk outing planned, the catch form now files a new fish on the one you are fishing, the one with a fish lost or missed so far, as Home and Trips take it. Its outing list leaves out the sample week's made-up outings, and the kinds it offers at a water always fill three picks, a kind named two ways counting once.",
  "An outing's page says where it falls among the outings on its water, such as outing 4 of 12. Streaks, the weekend split and a water's best outing now count an outing with only a lost fish or a missed strike, as the average does, and last evening's blank outing reads as a past day once today's plan takes over.",
  "On a kind's page, a water spelled two ways says how often its outings took the kind, as other waters do, and the water lists on the catch and outing forms tell two such waters apart by their fish. A water's outings now count those with only a lost fish or a missed strike, as Trips does.",
  "On Bests, a kind that set a new best in the season picked says the record it beat, and a kind's card says how many of it went back, opening them. Twin waters spelled two ways count as one, and a month's outings match the list they open.",
  "Gear's lure record says where each lure took most of its fish, opening them, and a packed piece says how many fish it took on the outing's water. Undo on a packing list never puts a piece back twice.",
  "The outings spreadsheet says when each outing's fish came, so a dawn and a dusk tell apart. Adding a book file says how many of its fish were the game's, and Home's Next goes to the outing you are fishing when a day has two.",
  "A search's summary now splits its fish by lure too, each opening that lure's fish, and a fish caught after midnight says whose night it counts on. The catch form finds a kind typed in Polish however the book wrote it.",
  "Two outings on one water and day now show when each one's fish came, so a dawn and a dusk tell apart on Trips. The outing search finds those “with a note” and those left “untitled”, and an outing's page names kinds and lures as the rest of the book does.",
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
  "Find a catch offers its best words as one-tap searches, and a search's spreadsheet is named after it. A fish's page says its place on the outing, such as fish 3 of 5.",
  "Find an outing offers its best words as one-tap searches. In the small hours last evening's outing reads Last night, outing cards count missed strikes, and a water's tackle tips go on the list all at once.",
  "A water's card shows whether its water is warming or cooling. Its page gives today's sunrise and sunset there, and its copied summary carries the place and a map link.",
  "A season on Bests shows its fish an outing against the season before, and its outings open from the box. A search for one kind gives each year's biggest beside its count, and “31.12” finds that day.",
  "The lure record can be downloaded as a spreadsheet, for the water picked or all of them. The Map finds the water nearest you, and saves all your waters for a GPS in one file.",
]);

/** The newest field line the angler dismissed on Home: the game's and the lake's batches don't bring the card back. */
const FIELD_NEWS_KEY = "stillwater.news.field.v1";

/** The newest field-log line of What's new, which Home's card leads with. */
export function newestFieldNews(): string | undefined {
  return NEWS_ITEMS.find((item) => FIELD_NEWS.has(item));
}

/**
 * Whether Home's card is due: someone who has fished, with a field line newer than the one they dismissed. The batch
 * on show dismissed anywhere (the game's card too) counts.
 */
export function fieldNewsDue(caughtTotal: number): boolean {
  const newest = newestFieldNews();
  if (caughtTotal === 0 || !newest || readSeenNews() === NEWS_ID) return false;
  try {
    return localStorage.getItem(FIELD_NEWS_KEY) !== newest;
  } catch {
    return true;
  }
}

/** Dismissed on Home: this field line, and the batch too, so the game's card doesn't repeat it. */
export function markFieldNewsSeen() {
  markNewsSeen();
  try {
    const newest = newestFieldNews();
    if (newest) localStorage.setItem(FIELD_NEWS_KEY, newest);
  } catch {
    // Private mode: the card shows again next visit.
  }
}
