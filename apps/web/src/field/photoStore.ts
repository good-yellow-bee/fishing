import { catchPhotoWriteBlocked, catchPhotosFromUnknown, type CatchPhotoMap } from "@stillwater/shared";

export const PHOTO_STORAGE_KEY = "stillwater.field-log.photos.v1";

export function readStoredPhotos(): CatchPhotoMap {
  try {
    const raw = localStorage.getItem(PHOTO_STORAGE_KEY);
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
  const previous = localStorage.getItem(PHOTO_STORAGE_KEY);
  const previousChars = previous === null ? 0 : PHOTO_STORAGE_KEY.length + previous.length;
  const nextChars = PHOTO_STORAGE_KEY.length + json.length;
  if (nextChars > previousChars && catchPhotoWriteBlocked(storageChars(), previousChars, nextChars)) {
    throw new Error("That photo does not fit alongside the book, so the change was not saved.");
  }
  try {
    localStorage.setItem(PHOTO_STORAGE_KEY, json);
  } catch (error) {
    if (previous !== null) {
      try {
        localStorage.setItem(PHOTO_STORAGE_KEY, previous);
      } catch {
        throw error;
      }
    }
    throw error;
  }
}
