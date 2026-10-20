/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-20-scene55";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t().
 * The card shows only the newest four, and this list ships with every page, so older lines are dropped. */
export const NEWS_ITEMS: readonly string[] = [
  "The lake now opens sooner, above all on a phone: the creatures you only meet at night, in one season or in the rain load when their time comes instead of all at once, without popping in when they appear.",
  "Cast tight to the sunken log and the fish there now run for it: turn every run, or the line wraps round the log and frays. Land a smallmouth and a largemouth bass on one day for the Bass slam badge, or a brook trout, a rainbow trout and a salmon for the Trout slam. And a fish you let go that breaks off stays itself when it bites again, tag and all.",
  "An outing's page opens every outing on its water in one tap, and a copied outing says how many of the fish hooked were landed.",
  "A big fish worn down in a fight can now find a second wind: it gathers itself once and runs hard again, as the fight card calls. Each lure climbs tiers as you land fish on it, Proven, Trusted and Lucky, shown in the lure picker, and a Lucky lure's hook sets a little more solid. And when another angler lands a fish you let go, the lake tells you on your next visit.",
  "Fishing from the bank, you now have company in any weather: on wet evenings a toad hops past behind you, on rainy days a blackbird comes to your feet in place of the robin, and on winter nights a wood mouse pops out of the snow and scurries across, leaving tiny tracks.",
  "The rowboats and the float no longer turn black: their colours load properly again. On a phone held upright, the view now opens wider, so you see the whole dock, the boat and both shores instead of a narrow slice of the lake. And see-through things like rain rings and dragonfly wings now draw in one pass, so the lake runs a little smoother.",
  "The lake opens sooner on a phone: it now fetches its code and your profile together and each model only once, so on a slow signal it is ready about three seconds earlier, and coming back to it no longer downloads every model again. In high contrast, a switched-on Headlamp now stands out in amber.",
  "On dry evenings a hedgehog now snuffles past behind you on the bank, curling into a ball at any fuss. In a feeding frenzy the bubbles boil with little silver baitfish leaping out, and at night your headlamp throws a beam onto the float. Out on the boat in a strong wind, the anchored hull now swings less toward a run, as the fight card says.",
  "Fishing from the bank by day, the robin now comes to you too, landing by your feet to hop about and peck before it flies off. And the lake now draws about a third fewer pieces each frame, so it runs smoother on a phone.",
  "On a smaller phone the fight card now hangs just under the lake's header instead of rising over it, and the header's chips step aside until the fish is in. And while you wait for a bite, the hint's \"2 more reasons\" is much easier to tap.",
  "On a phone, the lake's hint now sits below the bank chip when the chip has a lot to say, instead of under it. Held sideways, a long bank note ends in an ellipsis before the shore signs, and with larger text on a short screen the lure moves up beside the bank chip, clear of the walk stick.",
  "On summer evenings a bat now and then swoops in to hawk the moths by the dock's lantern. And on snowy winter nights the little owl comes to the snow-capped post too.",
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
