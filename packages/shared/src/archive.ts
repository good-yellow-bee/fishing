import { isLogbook, type CatchEntry, type Logbook, type Measure, type Spot, type Trip } from "./logbook.ts";
import { CATCH_PHOTO_STORE_MAX_CHARS, isCatchPhoto, photosForBook, type CatchPhotoMap } from "./photo.ts";
import { isTackleBox, type TackleItem } from "./tackle.ts";
import { prepareStoredLogbook } from "./weather.ts";

export const FIELD_ARCHIVE_KIND = "stillwater-field-log";

export const FIELD_ARCHIVE_VERSION = 1;

export const FIELD_ARCHIVE_REFUSAL =
  "That file is not a Stillwater field log. This book was left as it is.";

export const FIELD_ARCHIVE_TOO_LARGE =
  "That file has more photos than this browser should keep. This book was left as it is.";

export type FieldArchive = {
  book: Logbook;
  tackle: TackleItem[];
  photos: CatchPhotoMap;
};

export type FieldArchiveDocument = {
  kind: typeof FIELD_ARCHIVE_KIND;
  version: typeof FIELD_ARCHIVE_VERSION;
  book: Logbook;
  tackle: { items: TackleItem[] };
  photos: CatchPhotoMap;
};

export type FieldArchiveResult = { ok: true; value: FieldArchive } | { ok: false; message: string };

function refuse(): FieldArchiveResult {
  return { ok: false, message: FIELD_ARCHIVE_REFUSAL };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanSpot(spot: Spot): Spot {
  return {
    id: spot.id,
    name: spot.name,
    waterType: spot.waterType,
    notes: spot.notes,
    bestConditions: spot.bestConditions,
    ...(spot.place ? { place: { lat: spot.place.lat, lng: spot.place.lng } } : {}),
  };
}

/** An outing with no title in the file takes its water's name, as one saved with no title does. */
function cleanTrip(trip: Trip, spots: readonly Spot[]): Trip {
  return {
    id: trip.id,
    date: trip.date,
    spotId: trip.spotId,
    title: trip.title.trim().replace(/\s+/g, " ") || spots.find((spot) => spot.id === trip.spotId)?.name || "Outing",
    note: trip.note,
    ...(trip.lost ? { lost: trip.lost } : {}),
    ...(trip.missed ? { missed: trip.missed } : {}),
  };
}

function cleanCatch(entry: CatchEntry): CatchEntry {
  const copy = (one: Measure) => (one.kind === "length" ? { kind: "length" as const, inches: one.inches } : { kind: "weight" as const, pounds: one.pounds });
  const measure = copy(entry.measure);
  return {
    id: entry.id,
    species: entry.species,
    measure,
    lure: entry.lure,
    spotId: entry.spotId,
    tripId: entry.tripId,
    // Written the way the book writes it, so newest-first (which compares the text) holds for a file's own spellings too.
    caughtAt: new Date(entry.caughtAt).toISOString(),
    note: entry.note,
    weather: entry.weather
      ? {
          sky: entry.weather.sky,
          wind: entry.weather.wind,
          ...(entry.weather.waterTempF === undefined ? {} : { waterTempF: entry.weather.waterTempF }),
        }
      : null,
    ...(entry.released ? { released: true } : {}),
    ...(entry.alsoMeasure ? { alsoMeasure: copy(entry.alsoMeasure) } : {}),
  };
}

/** Every catch time and outing day is a real date, as the book writes them: a file with "yesterday" in it would stop the pages that show it. */
function datesReadable(book: Logbook): boolean {
  return (
    book.catches.every((entry) => !Number.isNaN(Date.parse(entry.caughtAt))) &&
    book.trips.every((trip) => /^\d{4}-\d{2}-\d{2}$/.test(trip.date) && !Number.isNaN(new Date(`${trip.date}T12:00:00`).getTime()))
  );
}

/** A size the catch form or the lake could have written: more than nothing, and no bigger than the form allows. */
function sizeReadable(measure: Measure): boolean {
  return measure.kind === "length" ? measure.inches > 0 && measure.inches <= 120 : measure.pounds > 0 && measure.pounds <= 300;
}

function sizesReadable(book: Logbook): boolean {
  return book.catches.every((entry) => sizeReadable(entry.measure) && (entry.alsoMeasure === undefined || sizeReadable(entry.alsoMeasure)));
}

/** The first of each id, so a hand-edited file that repeats one can't put the same fish (or water, or outing) in twice. */
function firstOfEach<T extends { id: string }>(rows: readonly T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => !seen.has(row.id) && Boolean(seen.add(row.id)));
}

/**
 * The book as the file holds it, read the way this app writes one. Null when a fish or outing is on a water the file
 * doesn't have: the counts on every page would stop agreeing. A fish's outing that isn't in the file is dropped.
 */
function cleanBook(book: Logbook): Logbook | null {
  const spots = firstOfEach(book.spots);
  const spotIds = new Set(spots.map((spot) => spot.id));
  const trips = firstOfEach(book.trips);
  const catches = firstOfEach(book.catches);
  if (!trips.every((trip) => spotIds.has(trip.spotId)) || !catches.every((entry) => spotIds.has(entry.spotId))) return null;
  const tripIds = new Set(trips.map((trip) => trip.id));
  return {
    spots: spots.map(cleanSpot),
    trips: trips.map((trip) => cleanTrip(trip, spots)),
    catches: catches.map((entry) => cleanCatch(entry.tripId && !tripIds.has(entry.tripId) ? { ...entry, tripId: null } : entry)),
  };
}

function cleanTackle(items: TackleItem[]): TackleItem[] {
  return items.map((item) => ({
    id: item.id,
    tripId: item.tripId,
    label: item.label,
    packed: item.packed,
  }));
}

function readPhotos(value: unknown, book: Logbook): { ok: true; photos: CatchPhotoMap } | { ok: false; tooLarge: boolean } {
  if (!isRecord(value)) return { ok: false, tooLarge: false };
  const ids = new Set(book.catches.map((entry) => entry.id));
  const photos: CatchPhotoMap = {};
  for (const [id, photo] of Object.entries(value)) {
    if (!isCatchPhoto(photo)) return { ok: false, tooLarge: false };
    // A photo whose fish was taken out of the file by hand goes with it, rather than the whole file.
    if (ids.has(id)) photos[id] = photo;
  }
  if (JSON.stringify(photos).length > CATCH_PHOTO_STORE_MAX_CHARS) return { ok: false, tooLarge: true };
  return { ok: true, photos };
}

export function fieldArchiveDocument(archive: FieldArchive): FieldArchiveDocument {
  return {
    kind: FIELD_ARCHIVE_KIND,
    version: FIELD_ARCHIVE_VERSION,
    book: archive.book,
    tackle: { items: archive.tackle },
    photos: photosForBook(archive.book, archive.photos),
  };
}

/** The fish in a file that this book doesn't have yet, by id. */
export function newFishIn(here: Logbook, file: Logbook): CatchEntry[] {
  const known = new Set(here.catches.map((entry) => entry.id));
  return file.catches.filter((entry) => !known.has(entry.id));
}

/**
 * This book with the file's new fish added, and the waters, outings, tackle and photos they bring along.
 * Anything already here, matched by id, stays as it is here (but for an outing's lost and missed counts, which take the higher);
 * a water or outing deleted here comes back only when a new fish needs it.
 * Given `deletedHere`, the ids deleted in this book, the file's other waters and outings come along too (a water added
 * or an outing planned on another device), unless deleted here; without it, only what the new fish need.
 * A photo for a fish both books have joins when this book has none for it.
 * The file's photos join only while they fit the room kept for photos, so the book can still be downloaded and loaded again.
 */
export function mergeFieldArchive(here: FieldArchive, file: FieldArchive, deletedHere?: ReadonlySet<string>): FieldArchive {
  const added = newFishIn(here.book, file.book);
  const spotIds = new Set(here.book.spots.map((spot) => spot.id));
  const tripIds = new Set(here.book.trips.map((trip) => trip.id));
  const tackleIds = new Set(here.tackle.map((item) => item.id));
  const wantedTrips = new Set(added.flatMap((entry) => (entry.tripId ? [entry.tripId] : [])));
  const wanted = (id: string, needed: boolean) => needed || (deletedHere !== undefined && !deletedHere.has(id));
  const trips = file.book.trips.filter((trip) => !tripIds.has(trip.id) && wanted(trip.id, wantedTrips.has(trip.id)));
  const neededSpots = new Set([...added.map((entry) => entry.spotId), ...trips.map((trip) => trip.spotId)]);
  const newTrips = new Set(trips.map((trip) => trip.id));
  const photos = { ...here.photos };
  let size = JSON.stringify(photos).length;
  // The new fish's photos, then a photo the file has for a fish both books share and this one has none for (taken on
  // the other phone after the fish was swapped over).
  const shared = here.book.catches.filter((entry) => here.photos[entry.id] === undefined && file.photos[entry.id] !== undefined);
  for (const entry of [...added, ...shared]) {
    const photo = file.photos[entry.id];
    if (photo === undefined) continue;
    const grows = JSON.stringify(entry.id).length + JSON.stringify(photo).length + 2;
    if (size + grows > CATCH_PHOTO_STORE_MAX_CHARS) continue;
    photos[entry.id] = photo;
    size += grows;
  }
  // An outing both books have keeps the higher of each lost and missed count, so taps made on another device arrive.
  const fileTrips = new Map(file.book.trips.map((trip) => [trip.id, trip]));
  const hereTrips = here.book.trips.map((trip) => {
    const other = fileTrips.get(trip.id);
    if (!other) return trip;
    const lost = Math.max(trip.lost ?? 0, other.lost ?? 0);
    const missed = Math.max(trip.missed ?? 0, other.missed ?? 0);
    if (lost === (trip.lost ?? 0) && missed === (trip.missed ?? 0)) return trip;
    const { lost: _lost, missed: _missed, ...rest } = trip;
    return { ...rest, ...(lost ? { lost } : {}), ...(missed ? { missed } : {}) };
  });
  return {
    book: {
      spots: [...here.book.spots, ...file.book.spots.filter((spot) => !spotIds.has(spot.id) && wanted(spot.id, neededSpots.has(spot.id)))],
      trips: [...hereTrips, ...trips],
      catches: [...here.book.catches, ...added],
    },
    tackle: [...here.tackle, ...file.tackle.filter((item) => !tackleIds.has(item.id) && newTrips.has(item.tripId))],
    photos,
  };
}

export function parseFieldArchive(value: unknown): FieldArchiveResult {
  if (!isRecord(value)) return refuse();
  if (value.kind !== FIELD_ARCHIVE_KIND || value.version !== FIELD_ARCHIVE_VERSION) return refuse();
  const prepared = prepareStoredLogbook(value.book);
  if (!isLogbook(prepared) || !datesReadable(prepared) || !sizesReadable(prepared)) return refuse();
  if (!isTackleBox(value.tackle)) return refuse();
  const book = cleanBook(prepared);
  if (!book) return refuse();
  const photos = readPhotos(value.photos, book);
  if (!photos.ok) return photos.tooLarge ? { ok: false, message: FIELD_ARCHIVE_TOO_LARGE } : refuse();
  return { ok: true, value: { book, tackle: cleanTackle(value.tackle.items), photos: photos.photos } };
}

export function parseFieldArchiveText(text: string): FieldArchiveResult {
  try {
    return parseFieldArchive(JSON.parse(text) as unknown);
  } catch {
    return refuse();
  }
}
