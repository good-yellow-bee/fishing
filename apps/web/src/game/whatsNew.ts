/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-19-field48";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t().
 * The card shows only the newest four, and this list ships with every page, so older lines are dropped. */
export const NEWS_ITEMS: readonly string[] = [
  "The lure record can be downloaded as a spreadsheet, for the water picked or all of them. The Map finds the water nearest you, and saves all your waters for a GPS in one file.",
  "Strike a pike sooner on a worm or a live shiner: given time it swallows the bait, and if the fight then runs long its teeth fray the line, so it snaps sooner until you retie. And after dark off the dock, cast a jig, spinner or spoon among the minnows in the lanterns' light, where the crappie, walleye and bass hunt them.",
  "Settings' switches and volume sliders and the shack's Strength, Accuracy and Patience buttons are easier to tap on a phone. The lodge board's All time and This week tabs answer the arrow keys, a screen reader hears the shack's sections in order, and the landed card's rarity tag and the Badge line are darker and easier to read.",
  "On a phone, the last small links in the field log are easier to tap: the names on Bests' hour, moon, sky, wind, temperature and lure rows, a kind's first and newest fish, and a water's fish count with larger text.",
  "Waters can all go to a GPS in one file. The goal form offers last year's number in one tap. Home's next outing can go on your calendar, and the year's copied summary counts its outings. A night fish logged without its outing now counts on that night's day.",
  "Off the Point, cast tight to the sunken log: the bass, bluegill, crappie and pike holding in its shade bite sooner, and many a bite is one of them. And from the dock on calm days, land a popper or a fly among the water striders and whirligig beetles, where the crappie, shiners, smallmouth and trout are looking up for bugs.",
  "Catches now has Only my fish beside the sample week's count. A fish on an outing shows how long after the outing's first fish it came. A new fish can take the outing's last note in one tap, and “note” in Find a catch lists the fish you wrote up.",
  "More small links are easier to tap on a phone: Plan one and Log a catch under an empty list, Add a photo, Write up the day and Go again, the Map's waters with no place yet, Bests' month counts, a form's Open it, and Sign in, Back to the dock and the trip recap's Open the trip.",
  "Watch for the bigger fish hunting the small ones: a smallmouth may hit a crappie you're reeling in under the dock, and a pike a perch off the Drop-off, and then the fight starts again with the hunter. And from the dock, cast out under the kingfisher's snag: the perch and bass hunt the same fry it dives on, so the bites come sooner and many are one of them.",
  "On a phone, the small links in the field log are now easier to tap: the counts in Bests' month-by-year table and its season box, the lures and words in a water's tips, and a catch's sky, wind, water temperature and moon each reach a full finger's width.",
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
