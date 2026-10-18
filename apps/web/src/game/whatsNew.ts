/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-18-pa17";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t().
 * The card shows only the newest four, and this list ships with every page, so older lines are dropped. */
export const NEWS_ITEMS: readonly string[] = [
  "The lake loads faster: the angler's model is half its old size. On a phone held sideways the top bar fits on one row, and with the largest text the catch card shows the fish before its buttons. A laptop zoomed to 200% now gets the same compact layout, so the lake is no longer hidden under the header.",
  "A fish's page offers “Add a photo” when it has none and says how the same day went in an earlier year, and Photos can show one year at a time.",
  "At night the far cabin's lit windows shine on the lake as streaks of warm light. On breezy days a little sailing dinghy reaches back and forth across the lake, heeling to the wind, and a tyre swing hangs from the oak by the shack, rocking in the breeze and capped with snow in winter.",
  "The field log and the lake open faster on a phone: the first download is 20 KB smaller, and in Polish the language file is half its old size. The lake's hint bar and controls strip now mention the arrow keys for aiming. With reduce motion on, rain, snow and falling leaves hold still instead of sweeping across the screen.",
  "At dawn and dusk a snowshoe hare hops out to graze on the grass by the shack, brown in summer and white in winter. Wildflowers bloom round the shack from spring to fall, with bumblebees going from flower to flower on dry days, and a woodpile and chopping block stand by the campfire, snowed on in winter.",
  "An outing's page says how the water did the next time and links to the water on the Map, and the outing search understands “weekend” and “weekday”.",
  "You can now fish with a keyboard alone: hold the arrow keys to move the aiming ring over the water, then cast with Space. In a fight Left and Right still steer. Buying an upgrade in the shack, claiming a request and releasing a fish keep your place on the keyboard, and a screen reader now hears the new rank, the claim and the release.",
  "In winter a bird feeder goes up by the shack, and chickadees flit between it and the oak all day. When it rains, puddles gather on the grass in front of the shack with raindrops ringing them, and on dry days the washing hangs out on a line by the water, blowing in the wind.",
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
