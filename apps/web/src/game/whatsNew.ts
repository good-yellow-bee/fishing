/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-15l";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t(). */
export const NEWS_ITEMS: readonly string[] = [
  "Tackle lists say when everything is packed and can be unpacked in one tap, and upcoming trips show how the bag is coming along. Each catch says which of its kind it is, and the Fish page lists every species.",
  "Water and trip pages in the field log list the kinds of fish caught there. Each species page shows when that fish bites, and Log another starts a catch of that kind.",
  "Every kind of fish has its own page in the field log: how many, the biggest, what it takes, and where it comes from. Open it from Bests or from any catch.",
  "The field log shows the moon on each catch and trip, and Bests counts your fish by the week of the moon. Fish released from the lake are marked released in the book too.",
  "Mark a fish as released and the field log counts it on trips and waters. A catch you start but don't save is kept for a day, and the next fish on an outing can take the last one's weather in one tap.",
  "Deleted something in the field log by mistake? Undo brings it back. Past outings have Go again, which copies the tackle list, and pieces can be taken off a list.",
  "Upcoming trips in the field log can go straight into your calendar, and the Spots list puts the waters you fished last on top.",
  "Any catch page in the field log can save a picture card of the fish, and the lake's fish now go in the book under Stillwater, apart from your own waters.",
  "Each water in the field log shows what works there: its best lures and the time of day with the most fish, also on upcoming trips.",
  "Logging a catch offers the water's best lures as one-tap picks, and Log another like this starts the next fish from the last.",
  "In the field log, your record fish wear a tag, and each catch and trip page links to the next one, newer or older.",
  "The field log has a photo wall: every fish you kept a snapshot of, big, newest first. Open it from the catch log.",
  "The field log can save your catches as a spreadsheet, and trip and water pages sum up their fish.",
  "Weights, lengths and water temperature can show in kilograms, centimetres and °C: pick the units in Settings.",
  "The field log's Bests page shows when the fish bite, your best lures, the catch by season and your best day.",
  "Logging a catch in the field log suggests your own lures first, and the weather can be left blank.",
  "Settings has a battery saver: the lake draws 30 frames a second to spare a phone's battery.",
  "Change the lure without the menu: Q and R on a keyboard, or the bumpers on a controller.",
  "Photo mode (H) can now save the view: press P or Space, or tap Save this view, and the lake is saved as a picture.",
  "In photo mode, drag to look around and pinch, scroll or press + and − to zoom before you save.",
  "On a touch screen, a thumb stick at the bottom corner walks the angler. Settings can hide it.",
  "In spring and summer, terns circle and dive over the bubbling fish patch, so you can spot it from across the lake.",
  "A cormorant stands on a rock out in the lake drying its wings, and slips in now and then to fish.",
  "In spring, watch for a pair of grebes rearing up and rushing across the water side by side.",
  "Cast too close to the cormorant or the grebes and they slip under; the loon, otter and kingfisher now dive head first.",
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
