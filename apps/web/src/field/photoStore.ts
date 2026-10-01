import { catchPhotosFromUnknown, type CatchPhotoMap } from "@stillwater/shared";

const KEY = "stillwater.field-log.photos.v1";
const ASSUMED_QUOTA = 5_000_000;
const BOOK_HEADROOM = 1_000_000;

export function readStoredPhotos(): CatchPhotoMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return catchPhotosFromUnknown(JSON.parse(raw) as unknown);
  } catch {
    return {};
  }
}

function storageChars(): number {
  let total = 0;
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i) ?? "";
    total += key.length + (localStorage.getItem(key)?.length ?? 0);
  }
  return total;
}

export function savePhotos(photos: CatchPhotoMap) {
  const json = JSON.stringify(photos);
  const previous = localStorage.getItem(KEY);
  const previousChars = previous === null ? 0 : KEY.length + previous.length;
  if (storageChars() - previousChars + KEY.length + json.length + BOOK_HEADROOM > ASSUMED_QUOTA) {
    throw new Error("That photo does not fit alongside the book, so the change was not saved.");
  }
  try {
    localStorage.setItem(KEY, json);
  } catch (error) {
    if (previous !== null) {
      try {
        localStorage.setItem(KEY, previous);
      } catch {
        throw error;
      }
    }
    throw error;
  }
}
