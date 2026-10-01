export const CATCH_PHOTO_MAX_BYTES = 130 * 1024;

export const CATCH_PHOTO_STORE_MAX_CHARS = 3_000_000;

export const CATCH_PHOTO_QUOTA_CHARS = 5_000_000;

export const CATCH_PHOTO_BOOK_HEADROOM_CHARS = 1_000_000;

export type CatchPhotoMap = Record<string, string>;

const PHOTO_URL = /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/]+={0,2}$/i;

export function catchPhotoBytes(photo: string): number {
  const comma = photo.indexOf(",");
  if (comma < 0) return Number.POSITIVE_INFINITY;
  const body = photo.slice(comma + 1);
  const padding = body.endsWith("==") ? 2 : body.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((body.length * 3) / 4) - padding);
}

export function isCatchPhoto(value: unknown): value is string {
  return typeof value === "string" && catchPhotoBytes(value) <= CATCH_PHOTO_MAX_BYTES && PHOTO_URL.test(value);
}

export function catchPhotoRejection(photo: string): string | null {
  const limit = CATCH_PHOTO_MAX_BYTES / 1024;
  if (catchPhotoBytes(photo) > CATCH_PHOTO_MAX_BYTES) {
    return `That photo is still over ${limit} KB after it is reduced, so it was not saved.`;
  }
  if (!isCatchPhoto(photo)) return "Choose a JPEG, PNG, or WebP photo.";
  return null;
}

export function catchPhotosFromUnknown(value: unknown): CatchPhotoMap {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const photos: CatchPhotoMap = {};
  for (const [id, photo] of Object.entries(value)) {
    if (id.length > 0 && isCatchPhoto(photo)) photos[id] = photo;
  }
  return photos;
}

export function photosForBook(book: { catches: { id: string }[] }, photos: CatchPhotoMap): CatchPhotoMap {
  const ids = new Set(book.catches.map((entry) => entry.id));
  for (const id of Object.keys(photos)) {
    if (!ids.has(id)) {
      const next: CatchPhotoMap = {};
      for (const [keptId, photo] of Object.entries(photos)) {
        if (ids.has(keptId)) next[keptId] = photo;
      }
      return next;
    }
  }
  return photos;
}

export function putCatchPhoto(
  photos: CatchPhotoMap,
  id: string,
  photo: string,
): { ok: true; photos: CatchPhotoMap } | { ok: false; message: string } {
  if (!id) return { ok: false, message: "That catch is not in this book." };
  const problem = catchPhotoRejection(photo);
  if (problem) return { ok: false, message: problem };
  if (photos[id] === photo) return { ok: true, photos };
  const next = { ...photos, [id]: photo };
  if (JSON.stringify(next).length > CATCH_PHOTO_STORE_MAX_CHARS) {
    return {
      ok: false,
      message: "The book already holds as many photos as this browser should keep.",
    };
  }
  return { ok: true, photos: next };
}

export function withoutCatchPhoto(photos: CatchPhotoMap, id: string): CatchPhotoMap {
  if (!(id in photos)) return photos;
  const next = { ...photos };
  delete next[id];
  return next;
}

export function catchPhotoWriteBlocked(usedChars: number, previousChars: number, nextChars: number): boolean {
  if (nextChars <= previousChars) return false;
  return usedChars - previousChars + nextChars + CATCH_PHOTO_BOOK_HEADROOM_CHARS > CATCH_PHOTO_QUOTA_CHARS;
}
