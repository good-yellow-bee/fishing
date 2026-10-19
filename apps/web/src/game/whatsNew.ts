/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-19-pa29";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t().
 * The card shows only the newest four, and this list ships with every page, so older lines are dropped. */
export const NEWS_ITEMS: readonly string[] = [
  "On a narrow phone or with larger text, outing and catch cards now put the date, size and photo above the words instead of squeezing them into a strip, and the lodge board's fish of the week does the same. Keyboard focus in the field log stops below the phone's top bar, the catch form's time and nearest-water buttons are easier to tap, and on a phone held sideways the coach and the news card stay off the shore signs.",
  "On Bests, a water's card names its biggest fish, the record tiles say the day, and a season marks each kind that set a new best and names its best lure. The year's goal box says how many days since your last fish, and the goal form offers a goal that beats last year.",
  "From level 16, Voice of the lake, at 47000 points, pulling the rod against a run cuts it short a quarter faster. And a run you turn swings the fish's head round: reel straight after it to win line faster for a moment.",
  "An orchard now grows below the farm on the far hills: white and pink blossom in spring, gold leaves and red apples in the fall, bare in winter. From spring through summer a pair of white storks stands in a nest on the barn roof, clattering their bills now and then.",
  "Three clean fights in a row now pay: from the third, each clean catch earns 1.2× more points. And a lure's colour counts: a bright one like chartreuse shows up in rain, fog or the low light, a natural one like green pumpkin in clear daylight, and a black one at night, and the lure list marks it good now.",
  "A little steam train now runs along the foot of the hills behind the far bank, puffing out of one tunnel and into the other, then back the other way a while later. After dark its carriage windows glow as it goes.",
  "An outing's tackle list offers Undo after Unpack all or taking a piece off. On the Map, a water's next outing says how much of its bag is packed, and in the small hours the water you are on says Out now. Gear's best lures to pack put those of the outing's own water first.",
  "In spring the field under the windmill on the hills behind the far bank flowers bright yellow with rapeseed, in close rows along the slope, and its colour fades with the evening light.",
  "Home's What's new keeps to the field log. With nothing planned, Home's Next says when you were last out, with Go again, and behind a year's goal it says how many fish a week it needs. The book file gives this year's catches as a sheet of their own, and its last copy says how many fish it held.",
  "Find a catch offers its best words as one-tap searches, and a search's spreadsheet is named after it. A fish's page says its place on the outing, such as fish 3 of 5.",
  "Find an outing offers its best words as one-tap searches. In the small hours last evening's outing reads Last night, outing cards count missed strikes, and a water's tackle tips go on the list all at once.",
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
