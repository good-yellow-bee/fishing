/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-15c";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t(). */
export const NEWS_ITEMS: readonly string[] = [
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
