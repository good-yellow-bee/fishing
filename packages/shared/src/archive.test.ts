import { describe, expect, it } from "vitest";
import {
  FIELD_ARCHIVE_REFUSAL,
  FIELD_ARCHIVE_TOO_LARGE,
  fieldArchiveDocument,
  parseFieldArchive,
  parseFieldArchiveText,
} from "./archive.ts";
import { CATCH_PHOTO_STORE_MAX_CHARS } from "./photo.ts";
import { sampleLogbook, type CatchEntry, type Logbook } from "./logbook.ts";
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
    expect(parseFieldArchive({ ...document, photos: { "missing-fish": jpeg } })).toMatchObject({ ok: false });
    expect(parseFieldArchive({ ...document, photos: [] })).toMatchObject({ ok: false });
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
