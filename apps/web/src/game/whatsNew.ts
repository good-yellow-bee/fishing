/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-19-pa21";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t().
 * The card shows only the newest four, and this list ships with every page, so older lines are dropped. */
export const NEWS_ITEMS: readonly string[] = [
  "On a phone the shack's three-day forecast now shows one day a row, so its moon and weather tips read in full lines instead of a word or two at a time. With reduce motion on, the terns over the fish patch, the bank's squirrels and the spring grebes now hold still like the lake's other creatures.",
  "At dusk in fall a great flock of starlings wheels over the far shore, its mirror crossing the still lake, and in winter black-headed gulls stand on the ice floes, now and then wheeling out over the water. By day a robin drops in on the dock's front posts, and in the rain or on a dewy morning a snail glides across the planks behind you.",
  "Outings can be found by the time of day of their fish (\"night\", \"dawn\"), an outing names the others on its water that day, planned ones say how many days are left, and the calendar file lists what works on the water and what is still to pack.",
  "Of an evening from spring to fall someone rocks in a chair in front of the far cabin, a lantern flickering beside them, and on winter evenings coloured lights twinkle along its eaves. At dawn in spring and fall a little flock of sandpipers works the far bank's waterline, and a pair of coots keeps to the lilies at the lake's west end, diving now and then and squabbling across the water in spring.",
  "On a tablet or a narrow laptop window with larger text, the field log keeps everything on the page: Home's cards and columns stack instead of squeezing words one letter a line, and Spots shows one card a row. The side menu now reaches Gear and Bests on a short window, and a full-size photo fits the screen with Close in reach.",
  "At dusk and at night an angler sits out on the far bank with a glowing float on the water, their headlamp's beam following where they look. On calm days a child skims stones from the water's edge, a ring spreading at every skip. In spring a birdwatcher scans the lake through binoculars from the far bank, and on winter days a jogger in a bobble hat runs the shore below the ski track.",
  "Past outings' bags opened on Gear stay open when you come Back from an outing, and \"Fold all\" closes them in one tap.",
  "A water's page opens its last outing with what it gave, and copies its place for a sounder; Waters cards name the best lure, and long water pickers start with the ones fished lately.",
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
