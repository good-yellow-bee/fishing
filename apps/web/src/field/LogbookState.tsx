import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { localId as newId } from "../game/localId";
import {
  parseCatchDraft,
  parseSpotDraft,
  parseTripDraft,
  photosForBook,
  putCatchPhoto,
  replaceCatch,
  replaceSpot,
  replaceTrip,
  sampleLogbook,
  withCatch,
  withSpot,
  withTrip,
  withoutCatch,
  withoutCatchPhoto,
  withoutSpot,
  withoutTrip,
  type CatchDraft,
  type CatchPhotoMap,
  type Logbook,
  type SpotDraft,
  type TripDraft,
} from "@stillwater/shared";
import { readStoredPhotos, savePhotos } from "./photoStore";
import { readStoredLogbook, saveLogbook } from "./storage";

type SaveResult = { ok: true; id: string } | { ok: false; message: string };

type LogbookApi = {
  book: Logbook;
  photoFor: (id: string) => string | null;
  addCatch: (draft: CatchDraft, photo: string | null) => SaveResult;
  addSpot: (draft: SpotDraft) => SaveResult;
  addTrip: (draft: TripDraft) => SaveResult;
  updateCatch: (id: string, draft: CatchDraft, photo: string | null) => SaveResult;
  updateSpot: (id: string, draft: SpotDraft) => SaveResult;
  updateTrip: (id: string, draft: TripDraft) => SaveResult;
  deleteCatch: (id: string) => void;
  deleteSpot: (id: string) => void;
  deleteTrip: (id: string) => void;
  restoreSample: () => void;
  photos: CatchPhotoMap;
  replaceBook: (book: Logbook, photos: CatchPhotoMap) => void;
};

const LogbookContext = createContext<LogbookApi | null>(null);

export function LogbookProvider({ children }: { children: ReactNode }) {
  const [book, setBook] = useState<Logbook>(() => {
    const stored = readStoredLogbook();
    if (stored) return stored;
    const seeded = sampleLogbook(new Date());
    saveLogbook(seeded);
    return seeded;
  });
  const [photos, setPhotos] = useState<CatchPhotoMap>(() => {
    const storedBook = readStoredLogbook() ?? { catches: [] };
    const storedPhotos = readStoredPhotos();
    const pruned = photosForBook(storedBook, storedPhotos);
    if (pruned !== storedPhotos) {
      try {
        savePhotos(pruned);
      } catch {
        return pruned;
      }
    }
    return pruned;
  });

  const api = useMemo<LogbookApi>(() => {
    const persist = (nextBook: Logbook, nextPhotos: CatchPhotoMap): { ok: true } | { ok: false; message: string } => {
      try {
        saveLogbook(nextBook);
      } catch {
        return { ok: false, message: "The book could not be saved in this browser." };
      }
      if (nextPhotos !== photos) {
        try {
          savePhotos(nextPhotos);
        } catch {
          try {
            saveLogbook(book);
          } catch {
            setBook(nextBook);
            return { ok: false, message: "The catch was saved, but the photo did not fit in this browser." };
          }
          return { ok: false, message: "That photo does not fit alongside the book, so the change was not saved." };
        }
      }
      setBook(nextBook);
      setPhotos(nextPhotos);
      return { ok: true };
    };

    const commit = (next: Logbook) => {
      const result = persist(next, photosForBook(next, photos));
      if (!result.ok) throw new Error(result.message);
    };

    return {
      book,
      photoFor: (id) => photos[id] ?? null,
      addCatch: (draft, photo) => {
        const parsed = parseCatchDraft(draft, book);
        if (!parsed.ok) return { ok: false, message: parsed.message };
        const id = newId();
        let nextPhotos = photos;
        if (photo) {
          const put = putCatchPhoto(photos, id, photo);
          if (!put.ok) return put;
          nextPhotos = put.photos;
        }
        const saved = persist(withCatch(book, { ...parsed.value, id }), nextPhotos);
        if (!saved.ok) return saved;
        return { ok: true, id };
      },
      addSpot: (draft) => {
        const parsed = parseSpotDraft(draft);
        if (!parsed.ok) return { ok: false, message: parsed.message };
        const id = newId();
        commit(withSpot(book, { ...parsed.value, id }));
        return { ok: true, id };
      },
      addTrip: (draft) => {
        const parsed = parseTripDraft(draft, book);
        if (!parsed.ok) return { ok: false, message: parsed.message };
        const id = newId();
        commit(withTrip(book, { ...parsed.value, id }));
        return { ok: true, id };
      },
      updateCatch: (id, draft, photo) => {
        if (!book.catches.some((entry) => entry.id === id)) {
          return { ok: false, message: "That catch is not in this book." };
        }
        const parsed = parseCatchDraft(draft, book);
        if (!parsed.ok) return { ok: false, message: parsed.message };
        const current = photos[id] ?? null;
        let nextPhotos = photos;
        if (photo !== current) {
          if (photo) {
            const put = putCatchPhoto(photos, id, photo);
            if (!put.ok) return put;
            nextPhotos = put.photos;
          } else {
            nextPhotos = withoutCatchPhoto(photos, id);
          }
        }
        const saved = persist(replaceCatch(book, { ...parsed.value, id }), nextPhotos);
        if (!saved.ok) return saved;
        return { ok: true, id };
      },
      updateSpot: (id, draft) => {
        if (!book.spots.some((spot) => spot.id === id)) {
          return { ok: false, message: "That spot is not in this book." };
        }
        const parsed = parseSpotDraft(draft);
        if (!parsed.ok) return { ok: false, message: parsed.message };
        commit(replaceSpot(book, { ...parsed.value, id }));
        return { ok: true, id };
      },
      updateTrip: (id, draft) => {
        if (!book.trips.some((trip) => trip.id === id)) {
          return { ok: false, message: "That outing is not in this book." };
        }
        const parsed = parseTripDraft(draft, book);
        if (!parsed.ok) return { ok: false, message: parsed.message };
        commit(replaceTrip(book, { ...parsed.value, id }));
        return { ok: true, id };
      },
      deleteCatch: (id) => commit(withoutCatch(book, id)),
      deleteSpot: (id) => commit(withoutSpot(book, id)),
      deleteTrip: (id) => commit(withoutTrip(book, id)),
      restoreSample: () => commit(sampleLogbook(new Date())),
      photos,
      replaceBook: (nextBook, nextPhotos) => {
        setBook(nextBook);
        setPhotos(photosForBook(nextBook, nextPhotos));
      },
    };
  }, [book, photos]);

  return <LogbookContext.Provider value={api}>{children}</LogbookContext.Provider>;
}

export function useLogbook(): LogbookApi {
  const api = useContext(LogbookContext);
  if (!api) throw new Error("Logbook is only available inside the field log");
  return api;
}
