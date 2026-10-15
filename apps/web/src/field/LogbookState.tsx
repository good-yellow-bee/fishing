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
import { t, useLang } from "../i18n";
import { readStoredPhotos, savePhotos } from "./photoStore";
import { keepBookStorage } from "./keepStorage";
import { localizeSample } from "./sampleText";
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
  /** What the last delete took out, until the next change to the book. */
  undoable: DeletedKind | null;
  /** Puts the book back and gives the page the delete was made from, to return to. */
  undoDelete: () => string | null;
  dismissUndo: () => void;
  photos: CatchPhotoMap;
  replaceBook: (book: Logbook, photos: CatchPhotoMap) => void;
};

export type DeletedKind = "catch" | "spot" | "trip";

type Undo = { kind: DeletedKind; book: Logbook; photos: CatchPhotoMap; from: string };

const LogbookContext = createContext<LogbookApi | null>(null);

export function LogbookProvider({ children }: { children: ReactNode }) {
  const lang = useLang();
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

  const [undo, setUndo] = useState<Undo | null>(null);

  const api = useMemo<LogbookApi>(() => {
    const persist = (nextBook: Logbook, nextPhotos: CatchPhotoMap): { ok: true } | { ok: false; message: string } => {
      try {
        saveLogbook(nextBook);
      } catch {
        return { ok: false, message: t("The book could not be saved in this browser.") };
      }
      if (nextPhotos !== photos) {
        try {
          savePhotos(nextPhotos);
        } catch {
          try {
            saveLogbook(book);
          } catch {
            setBook(nextBook);
            return { ok: false, message: t("The catch was saved, but the photo did not fit in this browser.") };
          }
          return { ok: false, message: t("That photo does not fit alongside the book, so the change was not saved.") };
        }
      }
      setBook(nextBook);
      setPhotos(nextPhotos);
      // Any later change to the book ends the chance to undo a delete.
      setUndo(null);
      return { ok: true };
    };

    const remove = (kind: DeletedKind, next: Logbook) => {
      // Deletes are made from the entry's own page, before it navigates away.
      const before = { kind, book, photos, from: window.location.pathname };
      commit(next);
      setUndo(before);
    };

    const commit = (next: Logbook) => {
      const result = persist(next, photosForBook(next, photos));
      if (!result.ok) throw new Error(result.message);
    };

    return {
      book: localizeSample(book),
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
        void keepBookStorage();
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
          return { ok: false, message: t("That catch is not in this book.") };
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
          return { ok: false, message: t("That spot is not in this book.") };
        }
        const parsed = parseSpotDraft(draft);
        if (!parsed.ok) return { ok: false, message: parsed.message };
        commit(replaceSpot(book, { ...parsed.value, id }));
        return { ok: true, id };
      },
      updateTrip: (id, draft) => {
        if (!book.trips.some((trip) => trip.id === id)) {
          return { ok: false, message: t("That outing is not in this book.") };
        }
        const parsed = parseTripDraft(draft, book);
        if (!parsed.ok) return { ok: false, message: parsed.message };
        commit(replaceTrip(book, { ...parsed.value, id }));
        return { ok: true, id };
      },
      deleteCatch: (id) => remove("catch", withoutCatch(book, id)),
      deleteSpot: (id) => remove("spot", withoutSpot(book, id)),
      deleteTrip: (id) => remove("trip", withoutTrip(book, id)),
      undoable: undo?.kind ?? null,
      undoDelete: () => {
        if (!undo) return null;
        const result = persist(undo.book, undo.photos);
        if (!result.ok) throw new Error(result.message);
        return undo.from;
      },
      dismissUndo: () => setUndo(null),
      restoreSample: () => commit(sampleLogbook(new Date())),
      photos,
      replaceBook: (nextBook, nextPhotos) => {
        setBook(nextBook);
        setPhotos(photosForBook(nextBook, nextPhotos));
        setUndo(null);
      },
    };
    // The language is a dependency: the sample week's lines are shown in it.
  }, [book, photos, lang, undo]);

  return <LogbookContext.Provider value={api}>{children}</LogbookContext.Provider>;
}

export function useLogbook(): LogbookApi {
  const api = useContext(LogbookContext);
  if (!api) throw new Error("Logbook is only available inside the field log");
  return api;
}
