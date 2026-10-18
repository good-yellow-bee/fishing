import { describe, expect, it } from "vitest";
import {
  FIELD_ARCHIVE_REFUSAL,
  FIELD_ARCHIVE_TOO_LARGE,
  fieldArchiveDocument,
  parseFieldArchive,
  mergeFieldArchive,
  newFishIn,
  parseFieldArchiveText,
} from "./archive.ts";
import { CATCH_PHOTO_STORE_MAX_CHARS } from "./photo.ts";
import { isLogbook, sampleLogbook, type CatchEntry, type Logbook } from "./logbook.ts";
import { sampleTackle, withPacked } from "./tackle.ts";

const now = new Date(2026, 9, 1, 8, 30, 0);
const jpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2w==";

function archiveFor(book: Logbook, photoId: string | null = "catch-gill") {
  const tackle = withPacked(sampleTackle(), "gear-dawn-spinner", true);
  const photos = photoId ? { [photoId]: jpeg } : {};
  return { book, tackle, photos };
}

describe("field archive", () => {
  const book = sampleLogbook(now);

  it("round-trips the book, a tackle check, the weather, and a photo", () => {
    const archive = archiveFor(book);
    const parsed = parseFieldArchive(fieldArchiveDocument(archive));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.book.catches.map((entry) => entry.id)).toEqual(book.catches.map((entry) => entry.id));
    expect(parsed.value.book.spots).toEqual(book.spots);
    expect(parsed.value.book.trips).toEqual(book.trips);
    const gill = parsed.value.book.catches.find((entry) => entry.id === "catch-gill");
    expect(gill?.weather).toEqual(book.catches.find((entry) => entry.id === "catch-gill")?.weather);
    expect(parsed.value.tackle.find((item) => item.id === "gear-dawn-spinner")?.packed).toBe(true);
    expect(parsed.value.photos["catch-gill"]).toBe(jpeg);
  });

  it("names an outing with no title after its water", () => {
    const untitled = { ...book, trips: book.trips.map((trip, index) => (index === 0 ? { ...trip, title: " " } : trip)) };
    const parsed = parseFieldArchive(fieldArchiveDocument(archiveFor(untitled)));
    const first = book.trips[0]!;
    expect(parsed.ok && parsed.value.book.trips[0]!.title).toBe(book.spots.find((spot) => spot.id === first.spotId)!.name);
  });

  it("keeps a released mark through the file", () => {
    const marked = { ...book, catches: book.catches.map((entry) => (entry.id === "catch-gill" ? { ...entry, released: true } : entry)) };
    const parsed = parseFieldArchive(fieldArchiveDocument(archiveFor(marked)));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.book.catches.find((entry) => entry.id === "catch-gill")?.released).toBe(true);
    expect(parsed.value.book.catches.filter((entry) => "released" in entry)).toHaveLength(1);
  });

  it("keeps photos beside the book in the file", () => {
    const document = fieldArchiveDocument(archiveFor(book));
    expect(document.photos["catch-gill"]).toBe(jpeg);
    expect(JSON.stringify(document.book)).not.toContain("data:image");
    expect(Object.keys(document).sort()).toEqual(["book", "kind", "photos", "tackle", "version"]);
    const withOrphan = fieldArchiveDocument({
      book,
      tackle: [],
      photos: { "catch-gill": jpeg, "gone-fish": jpeg },
    });
    expect(withOrphan.photos).toEqual({ "catch-gill": jpeg });
  });

  it("drops a photo stuffed onto a catch and keeps the photo map", () => {
    const dirty = structuredClone(book) as unknown as { catches: Array<Record<string, unknown>> };
    const target = dirty.catches.find((entry) => entry.id === "catch-gill");
    expect(target).toBeTruthy();
    if (!target) return;
    target.photo = jpeg;
    const parsed = parseFieldArchive({
      kind: "stillwater-field-log",
      version: 1,
      book: dirty,
      tackle: { items: [] },
      photos: { "catch-gill": jpeg },
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(JSON.stringify(parsed.value.book)).not.toContain("data:image");
    expect(parsed.value.photos["catch-gill"]).toBe(jpeg);
  });

  it("refuses a file that is not this book", () => {
    const document = fieldArchiveDocument(archiveFor(book));
    expect(parseFieldArchiveText("not json")).toMatchObject({ ok: false, message: FIELD_ARCHIVE_REFUSAL });
    expect(parseFieldArchive(document.book)).toMatchObject({ ok: false, message: FIELD_ARCHIVE_REFUSAL });
    expect(parseFieldArchive({ ...document, kind: "stillwater" })).toMatchObject({ ok: false });
    expect(parseFieldArchive({ ...document, version: 2 })).toMatchObject({ ok: false });
    expect(parseFieldArchive({ ...document, book: { spots: [], trips: [], catches: [{ id: "x" }] } })).toMatchObject({
      ok: false,
    });
    expect(parseFieldArchive({ ...document, tackle: { items: [{ id: "x" }] } })).toMatchObject({ ok: false });
    expect(parseFieldArchive({ ...document, photos: { "catch-gill": "data:image/gif;base64,AAAA" } })).toMatchObject({
      ok: false,
      message: FIELD_ARCHIVE_REFUSAL,
    });
    expect(parseFieldArchive({ ...document, photos: [] })).toMatchObject({ ok: false });
  });

  it("drops a photo whose fish isn't in the file, and keeps the file", () => {
    const document = fieldArchiveDocument(archiveFor(book));
    const parsed = parseFieldArchive({ ...document, photos: { ...document.photos, "missing-fish": jpeg } });
    expect(parsed.ok && Object.keys(parsed.value.photos)).toEqual(["catch-gill"]);
  });

  it("keeps the first of a repeated id, drops an outing that isn't there, and refuses a fish on a missing water", () => {
    const document = fieldArchiveDocument(archiveFor(book, null));
    const [first, ...rest] = document.book.catches;
    const twice = parseFieldArchive({ ...document, book: { ...document.book, catches: [first, { ...first!, note: "copy" }, ...rest] } });
    expect(twice.ok && twice.value.book.catches.filter((entry) => entry.id === first!.id).map((entry) => entry.note)).toEqual([first!.note]);
    const ghostTrip = parseFieldArchive({ ...document, book: { ...document.book, catches: [{ ...first!, tripId: "nowhere" }, ...rest] } });
    expect(ghostTrip.ok && ghostTrip.value.book.catches[0]!.tripId).toBeNull();
    expect(parseFieldArchive({ ...document, book: { ...document.book, catches: [{ ...first!, spotId: "nowhere" }, ...rest] } })).toMatchObject({ ok: false });
    expect(parseFieldArchive({ ...document, book: { ...document.book, trips: document.book.trips.map((trip, i) => (i === 0 ? { ...trip, spotId: "nowhere" } : trip)) } })).toMatchObject({ ok: false });
  });

  it("refuses a file whose catch time or outing day isn't a date", () => {
    const document = fieldArchiveDocument(archiveFor(book, null));
    const badCatch = { ...document.book, catches: document.book.catches.map((entry, i) => (i === 0 ? { ...entry, caughtAt: "yesterday" } : entry)) };
    const badTrip = { ...document.book, trips: document.book.trips.map((trip, i) => (i === 0 ? { ...trip, date: "soon" } : trip)) };
    expect(parseFieldArchive({ ...document, book: badCatch })).toMatchObject({ ok: false, message: FIELD_ARCHIVE_REFUSAL });
    expect(parseFieldArchive({ ...document, book: badTrip })).toMatchObject({ ok: false, message: FIELD_ARCHIVE_REFUSAL });
  });

  it("adds only the file's new fish, with the waters, outings and photos they need", () => {
    const here = archiveFor({ ...book, spots: book.spots.slice(1), trips: [], catches: book.catches.slice(0, 2) }, null);
    const changed = { ...book.catches[0]!, note: "Edited in the file" };
    const file = archiveFor({ ...book, catches: [changed, ...book.catches.slice(1)] }, book.catches[3]!.id);
    expect(newFishIn(here.book, file.book)).toHaveLength(book.catches.length - 2);
    const merged = mergeFieldArchive(here, file);
    expect(merged.book.catches).toHaveLength(book.catches.length);
    expect(merged.book.catches[0]!.note).toBe(book.catches[0]!.note);
    const added = book.catches.slice(2);
    const neededTrips = new Set(added.flatMap((entry) => (entry.tripId ? [entry.tripId] : [])));
    expect(merged.book.trips.map((trip) => trip.id).sort()).toEqual([...neededTrips].sort());
    expect(merged.book.spots.map((spot) => spot.id).sort()).toEqual(
      [...new Set([...book.spots.slice(1).map((spot) => spot.id), ...added.map((entry) => entry.spotId), ...book.trips.filter((trip) => neededTrips.has(trip.id)).map((trip) => trip.spotId)])].sort(),
    );
    expect(merged.photos[book.catches[3]!.id]).toBe(jpeg);
    expect(merged.tackle).toEqual(here.tackle);
    expect(isLogbook(merged.book)).toBe(true);
  });

  it("brings a photo for a fish both books have when this one has none", () => {
    const here = archiveFor(book, null);
    const file = archiveFor(book, "catch-gill");
    expect(mergeFieldArchive(here, file).photos["catch-gill"]).toBe(jpeg);
    const other = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wA=";
    expect(mergeFieldArchive({ ...here, photos: { "catch-gill": other } }, file).photos["catch-gill"]).toBe(other);
  });

  it("leaves out a photo taken off a fish here on purpose", () => {
    const here = archiveFor(book, null);
    const file = archiveFor(book, "catch-gill");
    expect(mergeFieldArchive(here, file, undefined, new Set(["catch-gill"])).photos["catch-gill"]).toBeUndefined();
  });

  it("doesn't bring back a water or outing no new fish needs", () => {
    const empty = { id: "spot-empty", name: "Gone Pond", waterType: "pond" as const, notes: "", bestConditions: "" };
    const file = archiveFor({ ...book, spots: [...book.spots, empty], trips: [...book.trips, { id: "trip-empty", date: "2026-09-01", spotId: "spot-empty", title: "Empty", note: "" }] }, null);
    const merged = mergeFieldArchive(archiveFor(book, null), file);
    expect(merged.book.spots.some((spot) => spot.id === "spot-empty")).toBe(false);
    expect(merged.book.trips.some((trip) => trip.id === "trip-empty")).toBe(false);
  });

  it("given what was deleted here, brings the file's other waters and outings, but not those", () => {
    const pond = { id: "spot-new", name: "New Pond", waterType: "pond" as const, notes: "", bestConditions: "" };
    const gone = { id: "spot-gone", name: "Gone Pond", waterType: "pond" as const, notes: "", bestConditions: "" };
    const planned = { id: "trip-planned", date: "2026-11-01", spotId: "spot-new", title: "Planned", note: "" };
    const goneTrip = { id: "trip-gone", date: "2026-11-02", spotId: book.spots[0]!.id, title: "Gone", note: "" };
    const file = archiveFor({ ...book, spots: [...book.spots, pond, gone], trips: [...book.trips, planned, goneTrip] }, null);
    const merged = mergeFieldArchive(archiveFor(book, null), file, new Set(["spot-gone", "trip-gone"]));
    expect(merged.book.spots.slice(book.spots.length).map((spot) => spot.id)).toEqual(["spot-new"]);
    expect(merged.book.trips.slice(book.trips.length).map((trip) => trip.id)).toEqual(["trip-planned"]);
    expect(isLogbook(merged.book)).toBe(true);
  });

  it("keeps the higher lost and missed count on an outing both books have", () => {
    const tripId = book.trips[0]!.id;
    const withCounts = (lost: number, missed: number) => ({ ...book, trips: book.trips.map((trip) => (trip.id === tripId ? { ...trip, ...(lost ? { lost } : {}), ...(missed ? { missed } : {}) } : trip)) });
    const merged = mergeFieldArchive(archiveFor(withCounts(1, 3), null), archiveFor(withCounts(2, 0), null));
    const trip = merged.book.trips.find((each) => each.id === tripId)!;
    expect([trip.lost, trip.missed]).toEqual([2, 3]);
    expect(isLogbook(merged.book)).toBe(true);
  });

  it("leaves out the file's photos once the room for photos is full", () => {
    const big = `data:image/jpeg;base64,${"A".repeat(CATCH_PHOTO_STORE_MAX_CHARS - 60)}`;
    const here = { ...archiveFor({ ...book, catches: book.catches.slice(0, 1) }, null), photos: { [book.catches[0]!.id]: big } };
    const file = archiveFor(book, book.catches[3]!.id);
    const merged = mergeFieldArchive(here, file);
    expect(merged.book.catches).toHaveLength(book.catches.length);
    expect(merged.photos[book.catches[3]!.id]).toBeUndefined();
    expect(JSON.stringify(merged.photos).length).toBeLessThanOrEqual(CATCH_PHOTO_STORE_MAX_CHARS);
  });

  it("keeps a water's place through the file", () => {
    const placed = { ...book, spots: book.spots.map((spot, i) => (i === 0 ? { ...spot, place: { lat: 46.85, lng: -94.24 } } : spot)) };
    const parsed = parseFieldArchiveText(JSON.stringify(fieldArchiveDocument(archiveFor(placed, null))));
    expect(parsed.ok && parsed.value.book.spots[0]!.place).toEqual({ lat: 46.85, lng: -94.24 });
    expect(parsed.ok && "place" in parsed.value.book.spots[1]!).toBe(false);
  });

  it("refuses a file with a size no fish could have", () => {
    const document = fieldArchiveDocument(archiveFor(book, null));
    const sized = (patch: Partial<CatchEntry>) => ({
      ...document,
      book: { ...document.book, catches: document.book.catches.map((entry, i) => (i === 0 ? { ...entry, ...patch } : entry)) },
    });
    expect(parseFieldArchive(sized({ measure: { kind: "weight", pounds: -2 } }))).toMatchObject({ ok: false });
    expect(parseFieldArchive(sized({ measure: { kind: "length", inches: 5000 } }))).toMatchObject({ ok: false });
    expect(parseFieldArchive(sized({ measure: { kind: "weight", pounds: 2 }, alsoMeasure: { kind: "length", inches: 0 } }))).toMatchObject({ ok: false });
    expect(parseFieldArchive(sized({ measure: { kind: "weight", pounds: 300 }, alsoMeasure: { kind: "length", inches: 120 } }))).toMatchObject({ ok: true });
    expect(parseFieldArchive(sized({ measure: { kind: "weight", pounds: 301 } }))).toMatchObject({ ok: false });
  });

  it("writes a file's catch times the way the book does, so newest first holds", () => {
    const document = fieldArchiveDocument(archiveFor(book, null));
    const stamps = ["October 1, 2020", "2026-10-14T23:30:00-05:00", "2026-10-15T01:00:00.000Z"];
    const catches = document.book.catches.slice(0, 3).map((entry, i) => ({ ...entry, caughtAt: stamps[i]! }));
    const parsed = parseFieldArchive({ ...document, book: { ...document.book, catches } });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const times = parsed.value.book.catches.map((entry) => entry.caughtAt);
    expect(times[1]).toBe("2026-10-15T04:30:00.000Z");
    expect(times[2]).toBe("2026-10-15T01:00:00.000Z");
    expect(times.every((time) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(time))).toBe(true);
  });

  it("accepts an empty book", () => {
    const parsed = parseFieldArchive({
      kind: "stillwater-field-log",
      version: 1,
      book: { spots: [], trips: [], catches: [] },
      tackle: { items: [] },
      photos: {},
    });
    expect(parsed).toEqual({ ok: true, value: { book: { spots: [], trips: [], catches: [] }, tackle: [], photos: {} } });
  });

  it("refuses a photo map that would crowd out the book", () => {
    const chunk = `data:image/jpeg;base64,${"A".repeat(120_000)}`;
    const base = book.catches[0];
    expect(base).toBeTruthy();
    if (!base) return;
    const catches: CatchEntry[] = [];
    const photos: Record<string, string> = {};
    for (let i = 0; i < 30; i += 1) {
      const id = `bulk-${i}`;
      catches.push({ ...base, id });
      photos[id] = chunk;
    }
    const parsed = parseFieldArchive({
      kind: "stillwater-field-log",
      version: 1,
      book: { spots: book.spots, trips: book.trips, catches },
      tackle: { items: [] },
      photos,
    });
    expect(JSON.stringify(photos).length).toBeGreaterThan(CATCH_PHOTO_STORE_MAX_CHARS);
    expect(parsed).toMatchObject({ ok: false, message: FIELD_ARCHIVE_TOO_LARGE });
  });
});
