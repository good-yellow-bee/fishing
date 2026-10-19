/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-19-field50";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t().
 * The card shows only the newest four, and this list ships with every page, so older lines are dropped. */
export const NEWS_ITEMS: readonly string[] = [
  "A water's card shows whether its water is warming or cooling. Its page gives today's sunrise and sunset there, and its copied summary carries the place and a map link.",
  "A season on Bests shows its fish an outing against the season before, and its outings open from the box. A search for one kind gives each year's biggest beside its count, and “31.12” finds that day.",
  "On a tablet, the panels under the dock's top bar move down when the bar wraps onto a second line, so nothing hides behind it. A catch's Edit and Delete are easier to tell apart with a finger, the Map shows its heading while it loads, and on a phone the Map list's Next outing link is easier to tap.",
  "At level 14, Soul of the lake, your line holds a moment past the red: it snaps at 105% strain, not 100%. And off the dock on a still summer dusk, drop a dry fly under one of the dancing midge clouds, where the bluegill, crappie, shiners and rainbow trout rise to the midges that fall.",
  "The fight card's coloured lines, from the surge call to the clean-fight stamp, and the landed card's few words about the fish are darker and easier to read. In the shack, a request's Claim button is easier to tap on a phone and its Claimed label is easier to read. The news card no longer covers the bank buttons on a phone, and a screen reader reads the trip recap's heaviest fish whole.",
  "The lure record can be downloaded as a spreadsheet, for the water picked or all of them. The Map finds the water nearest you, and saves all your waters for a GPS in one file.",
  "Strike a pike sooner on a worm or a live shiner: given time it swallows the bait, and if the fight then runs long its teeth fray the line, so it snaps sooner until you retie. And after dark off the dock, cast a jig, spinner or spoon among the minnows in the lanterns' light, where the crappie, walleye and bass hunt them.",
  "Settings' switches and volume sliders and the shack's Strength, Accuracy and Patience buttons are easier to tap on a phone. The lodge board's All time and This week tabs answer the arrow keys, a screen reader hears the shack's sections in order, and the landed card's rarity tag and the Badge line are darker and easier to read.",
  "On a phone, the last small links in the field log are easier to tap: the names on Bests' hour, moon, sky, wind, temperature and lure rows, a kind's first and newest fish, and a water's fish count with larger text.",
  "Waters can all go to a GPS in one file. The goal form offers last year's number in one tap. Home's next outing can go on your calendar, and the year's copied summary counts its outings. A night fish logged without its outing now counts on that night's day.",
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
