import { keepLandedCatch, putCatchPhoto, type LandedFish, type Logbook } from "@stillwater/shared";
import { readStoredPhotos, savePhotos } from "./photoStore";
import { readStoredLogbook, saveLogbook } from "./storage";

/**
 * The book the game writes into. A browser with no field log yet starts an
 * empty one, so made-up sample fish never mix with the first real catch.
 */
export function bookForPlay(): Logbook {
  return readStoredLogbook() ?? { spots: [], trips: [], catches: [] };
}

export function saveLandedCatch(landed: LandedFish) {
  const book = bookForPlay();
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
