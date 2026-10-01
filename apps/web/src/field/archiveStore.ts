import type { FieldArchive } from "@stillwater/shared";
import { TACKLE_STORAGE_KEY, saveTackle } from "./gear/storage";
import { PHOTO_STORAGE_KEY, savePhotos } from "./photoStore";
import { LOGBOOK_STORAGE_KEY, saveLogbook } from "./storage";

const FIT_REFUSAL = "That file does not fit in this browser, so this book was left as it is.";

function restore(key: string, raw: string | null) {
  try {
    if (raw === null) localStorage.removeItem(key);
    else localStorage.setItem(key, raw);
  } catch {
    // The previous value could not be put back. The other keys still get a try.
  }
}

export function commitFieldArchive(archive: FieldArchive): { ok: true } | { ok: false; message: string } {
  const previous = {
    book: localStorage.getItem(LOGBOOK_STORAGE_KEY),
    photos: localStorage.getItem(PHOTO_STORAGE_KEY),
    tackle: localStorage.getItem(TACKLE_STORAGE_KEY),
  };
  try {
    saveLogbook(archive.book);
    saveTackle(archive.tackle);
    savePhotos(archive.photos);
    return { ok: true };
  } catch {
    // Last write first, so a value that filled the quota moves before the book grows back.
    restore(PHOTO_STORAGE_KEY, previous.photos);
    restore(TACKLE_STORAGE_KEY, previous.tackle);
    restore(LOGBOOK_STORAGE_KEY, previous.book);
    return { ok: false, message: FIT_REFUSAL };
  }
}
