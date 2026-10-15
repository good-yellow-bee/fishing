/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-15z";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t(). */
export const NEWS_ITEMS: readonly string[] = [
  "Reel while the tension bar is amber (Tight) and the line comes in a quarter faster, but let go before it turns red. The landed card notes a perfect cast, a solid hook and the runs you turned, and a controller's buttons show on the fight card.",
  "A cast that stops on the gold mark in the middle of the cast meter is a perfect cast, and the bite comes sooner. A fish reeled close while it still has fight in it makes one last run at the net, and a controller now rumbles with the fight (Vibration in Settings turns it off).",
  "Month headings in the field log now count what each month holds: outings and fish on the Trips and water pages, fish in the catch lists, and pictures on Photos.",
  "Levels 9 and 10 are open: from level 9 hooked fish tire faster, and from level 10 rare fish bite more often. Strike quickly on a bite and the hook sets solid, so the fish starts the fight a little tired.",
  "The field log says what weather a water's fish came in, under What works here, and Bests counts all your fish by the weather.",
  "Fish now tire as you play them: the fight card says when one is tiring or played out, and it comes up near the surface. Turn a run by holding ← or A (→ or D) the other way, or the side buttons on a touch screen.",
  "A fish logged without its outing can join it in one tap, from the fish's page or from the outing's page, which counts the loose fish from its water that day.",
  "In the field log, press / on the home page to search, and the largest fish in a trip, water or species summary opens its catch. Adding a water with a name already in the book gets a heads-up.",
  "The game's field guide (under Catch log) and the field log's species pages now link to each other, so a kind you caught on the lake opens its page in the book.",
  "A new catch files itself under the outing on its water that day, and planning a second outing on the same water and day gets a heads-up. Photos sit under month headings, and Bests says which kind each water gives most.",
  "Every fish list in the field log, and the catch search, now sits under month headings. The home page says when your next outing is.",
  "Spot cards name your next outing on each water, past trips sit under month headings, and a trip page says between which times its fish came. On the Gear page, past outings fold their lists away.",
  "Typing a species on the catch form shows your biggest of that kind so far, and planning a trip says how your last outing on that water went. The map lists each water's fish.",
  "In the field log, lures link to every fish they took: on catch pages, in Bests and in What works here. The Bests tiles open the record fish, and past trips show their fish before the tackle.",
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
