import { keepLandedCatch, putCatchPhoto, sampleLogbook, type LandedFish } from "@stillwater/shared";
import { readStoredPhotos, savePhotos } from "./photoStore";
import { readStoredLogbook, saveLogbook } from "./storage";

export function saveLandedCatch(landed: LandedFish) {
  const book = readStoredLogbook() ?? sampleLogbook(new Date());
  saveLogbook(keepLandedCatch(book, landed));
}

/**
 * Pin the scene's snapshot to a catch already in the book. A photo the player
 * chose themselves is never replaced. Throws when the photo won't fit.
 */
export function saveLandedPhoto(id: string, photo: string) {
  const book = readStoredLogbook();
  if (!book?.catches.some((entry) => entry.id === id)) return false;
  const photos = readStoredPhotos();
  if (photos[id]) return false;
  const put = putCatchPhoto(photos, id, photo);
  if (!put.ok) throw new Error(put.message);
  savePhotos(put.photos);
  return true;
}
