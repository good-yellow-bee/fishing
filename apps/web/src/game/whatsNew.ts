/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-20-pa38";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t().
 * The card shows only the newest four, and this list ships with every page, so older lines are dropped. */
export const NEWS_ITEMS: readonly string[] = [
  "On a small phone held upright, the cast meter now always sits low beside the walking stick, clear of the hint over the lake. And with larger text, the note naming where you stand stops after a few rows instead of pushing the hint down onto the stick and the meter; a screen reader still hears all of it.",
  "From the shack you can now see the shiner trap in the shallows below it, and once it is ready a shiner flips in the cage now and then. And while you wait at the shack, the trap turns ready the moment its soak ends, even if you touch nothing.",
  "The shiner trap now follows the season: baited in winter's cold water, it soaks twelve hours and holds just one shiner. And spare shiners in your bait bucket keep five days in winter, but only two in the summer heat.",
  "On a kind's page, a water spelled two ways says how often its outings took the kind, as other waters do, and the water lists on the catch and outing forms tell two such waters apart by their fish. A water's outings now count those with only a lost fish or a missed strike, as Trips does.",
  "Groundbait left on a bank from an earlier visit, once it has the feeders gathered there, now shows them: little rings dimple the water over its cloud while it lasts. And the hedgerows on the upper hills now run on as continuous hedges instead of dotted lines of bushes.",
  "Your arm now tires sooner in a long fight: past nine seconds of reeling it slows bit by bit, and it rests while the fish waits at the net, so a big catfish or burbot can wear down a weak arm. And the free handful of groundbait now comes once a day: a reload no longer gives back one you spent.",
  "On Bests, a kind that set a new best in the season picked says the record it beat, and a kind's card says how many of it went back, opening them. Twin waters spelled two ways count as one, and a month's outings match the list they open.",
  "Gear's lure record says where each lure took most of its fish, opening them, and a packed piece says how many fish it took on the outing's water. Undo on a packing list never puts a piece back twice.",
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
