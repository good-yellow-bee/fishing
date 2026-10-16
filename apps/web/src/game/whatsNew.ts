/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-16m";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t(). */
export const NEWS_ITEMS: readonly string[] = [
  "In the field log, a water can keep its place on the map, and a book file can add only the fish this browser doesn't have. The Photos page shows how full the photo room is, and last year's fish on the home page open every fish from that day.",
  "When you cast back into a school, you can now see small fish shadows milling round the float while you wait.",
  "Perch, bluegill and crappie travel in schools. Land one and cast again from the same bank: for two casts the bites come sooner, and often it's another of the same kind.",
  "A lake whitefish has a soft mouth: keep reeling while the tension is in the red and the hook tears out. The fight card warns you while it tears, so ease off at once.",
  "A hooked carp tears off on one long first run, half again as long as its later ones. The fight card calls it, so let it go and wait it out.",
  "On the lake you can now watch a pike turn over on the line when it rolls at the net. When a fish leaps or rolls, the fight card says it can't be turned, so just let go.",
  "In the field log a fish can carry both a length and a weight, and both count for the bests. An empty tackle list can copy the last outing's bag, and loading a book file says how many fish each copy holds and can be undone.",
  "A pike, tiger muskie or ghost pike doesn't make a last run at the net: it rolls on the line. You can't turn a roll, so let go when the fight card calls it, or a tight line goes into the red.",
  "You can see the wind on a fight now: a slack line bows downwind between runs. On a windy day the bow soaks up the strike too, so a solid hook needs a quicker one.",
  "On a windy day the wind bellies a slack line, so line drifts out faster while you rest between runs. The fight card says when it's breezy or strong.",
  "In the field log, species pages show how your best of each kind grew and count fish by wind and water temperature. The catch search finds words from notes, a water temperature (“>60°F”) and a day (“2026-10-12”), and every count opens exactly the fish it counted.",
  "Out on the rowboat, the boat swings round to follow a run, so a run takes out less line than it would from the bank.",
  "On the lake you can now see the water at work: a run at the drop-off dives under the surface, and at the inlet the current carries a resting fish off to the side until you reel it back.",
  "You can hear the water now: the line grates while you reel against a run on the rocks off the point, and a fish going into the weeds at the reeds swishes, with a buzz on phones and controllers.",
  "Off the point the fight card calls a run that is dragging the line over the rocks, and the landed card notes a fish kept out of the weeds or off the rocks.",
  "Off the point, turn the runs: a run you leave alone drags the line over the rocks, so reeling against it strains the line harder.",
  "In the field log, saving a catch now says “Fish saved.” for a moment, downloading the book says it went through, and restoring the sample book can be undone from the bar at the bottom.",
  "At the drop-off a run dives: it pulls harder against a reeling line but tires the fish faster, so let it go and reel between runs.",
  "At the inlet the current takes slack line out faster, so keep the fish coming. The fight card now says what the water does at the reeds and the inlet.",
  "Fishing from the reeds, turn the runs: a run you leave alone ends with the fish in the weeds, where it rests and line comes in only slowly.",
  "Levels 11 and 12 are open: from level 11 (12000 points) fish hold the bait longer before they let go, and from level 12 (17000) the gold perfect-cast mark is wider.",
  "The cast meter keeps a dashed mark where your last cast stopped, so the next one can be aimed from it. A fish on the line that outweighs your best of its kind says so on the fight card.",
  "The catch search now finds fish by size (“>2 lb”, “<30 cm”) and joins two searches with “+”, so “Northern pike + >2 lb” finds just the big pike. Lures on catch cards, the species page’s water counts and its new moon bars open those fish too.",
  "On the lake, a sulking carp, catfish, burbot or sturgeon now sinks deep until you pump it up, and a pike, muskie or largemouth bass pulls the float straight under with no warning tap.",
  "The catch search now finds fish by sky (“overcast”), season (“fall”), time of day (“dawn”) and week of the moon, and every bar on the Bests page opens the fish behind it. A planned outing and a water’s page say what that water gave the same week in earlier years.",
  "Bow to a trout's or bass's leap and the landed card counts it, as it does a carp hooked on its second take. The tension bar keeps a notch at the fight's highest tension, red once it touched the red.",
  "The landed card now says how long the fight took. A missed bite says how long the fish held the bait, and a strike at a nibble says it was only a nibble, so the timing is easier to learn.",
  "Carp, catfish, burbot and sturgeon now sulk on the bottom between runs: reeling barely moves them, so ease off for a moment, then pump. The fight card also says when a fish is played out and ready to reel in, and the float twitches while a bottom feeder comes back for a second take.",
  "Miss the strike on a carp, catfish, burbot or sturgeon and it comes back once for a second take. Each bite is called the way the fish takes it: a predator's WHAM, a bottom feeder's slow take. A fish landed on the edge of a snap is noted as a Close call.",
  "The catch search also finds released fish and kinds of water (“river”, “pond”), sums up what it found, and can save those fish as a spreadsheet.",
  "When a fish takes line back, the line bar fills red from the right and the fight card says Running out of line! before it gets away. The landed card counts clean fights in a row, and a snapped line says how close the fish came.",
  "Fish take the bait their own way: pike, muskies and largemouth bass hit with no nibble first, while carp, catfish, burbot and sturgeon mouth it a few times before the real bite. The strike also says how quick it was, and how quick a solid hook needs to be.",
  "The field log's catch search finds fish by month too: type “sep” or “October 2026”. Bests counts fish by month, and the home Fish tile shows this month's catch.",
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
