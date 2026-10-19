/** Bump with each batch of news, so anglers who saw the last card see the new one once. */
export const NEWS_ID = "2026-10-19-game19";
export const NEWS_KEY = "stillwater.news.v1";

/** The headline changes since the last card, in English; the card runs each through t().
 * The card shows only the newest four, and this list ships with every page, so older lines are dropped. */
export const NEWS_ITEMS: readonly string[] = [
  "Watch for the bigger fish hunting the small ones: a smallmouth may hit a crappie you're reeling in under the dock, and a pike a perch off the Drop-off, and then the fight starts again with the hunter. And from the dock, cast out under the kingfisher's snag: the perch and bass hunt the same fry it dives on, so the bites come sooner and many are one of them.",
  "A planned outing now has Copy the plan, which copies the day, the water, what works there and what is still to pack, to send to whoever is coming along. Trips adds Only my outings when the sample week or the game's rounds sit among your own, and says how many outings have gone by since your last fish. The outings spreadsheet now lists what each outing took.",
  "On a phone the shack's three-day forecast now shows one day a row, so its moon and weather tips read in full lines instead of a word or two at a time. With reduce motion on, the terns over the fish patch, the bank's squirrels and the spring grebes now hold still like the lake's other creatures.",
  "A water with a place now has Directions, which opens the route there on OpenStreetMap, and Save for a GPS, which saves it as a .gpx waypoint for a GPS, a sounder or a phone's map. Waters says how many waters you have fished this season and how many of them are new, and a new water's half-typed notes wait for you if the page closes before you save.",
  "In spring and summer, hop a jig over the crayfish creeping about the dock's pilings: the smallmouth and catfish that hunt them bite sooner, and many a bite is one of them. And on spring days cast among the tadpoles milling in the warm shallows, where the perch, bluegill and bass come to gorge on them.",
  "A farmhouse and a red barn now stand on the hills behind the far bank: their windows glow in the evening, the chimney smokes on cold days, and from spring to fall three cows graze the pasture beside them. On calm, clear mornings a low bank of mist lies along the foot of the hills.",
  "A picked season's recap on Bests now opens what it counts: its fish, its outings, and its kinds further down. Bests' month-by-year table adds a total for each year with its best month in bold, a catch search with several fish says how many days and outings they came on, and a species page says how many outings at each water took one.",
  "In spring a few of the shore trees flower white or pink. On clear winter mornings and evenings the snowy hills behind the far bank glow pink in the low sun. From summer into the fall two hay fields on those hills lie mown in pale stripes, with round bales dotted across them.",
  "On grey, overcast days a gap now and then opens in the cloud, and a patch of sunlight slides across the lake with faint beams slanting down to it. On blowy winter days the wind lifts the snow off the hills behind the far bank and streams it along them in long white wisps.",
  "On winter days snow lies white on the hills behind the lake, and two children take turns sledging down a run between the far trees, rushing down in a spray of snow and trudging back up pulling their sleds.",
  "From spring through summer, cast onto the sunfish nests either side of the dock: perch and smallmouth come to raid the eggs, so the bites come sooner and many are one of them. In summer and fall a popper over a duckweed mat draws the bass lurking in its shade, but any other lure comes back bearded with weed and the fish turn from it.",
  "Gear's lure record can show one water at a time, a packed lure that took fish on that water before says so on the list, the Map's \"Next outing\" opens that outing, and each of your own waters on the Map can copy its place.",
  "Now and then a heavier squall sweeps across the lake in a shower, a grey curtain of rain with the water boiling beneath it. On winter days crows feed on the far shore and fly up in a loop over the water when the jogger runs by, and at night a pair of eyes sometimes shines at the edge of the far bank.",
  "On still summer evenings little clouds of midges dance and glint over the water in front of the dock, and on fine fall mornings long silk threads from tiny spiders drift across the lake, catching the sun. Now and then a shoal of fry bursts out of the open water as something hunts them from below, and on bitter, clear winter mornings the air over the lake sparkles with diamond dust.",
  "A search for a day that only has a night's small-hours fish offers that outing's day instead, the calendar's month counts open those days and fish, Home recalls in early January how last year's goal ended, outings sent to the calendar remind you to pack the evening before, and the year's copied summary says where its pace ends it.",
  "On warm days someone reads in a striped hammock by the campers' tent, and on calm summer days someone paddles a paddleboard across the lake with a little dog sitting up at the nose. On calm nights someone rows slowly round the lake with a lantern glowing at the stern. Spring and summer showers now and then turn to hail that bounces on the dock, and on dry fall days a little whirlwind spins a column of leaves out over the water.",
  "On cold clear dawns in fall and winter wisps of steam rise off the lake and lean away on the breeze. On still summer dawns a hot-air balloon drifts over the far water, its burner roaring now and then, and dips its basket to touch the lake before climbing away. On winter days loads of snow slip off the trees across the lake in a puff of powder.",
  "The full-size photo steps through the other photos of the list it was opened from, Photos can show the largest first and counts the fish still without a photo, the find box offers your last three searches, and a fish's page can step through the rest of its outing's fish.",
  "Smallmouth bass and rainbow trout now charge: once a fight one may turn and run straight at you, and the fight card shouts REEL, so wind fast to keep the line tight, or a light hook drops out of the slack. And on a breezy day, cast into the foam lanes the wind rakes across the water: it gathers drowned insects there, and the fish feeding along them bite sooner.",
  "At dusk in fall a great flock of starlings wheels over the far shore, its mirror crossing the still lake, and in winter black-headed gulls stand on the ice floes, now and then wheeling out over the water. By day a robin drops in on the dock's front posts, and in the rain or on a dewy morning a snail glides across the planks behind you.",
  "Outings can be found by the time of day of their fish (\"night\", \"dawn\"), an outing names the others on its water that day, planned ones say how many days are left, and the calendar file lists what works on the water and what is still to pack.",
  "Of an evening from spring to fall someone rocks in a chair in front of the far cabin, a lantern flickering beside them, and on winter evenings coloured lights twinkle along its eaves. At dawn in spring and fall a little flock of sandpipers works the far bank's waterline, and a pair of coots keeps to the lilies at the lake's west end, diving now and then and squabbling across the water in spring.",
  "On a tablet or a narrow laptop window with larger text, the field log keeps everything on the page: Home's cards and columns stack instead of squeezing words one letter a line, and Spots shows one card a row. The side menu now reaches Gear and Bests on a short window, and a full-size photo fits the screen with Close in reach.",
  "At dusk and at night an angler sits out on the far bank with a glowing float on the water, their headlamp's beam following where they look. On calm days a child skims stones from the water's edge, a ring spreading at every skip. In spring a birdwatcher scans the lake through binoculars from the far bank, and on winter days a jogger in a bobble hat runs the shore below the ski track.",
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
