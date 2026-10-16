import { catchPhotoRejection, keepLandedCatch, measureOf, putCatchPhoto, withoutCatchPhoto, type CatchPhotoMap, type LandedFish, type Logbook } from "@stillwater/shared";
import { readStoredPhotos, savePhotos } from "./photoStore";
import { keepBookStorage } from "./keepStorage";
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
  void keepBookStorage();
}

/** A fish let go from the game's catch card is marked released in the book too, if it is there. */
export function markReleasedInBook(id: string) {
  const book = readStoredLogbook();
  if (!book || !book.catches.some((entry) => entry.id === id && !entry.released)) return;
  saveLogbook({ ...book, catches: book.catches.map((entry) => (entry.id === id ? { ...entry, released: true } : entry)) });
}

/** The game's own snapshots, oldest first, so the oldest can make room for a new one. */
export const AUTO_PHOTO_STORAGE_KEY = "stillwater.field-log.auto-photos.v1";

/** A snapshot is known by its catch and the end of its data, so a photo the player put there since is never taken. */
type AutoPhoto = { id: string; tail: string };

const tailOf = (photo: string) => photo.slice(-32);

function readAutoPhotos(): AutoPhoto[] {
  try {
    const raw = JSON.parse(localStorage.getItem(AUTO_PHOTO_STORAGE_KEY) ?? "[]") as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.filter((entry): entry is AutoPhoto => typeof entry?.id === "string" && typeof entry?.tail === "string");
  } catch {
    return [];
  }
}

function writeAutoPhotos(list: AutoPhoto[]) {
  try {
    localStorage.setItem(AUTO_PHOTO_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // The list only helps make room later; the photo itself is already kept.
  }
}

/**
 * The game's snapshots that may go to make room, oldest first: still the
 * game's own picture, not the new catch, and not the heaviest of its species.
 */
export function spareSnapshots(book: Logbook, photos: CatchPhotoMap, auto: readonly AutoPhoto[], keep: string): string[] {
  const heaviest = new Map<string, { id: string; pounds: number }>();
  for (const entry of book.catches) {
    const weight = measureOf(entry, "weight");
    if (weight?.kind !== "weight") continue;
    const best = heaviest.get(entry.species);
    if (!best || weight.pounds > best.pounds) heaviest.set(entry.species, { id: entry.id, pounds: weight.pounds });
  }
  const bests = new Set([...heaviest.values()].map((best) => best.id));
  return auto
    .filter((shot) => shot.id !== keep && !bests.has(shot.id) && photos[shot.id] !== undefined && tailOf(photos[shot.id]!) === shot.tail)
    .map((shot) => shot.id);
}

/**
 * Pin the scene's snapshot to a catch already in the book. A photo the player
 * chose themselves is never replaced. When the browser is full, the game's
 * oldest snapshots make room, but never a personal best or the player's own
 * photo. Throws when the photo still won't fit.
 */
export function saveLandedPhoto(id: string, photo: string) {
  const book = readStoredLogbook();
  if (!book?.catches.some((entry) => entry.id === id)) return false;
  let photos = readStoredPhotos();
  if (photos[id]) return false;
  const auto = readAutoPhotos().filter((shot) => photos[shot.id] !== undefined);
  const spare = spareSnapshots(book, photos, auto, id);
  const problem = catchPhotoRejection(photo);
  if (problem) throw new Error(problem);
  for (;;) {
    const put = putCatchPhoto(photos, id, photo);
    if (!put.ok) {
      // The photo store is at its own limit before the browser's: the oldest snapshot makes room the same way.
      const oldest = spare.shift();
      if (oldest === undefined) throw new Error(put.message);
      photos = withoutCatchPhoto(photos, oldest);
      continue;
    }
    try {
      savePhotos(put.photos);
      photos = put.photos;
      break;
    } catch (error) {
      const oldest = spare.shift();
      if (oldest === undefined) throw error;
      photos = withoutCatchPhoto(photos, oldest);
    }
  }
  writeAutoPhotos([...auto.filter((shot) => photos[shot.id] !== undefined), { id, tail: tailOf(photo) }]);
  return true;
}
