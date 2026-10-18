/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-18-scene14";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t().
 * The card shows only the newest four, and this list ships with every page, so older lines are dropped. */
export const NEWS_ITEMS: readonly string[] = [
  "At dawn and dusk a snowshoe hare hops out to graze on the grass by the shack, brown in summer and white in winter. Wildflowers bloom round the shack from spring to fall, with bumblebees going from flower to flower on dry days, and a woodpile and chopping block stand by the campfire, snowed on in winter.",
  "An outing's page says how the water did the next time and links to the water on the Map, and the outing search understands “weekend” and “weekday”.",
  "You can now fish with a keyboard alone: hold the arrow keys to move the aiming ring over the water, then cast with Space. In a fight Left and Right still steer. Buying an upgrade in the shack, claiming a request and releasing a fish keep your place on the keyboard, and a screen reader now hears the new rank, the claim and the release.",
  "In winter a bird feeder goes up by the shack, and chickadees flit between it and the oak all day. When it rains, puddles gather on the grass in front of the shack with raindrops ringing them, and on dry days the washing hangs out on a line by the water, blowing in the wind.",
  "A screen reader now hears how each cast ends: a landed fish's name is read and the next key goes to Release, and a missed bite or a snapped line is said aloud. If your phone or computer is set to reduce motion, storms no longer flash the lake and no shooting stars cross the night sky, even with the game's own setting off. And Join says up front that a password needs at least 8 characters.",
  "Waters has a Find a water box once the list is long, a water's and a kind's “Through the year” name the best month, and an old link to a merged water says where it went.",
  "Screen readers and keyboards find their way more easily. The lake now has a page heading, so a screen reader can jump straight to it, and the notes beside the dock (where you stand, the controls) are named, so the list of page areas says what each one is. Keyboard focus rings on the field log's pages and the sign-in card are a deeper colour that stands out against the paper.",
  "On fine days someone paddles a canoe along the far shore and back. Across the lake a log cabin lights its windows at dusk and smokes from its chimney when the weather turns cold, and the shack now has a ginger cat that naps on the grass by day and sits by the campfire at night.",
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
