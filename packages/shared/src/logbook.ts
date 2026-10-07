import { isWeather, parseWeatherDraft, sampleCatchWeather, type CatchWeather } from "./weather.ts";

export const WATER_TYPES = ["lake", "river", "pond", "creek", "reservoir"] as const;

export type WaterType = (typeof WATER_TYPES)[number];

export const WATER_LABELS: Record<WaterType, string> = {
  lake: "Lake",
  river: "River",
  pond: "Pond",
  creek: "Creek",
  reservoir: "Reservoir",
};

export type Measure =
  | { kind: "length"; inches: number }
  | { kind: "weight"; pounds: number };

export type Spot = {
  id: string;
  name: string;
  waterType: WaterType;
  notes: string;
  bestConditions: string;
};

export type Trip = {
  id: string;
  date: string;
  spotId: string;
  title: string;
  note: string;
};

export type CatchEntry = {
  id: string;
  species: string;
  measure: Measure;
  lure: string;
  spotId: string;
  tripId: string | null;
  caughtAt: string;
  note: string;
  weather: CatchWeather | null;
};

export type Logbook = {
  spots: Spot[];
  trips: Trip[];
  catches: CatchEntry[];
};

export type FieldError = { ok: false; field: string; message: string };
export type Parsed<T> = { ok: true; value: T } | FieldError;

export type CatchDraft = {
  species: string;
  measureKind: "length" | "weight";
  amount: string;
  lure: string;
  spotId: string;
  tripId: string;
  caughtAt: string;
  note: string;
  sky: string;
  wind: string;
  waterTemp: string;
};

export type SpotDraft = {
  name: string;
  waterType: string;
  notes: string;
  bestConditions: string;
};

export type TripDraft = {
  date: string;
  spotId: string;
  title: string;
  note: string;
};

export function localDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function shiftDate(date: Date, days: number): string {
  return localDate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
}

function caughtAtOn(ymd: string, hours: number, minutes: number): string {
  const [year, month, day] = ymd.split("-").map((part) => Number(part));
  return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
}

export function sampleLogbook(now = new Date()): Logbook {
  const spots: Spot[] = [
    {
      id: "spot-cedar",
      name: "Cedar Bend",
      waterType: "lake",
      notes: "North shore of the big lake. Cedars lean over a gravel shelf, then a weed edge that drops to about twelve feet.",
      bestConditions: "Overcast, light west wind, water in the high 50s",
    },
    {
      id: "spot-mill",
      name: "Mill Race",
      waterType: "river",
      notes: "Pocket water below the old mill dam. Brook trout sit in the tailouts and the soft seam along the wall.",
      bestConditions: "Modest rise, tea-stained and clearing, first light",
    },
    {
      id: "spot-duck",
      name: "Blackduck Pond",
      waterType: "pond",
      notes: "Shallow and weedy. Bluegill under the pads, and a bass if you work the shade line.",
      bestConditions: "Still evenings, surface bugs",
    },
    {
      id: "spot-quarry",
      name: "Quarry Cut",
      waterType: "reservoir",
      notes: "Flooded quarry arm. Smallmouth hold the rock points and the first break into the channel.",
      bestConditions: "Bright sun, craw patterns dragged on the points",
    },
    {
      id: "spot-oxbow",
      name: "Oxbow Creek",
      waterType: "creek",
      notes: "Narrow, cold, and easy to spook. Wild brookies if you stay off the bank and out of the skyline.",
      bestConditions: "Low and clear, full cloud cover",
    },
  ];

  const trips: Trip[] = [
    {
      id: "trip-dawn",
      date: localDate(now),
      spotId: "spot-cedar",
      title: "Dawn patrol",
      note: "Weed edge before the wind fills in.",
    },
    {
      id: "trip-quarry-next",
      date: shiftDate(now, 3),
      spotId: "spot-quarry",
      title: "Back to the points",
      note: "Green pumpkin tubes and a spare leader.",
    },
    {
      id: "trip-mill",
      date: shiftDate(now, -1),
      spotId: "spot-mill",
      title: "Below the mill",
      note: "Water was up a few inches and the color of weak tea.",
    },
    {
      id: "trip-cedar-eve",
      date: shiftDate(now, -3),
      spotId: "spot-cedar",
      title: "Evening edge",
      note: "The weed point turned on once the light dropped.",
    },
    {
      id: "trip-quarry",
      date: shiftDate(now, -6),
      spotId: "spot-quarry",
      title: "Rock points",
      note: "Sun was high. They wanted it slow on the bottom.",
    },
    {
      id: "trip-duck",
      date: shiftDate(now, -11),
      spotId: "spot-duck",
      title: "Pad edges",
      note: "Glass calm until the bugs came off.",
    },
    {
      id: "trip-oxbow",
      date: shiftDate(now, -16),
      spotId: "spot-oxbow",
      title: "Quiet water",
      note: "Knees in the alders. One good fish and two misses.",
    },
  ];

  const catches: Array<Omit<CatchEntry, "weather">> = [
    {
      id: "catch-brook-bugger",
      species: "Brook trout",
      measure: { kind: "length", inches: 11.5 },
      lure: "Woolly bugger",
      spotId: "spot-mill",
      tripId: "trip-mill",
      caughtAt: caughtAtOn(shiftDate(now, -1), 6, 40),
      note: "Took it on the swing through the tailout.",
    },
    {
      id: "catch-brook-nymph",
      species: "Brook trout",
      measure: { kind: "weight", pounds: 0.4 },
      lure: "Pheasant tail",
      spotId: "spot-mill",
      tripId: "trip-mill",
      caughtAt: caughtAtOn(shiftDate(now, -1), 7, 5),
      note: "Smaller fish, same seam along the wall.",
    },
    {
      id: "catch-pike-mepps",
      species: "Northern pike",
      measure: { kind: "length", inches: 28 },
      lure: "#5 Mepps",
      spotId: "spot-cedar",
      tripId: "trip-cedar-eve",
      caughtAt: caughtAtOn(shiftDate(now, -3), 18, 15),
      note: "Followed twice, then hit on the pause.",
    },
    {
      id: "catch-pike-spin",
      species: "Northern pike",
      measure: { kind: "weight", pounds: 6.4 },
      lure: "Spinnerbait",
      spotId: "spot-cedar",
      tripId: "trip-cedar-eve",
      caughtAt: caughtAtOn(shiftDate(now, -3), 18, 50),
      note: "Same weed point. Heavier fish, short fight.",
    },
    {
      id: "catch-smallie-tube",
      species: "Smallmouth bass",
      measure: { kind: "length", inches: 16.5 },
      lure: "Green pumpkin tube",
      spotId: "spot-quarry",
      tripId: "trip-quarry",
      caughtAt: caughtAtOn(shiftDate(now, -6), 14, 10),
      note: "Dragged it off the first point into the channel.",
    },
    {
      id: "catch-smallie-crank",
      species: "Smallmouth bass",
      measure: { kind: "weight", pounds: 2.1 },
      lure: "Crayfish crank",
      spotId: "spot-quarry",
      tripId: "trip-quarry",
      caughtAt: caughtAtOn(shiftDate(now, -6), 15, 5),
      note: "Hit as the crank bounced the second rock.",
    },
    {
      id: "catch-gill",
      species: "Bluegill",
      measure: { kind: "length", inches: 7.5 },
      lure: "Popper",
      spotId: "spot-duck",
      tripId: "trip-duck",
      caughtAt: caughtAtOn(shiftDate(now, -11), 19, 10),
      note: "Sipped it under the pads and ran for the stems.",
    },
    {
      id: "catch-perch",
      species: "Yellow perch",
      measure: { kind: "weight", pounds: 0.6 },
      lure: "Nightcrawler",
      spotId: "spot-duck",
      tripId: "trip-duck",
      caughtAt: caughtAtOn(shiftDate(now, -11), 19, 40),
      note: "Right at dark, off the little point.",
    },
    {
      id: "catch-brook-caddis",
      species: "Brook trout",
      measure: { kind: "length", inches: 9 },
      lure: "Elk hair caddis",
      spotId: "spot-oxbow",
      tripId: "trip-oxbow",
      caughtAt: caughtAtOn(shiftDate(now, -16), 8, 20),
      note: "Rose once in the tail of the pool.",
    },
    {
      id: "catch-rainbow",
      species: "Rainbow trout",
      measure: { kind: "length", inches: 13 },
      lure: "Pheasant tail",
      spotId: "spot-oxbow",
      tripId: "trip-oxbow",
      caughtAt: caughtAtOn(shiftDate(now, -16), 8, 55),
      note: "Held under the leaning birch. Came up on the second drift.",
    },
  ];

  return {
    spots,
    trips,
    catches: catches.map((entry) => ({ ...entry, weather: sampleCatchWeather(entry.id) })),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWaterType(value: unknown): value is WaterType {
  return typeof value === "string" && (WATER_TYPES as readonly string[]).includes(value);
}

function isMeasure(value: unknown): value is Measure {
  if (!isRecord(value)) return false;
  if (value.kind === "length") return typeof value.inches === "number" && Number.isFinite(value.inches);
  if (value.kind === "weight") return typeof value.pounds === "number" && Number.isFinite(value.pounds);
  return false;
}

function isSpot(value: unknown): value is Spot {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.name === "string" &&
    isWaterType(value.waterType) &&
    typeof value.notes === "string" &&
    typeof value.bestConditions === "string"
  );
}

function isTrip(value: unknown): value is Trip {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.date === "string" &&
    typeof value.spotId === "string" &&
    typeof value.title === "string" &&
    typeof value.note === "string"
  );
}

function isCatch(value: unknown): value is CatchEntry {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.species === "string" &&
    isMeasure(value.measure) &&
    typeof value.lure === "string" &&
    typeof value.spotId === "string" &&
    (value.tripId === null || typeof value.tripId === "string") &&
    typeof value.caughtAt === "string" &&
    typeof value.note === "string" &&
    (value.weather === null || isWeather(value.weather))
  );
}

export function isLogbook(value: unknown): value is Logbook {
  if (!isRecord(value)) return false;
  return (
    Array.isArray(value.spots) &&
    value.spots.every(isSpot) &&
    Array.isArray(value.trips) &&
    value.trips.every(isTrip) &&
    Array.isArray(value.catches) &&
    value.catches.every(isCatch)
  );
}

export function spotById(book: Logbook, id: string): Spot | undefined {
  return book.spots.find((spot) => spot.id === id);
}

export function tripById(book: Logbook, id: string): Trip | undefined {
  return book.trips.find((trip) => trip.id === id);
}

export function catchesNewestFirst(book: Logbook): CatchEntry[] {
  return [...book.catches].sort((a, b) => b.caughtAt.localeCompare(a.caughtAt));
}

export function recentCatches(book: Logbook, limit = 4): CatchEntry[] {
  return catchesNewestFirst(book).slice(0, limit);
}

export function upcomingTrips(book: Logbook, today: string): Trip[] {
  return book.trips.filter((trip) => trip.date >= today).sort((a, b) => a.date.localeCompare(b.date));
}

export function recentTrips(book: Logbook, today: string, limit?: number): Trip[] {
  const rows = book.trips.filter((trip) => trip.date < today).sort((a, b) => b.date.localeCompare(a.date));
  return limit === undefined ? rows : rows.slice(0, limit);
}

export function catchesForTrip(book: Logbook, tripId: string): CatchEntry[] {
  return catchesNewestFirst(book).filter((entry) => entry.tripId === tripId);
}

export function catchesForSpot(book: Logbook, spotId: string): CatchEntry[] {
  return catchesNewestFirst(book).filter((entry) => entry.spotId === spotId);
}

export function tripsForSpot(book: Logbook, spotId: string): Trip[] {
  return book.trips.filter((trip) => trip.spotId === spotId).sort((a, b) => b.date.localeCompare(a.date));
}

export function formatMeasure(measure: Measure): string {
  const amount = measure.kind === "length" ? measure.inches : measure.pounds;
  const rounded = (Math.round(amount * 10) / 10).toString();
  return measure.kind === "length" ? `${rounded} in` : `${rounded} lb`;
}

function fail(field: string, message: string): FieldError {
  return { ok: false, field, message };
}

function cleanLine(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const amount = Number(trimmed);
  return Number.isFinite(amount) ? amount : null;
}

export function parseCatchDraft(draft: CatchDraft, book: Logbook): Parsed<Omit<CatchEntry, "id">> {
  const species = cleanLine(draft.species);
  if (species.length < 2 || species.length > 40) {
    return fail("species", "Name the fish, in a few words.");
  }

  const amount = parseAmount(draft.amount);
  if (amount === null) return fail("amount", "Use a number for length or weight.");

  let measure: Measure;
  if (draft.measureKind === "length") {
    if (amount < 1 || amount > 120) return fail("amount", "Length should sit between 1 and 120 inches.");
    measure = { kind: "length", inches: amount };
  } else if (draft.measureKind === "weight") {
    if (amount < 0.1 || amount > 80) return fail("amount", "Weight should sit between 0.1 and 80 pounds.");
    measure = { kind: "weight", pounds: amount };
  } else {
    return fail("measureKind", "Choose length or weight.");
  }

  const lure = cleanLine(draft.lure);
  if (lure.length < 2 || lure.length > 60) return fail("lure", "What was on the line?");

  const spot = spotById(book, draft.spotId);
  if (!spot) return fail("spotId", "Pick the water this fish came from.");

  let tripId: string | null = null;
  if (draft.tripId) {
    const trip = tripById(book, draft.tripId);
    if (!trip) return fail("tripId", "That outing is not in the book.");
    if (trip.spotId !== spot.id) return fail("tripId", "That outing was on a different water.");
    tripId = trip.id;
  }

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(draft.caughtAt)) {
    return fail("caughtAt", "Set the time you landed it.");
  }
  const when = new Date(draft.caughtAt);
  if (Number.isNaN(when.getTime())) return fail("caughtAt", "Set the time you landed it.");
  if (when.getTime() > Date.now() + 5 * 60 * 1000) {
    return fail("caughtAt", "That time is still ahead of you.");
  }

  const note = draft.note.trim();
  if (note.length > 280) return fail("note", "Keep the note to a few lines.");

  const weather = parseWeatherDraft(draft);
  if (!weather.ok) return weather;

  return {
    ok: true,
    value: { species, measure, lure, spotId: spot.id, tripId, caughtAt: when.toISOString(), note, weather: weather.value },
  };
}

export function parseSpotDraft(draft: SpotDraft): Parsed<Omit<Spot, "id">> {
  const name = cleanLine(draft.name);
  if (name.length < 2 || name.length > 48) return fail("name", "Give the spot a short name.");
  if (!isWaterType(draft.waterType)) return fail("waterType", "Pick a water type.");
  const notes = draft.notes.trim();
  const bestConditions = cleanLine(draft.bestConditions);
  if (notes.length > 400) return fail("notes", "Shorten the notes a little.");
  if (bestConditions.length > 160) return fail("bestConditions", "Keep the best conditions to one line.");
  return { ok: true, value: { name, waterType: draft.waterType, notes, bestConditions } };
}

export function parseTripDraft(draft: TripDraft, book: Logbook): Parsed<Omit<Trip, "id">> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || Number.isNaN(new Date(`${draft.date}T12:00:00`).getTime())) {
    return fail("date", "Pick a date.");
  }
  const spot = spotById(book, draft.spotId);
  if (!spot) return fail("spotId", "Pick a spot.");
  const title = cleanLine(draft.title) || spot.name;
  if (title.length > 60) return fail("title", "Shorten the title.");
  const note = draft.note.trim();
  if (note.length > 400) return fail("note", "Shorten the note a little.");
  return { ok: true, value: { date: draft.date, spotId: spot.id, title, note } };
}

export function withCatch(book: Logbook, entry: CatchEntry): Logbook {
  return { ...book, catches: [...book.catches, entry] };
}

export function withSpot(book: Logbook, spot: Spot): Logbook {
  return { ...book, spots: [...book.spots, spot] };
}

export function withTrip(book: Logbook, trip: Trip): Logbook {
  return { ...book, trips: [...book.trips, trip] };
}

export function replaceCatch(book: Logbook, entry: CatchEntry): Logbook {
  if (!book.catches.some((row) => row.id === entry.id)) return book;
  return { ...book, catches: book.catches.map((row) => (row.id === entry.id ? entry : row)) };
}

export function replaceSpot(book: Logbook, spot: Spot): Logbook {
  if (!book.spots.some((row) => row.id === spot.id)) return book;
  return { ...book, spots: book.spots.map((row) => (row.id === spot.id ? spot : row)) };
}

export function replaceTrip(book: Logbook, trip: Trip): Logbook {
  if (!book.trips.some((row) => row.id === trip.id)) return book;
  return {
    ...book,
    trips: book.trips.map((row) => (row.id === trip.id ? trip : row)),
    catches: book.catches.map((entry) =>
      entry.tripId === trip.id && entry.spotId !== trip.spotId ? { ...entry, spotId: trip.spotId } : entry,
    ),
  };
}

export function withoutCatch(book: Logbook, id: string): Logbook {
  return { ...book, catches: book.catches.filter((entry) => entry.id !== id) };
}

export function withoutTrip(book: Logbook, id: string): Logbook {
  return {
    ...book,
    trips: book.trips.filter((trip) => trip.id !== id),
    catches: book.catches.map((entry) => (entry.tripId === id ? { ...entry, tripId: null } : entry)),
  };
}

const PLAY_LAKE: Spot = {
  id: "spot-stillwater",
  name: "Stillwater",
  waterType: "lake",
  notes: "",
  bestConditions: "",
};

function withPlayLake(book: Logbook): { book: Logbook; spotId: string } {
  const lake = book.spots.find((spot) => spot.waterType === "lake");
  if (lake) return { book, spotId: lake.id };
  return { book: withSpot(book, PLAY_LAKE), spotId: PLAY_LAKE.id };
}

export type LandedFish = {
  id: string;
  species: string;
  pounds: number;
  bank: string;
  caughtAt: string;
};

/** Fight results carry species and weight, not length. One weight catch on this lake. */
export function keepLandedCatch(book: Logbook, landed: LandedFish): Logbook {
  if (book.catches.some((entry) => entry.id === landed.id)) return book;
  const placed = withPlayLake(book);
  const bank = landed.bank.trim().toLowerCase();
  const entry: CatchEntry = {
    id: landed.id,
    species: landed.species,
    measure: { kind: "weight", pounds: landed.pounds },
    lure: "Bobber",
    spotId: placed.spotId,
    tripId: null,
    caughtAt: landed.caughtAt,
    note: bank ? `Landed at the ${bank}.` : "Landed on the lake.",
    weather: null,
  };
  return withCatch(placed.book, entry);
}

export function withoutSpot(book: Logbook, id: string): Logbook {
  const droppedTrips = new Set(book.trips.filter((trip) => trip.spotId === id).map((trip) => trip.id));
  return {
    spots: book.spots.filter((spot) => spot.id !== id),
    trips: book.trips.filter((trip) => trip.spotId !== id),
    catches: book.catches
      .filter((entry) => entry.spotId !== id)
      .map((entry) => (entry.tripId && droppedTrips.has(entry.tripId) ? { ...entry, tripId: null } : entry)),
  };
}
