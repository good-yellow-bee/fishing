import { isLogbook, type CatchEntry, type Logbook, type Spot, type Trip } from "./logbook.ts";
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
  };
}

function cleanTrip(trip: Trip): Trip {
  return {
    id: trip.id,
    date: trip.date,
    spotId: trip.spotId,
    title: trip.title,
    note: trip.note,
  };
}

function cleanCatch(entry: CatchEntry): CatchEntry {
  const measure =
    entry.measure.kind === "length"
      ? { kind: "length" as const, inches: entry.measure.inches }
      : { kind: "weight" as const, pounds: entry.measure.pounds };
  return {
    id: entry.id,
    species: entry.species,
    measure,
    lure: entry.lure,
    spotId: entry.spotId,
    tripId: entry.tripId,
    caughtAt: entry.caughtAt,
    note: entry.note,
    weather: entry.weather
      ? { sky: entry.weather.sky, wind: entry.weather.wind, waterTempF: entry.weather.waterTempF }
      : null,
  };
}

function cleanBook(book: Logbook): Logbook {
  return {
    spots: book.spots.map(cleanSpot),
    trips: book.trips.map(cleanTrip),
    catches: book.catches.map(cleanCatch),
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
    if (!ids.has(id) || !isCatchPhoto(photo)) return { ok: false, tooLarge: false };
    photos[id] = photo;
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

export function parseFieldArchive(value: unknown): FieldArchiveResult {
  if (!isRecord(value)) return refuse();
  if (value.kind !== FIELD_ARCHIVE_KIND || value.version !== FIELD_ARCHIVE_VERSION) return refuse();
  const prepared = prepareStoredLogbook(value.book);
  if (!isLogbook(prepared)) return refuse();
  if (!isTackleBox(value.tackle)) return refuse();
  const book = cleanBook(prepared);
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
