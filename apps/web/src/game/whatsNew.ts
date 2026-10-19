/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-19-pa23";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t().
 * The card shows only the newest four, and this list ships with every page, so older lines are dropped. */
export const NEWS_ITEMS: readonly string[] = [
  "More small links are easier to tap on a phone: Plan one and Log a catch under an empty list, Add a photo, Write up the day and Go again, the Map's waters with no place yet, Bests' month counts, a form's Open it, and Sign in, Back to the dock and the trip recap's Open the trip.",
  "Watch for the bigger fish hunting the small ones: a smallmouth may hit a crappie you're reeling in under the dock, and a pike a perch off the Drop-off, and then the fight starts again with the hunter. And from the dock, cast out under the kingfisher's snag: the perch and bass hunt the same fry it dives on, so the bites come sooner and many are one of them.",
  "On a phone, the small links in the field log are now easier to tap: the counts in Bests' month-by-year table and its season box, the lures and words in a water's tips, and a catch's sky, wind, water temperature and moon each reach a full finger's width.",
  "A planned outing now has Copy the plan, which copies the day, the water, what works there and what is still to pack, to send to whoever is coming along. Trips adds Only my outings when the sample week or the game's rounds sit among your own, and says how many outings have gone by since your last fish. The outings spreadsheet now lists what each outing took.",
  "On a phone the shack's three-day forecast now shows one day a row, so its moon and weather tips read in full lines instead of a word or two at a time. With reduce motion on, the terns over the fish patch, the bank's squirrels and the spring grebes now hold still like the lake's other creatures.",
  "A water with a place now has Directions, which opens the route there on OpenStreetMap, and Save for a GPS, which saves it as a .gpx waypoint for a GPS, a sounder or a phone's map. Waters says how many waters you have fished this season and how many of them are new, and a new water's half-typed notes wait for you if the page closes before you save.",
  "In spring and summer, hop a jig over the crayfish creeping about the dock's pilings: the smallmouth and catfish that hunt them bite sooner, and many a bite is one of them. And on spring days cast among the tadpoles milling in the warm shallows, where the perch, bluegill and bass come to gorge on them.",
  "A farmhouse and a red barn now stand on the hills behind the far bank: their windows glow in the evening, the chimney smokes on cold days, and from spring to fall three cows graze the pasture beside them. On calm, clear mornings a low bank of mist lies along the foot of the hills.",
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
