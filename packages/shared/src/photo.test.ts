import { describe, expect, it } from "vitest";
import { isLogbook, replaceCatch, sampleLogbook, withoutCatch, withoutSpot } from "./logbook.ts";
import {
  CATCH_PHOTO_BOOK_HEADROOM_CHARS,
  CATCH_PHOTO_MAX_BYTES,
  CATCH_PHOTO_QUOTA_CHARS,
  CATCH_PHOTO_STORE_MAX_CHARS,
  catchPhotoRejection,
  catchPhotoWriteBlocked,
  catchPhotosFromUnknown,
  photosForBook,
  putCatchPhoto,
  withoutCatchPhoto,
  type CatchPhotoMap,
} from "./photo.ts";

const now = new Date(2026, 9, 1, 8, 30, 0);
const jpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2w==";

describe("catch photos", () => {
  it("accepts a short jpeg and rejects other files", () => {
    expect(catchPhotoRejection(jpeg)).toBeNull();
    expect(catchPhotoRejection("data:text/plain;base64,AAAA")).toMatch(/JPEG, PNG, or WebP/);
    expect(catchPhotoRejection("data:image/gif;base64,AAAA")).toMatch(/JPEG, PNG, or WebP/);
  });

  it("rejects a photo that is still too large", () => {
    const body = "A".repeat(Math.ceil((CATCH_PHOTO_MAX_BYTES + 4) * 4 / 3));
    const huge = `data:image/jpeg;base64,${body}`;
    expect(catchPhotoRejection(huge)).toMatch(/130 KB/);
  });

  it("drops a bad stored photo and keeps a valid one", () => {
    const photos = catchPhotosFromUnknown({
      "catch-gill": jpeg,
      "catch-bad": "not-a-photo",
      "": jpeg,
    });
    expect(photos).toEqual({ "catch-gill": jpeg });
  });

  it("keeps a photo when the catch is edited and drops it when the catch is deleted", () => {
    const book = sampleLogbook(now);
    const put = putCatchPhoto({}, "catch-gill", jpeg);
    expect(put.ok).toBe(true);
    if (!put.ok) return;

    const entry = book.catches.find((row) => row.id === "catch-gill");
    expect(entry).toBeTruthy();
    if (!entry) return;
    const edited = replaceCatch(book, { ...entry, note: "Same fish, new note." });
    expect(photosForBook(edited, put.photos)["catch-gill"]).toBe(jpeg);

    const deleted = withoutCatch(book, "catch-gill");
    expect(photosForBook(deleted, put.photos)["catch-gill"]).toBeUndefined();
    expect(withoutCatchPhoto(put.photos, "catch-gill")["catch-gill"]).toBeUndefined();
  });

  it("drops photos for fish removed with their water", () => {
    const book = sampleLogbook(now);
    const first = putCatchPhoto({}, "catch-gill", jpeg);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = putCatchPhoto(first.photos, "catch-perch", jpeg);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const next = photosForBook(withoutSpot(book, "spot-duck"), second.photos);
    expect(next["catch-gill"]).toBeUndefined();
    expect(next["catch-perch"]).toBeUndefined();
  });

  it("turns away a photo that would crowd out the book", () => {
    const chunk = `data:image/jpeg;base64,${"A".repeat(120_000)}`;
    let photos: CatchPhotoMap = {};
    let refused = false;
    for (let i = 0; i < 400; i += 1) {
      const put = putCatchPhoto(photos, `id-${i}`, chunk);
      if (!put.ok) {
        expect(put.message).toMatch(/as many photos/);
        expect(JSON.stringify(photos).length).toBeLessThanOrEqual(CATCH_PHOTO_STORE_MAX_CHARS);
        refused = true;
        break;
      }
      photos = put.photos;
    }
    expect(refused).toBe(true);
  });

  it("still loads a book saved before photos existed", () => {
    const book = sampleLogbook(now);
    const stored: unknown = JSON.parse(JSON.stringify(book));
    expect(isLogbook(stored)).toBe(true);
    if (!isLogbook(stored)) return;
    expect(stored.catches).toHaveLength(book.catches.length);
    expect(photosForBook(stored, catchPhotosFromUnknown(undefined))).toEqual({});
    expect(stored.catches.map((entry) => entry.id)).toEqual(book.catches.map((entry) => entry.id));
  });

  it("allows a smaller photo store when headroom would block a shrink", () => {
    const used = 4_500_000;
    const previous = 3_000_000;
    const next = 2_700_000;
    expect(used - previous + next + CATCH_PHOTO_BOOK_HEADROOM_CHARS).toBeGreaterThan(CATCH_PHOTO_QUOTA_CHARS);
    expect(catchPhotoWriteBlocked(used, previous, next)).toBe(false);
    expect(catchPhotoWriteBlocked(4_900_000, 200_000, 200_000)).toBe(false);
  });

  it("still turns away a larger photo that would crowd out the book", () => {
    expect(catchPhotoWriteBlocked(4_500_000, 100_000, 500_000)).toBe(true);
    expect(catchPhotoWriteBlocked(1_000_000, 100_000, 200_000)).toBe(false);
  });
});
