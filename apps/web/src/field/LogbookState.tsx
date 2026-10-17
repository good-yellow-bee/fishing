import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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
  withCatchOnTrip,
  withoutCatch,
  withoutCatchPhoto,
  withoutSpot,
  withoutTrip,
  withTripCount,
  type CatchDraft,
  type CatchPhotoMap,
  type Logbook,
  type SpotDraft,
  type TripCount,
  type TripDraft,
} from "@stillwater/shared";
import { t, useLang } from "../i18n";
import { PHOTO_STORAGE_KEY, readStoredPhotos, savePhotos } from "./photoStore";
import { keepBookStorage } from "./keepStorage";
import { bookLine, localizeSample } from "./sampleText";
import { LOGBOOK_STORAGE_KEY, readStoredLogbook, saveLogbook, storedBookUnreadable } from "./storage";
import { forgetDeletedFish, noteDeletedFish } from "./deletedFish";

type SaveResult = { ok: true; id: string } | { ok: false; message: string; field?: string };

type LogbookApi = {
  book: Logbook;
  /** The book as stored, before the sample week is put into the player's language: what a backup file should hold. */
  storedBook: Logbook;
  photoFor: (id: string) => string | null;
  addCatch: (draft: CatchDraft, photo: string | null) => SaveResult;
  addSpot: (draft: SpotDraft) => SaveResult;
  /** `fileIds`: fish already logged on that water, filed on the new outing in the same save. */
  addTrip: (draft: TripDraft, fileIds?: readonly string[]) => SaveResult;
  updateCatch: (id: string, draft: CatchDraft, photo: string | null) => SaveResult;
  updateSpot: (id: string, draft: SpotDraft) => SaveResult;
  updateTrip: (id: string, draft: TripDraft) => SaveResult;
  /** Each of these says whether the change was saved; one that wasn't leaves `saveError` for the bar to show. */
  deleteCatch: (id: string) => boolean;
  /** Files fish logged without an outing under one on their water. */
  fileCatches: (catchIds: readonly string[], tripId: string) => boolean;
  /** Files each fish under its own outing (catch id to outing id), in one save, with the same undo as a delete. */
  fileEach: (tripFor: ReadonlyMap<string, string>) => boolean;
  deleteSpot: (id: string) => boolean;
  deleteTrip: (id: string) => boolean;
  /** One more or one fewer lost fish or missed strike on an outing. */
  countOnTrip: (tripId: string, count: TripCount, delta: number) => boolean;
  restoreSample: () => boolean;
  /** Clears the book for a player's own waters and fish, with the same undo as a delete. */
  startBlank: () => boolean;
  /** Puts a new book in place for a change made across it, such as renaming a kind of fish, with the same undo as a delete. */
  changeBook: (kind: "rename" | "merge", next: Logbook) => boolean;
  /** Takes these photos off their catches, leaving the fish. */
  removePhotos: (ids: readonly string[]) => boolean;
  /** Why the last delete, filing, sample or undo didn't save, until the next one or a dismiss. */
  saveError: string | null;
  dismissSaveError: () => void;
  /** What the last delete took out, until the next change to the book. */
  undoable: DeletedKind | null;
  /** Puts the book back and gives the page the delete was made from, to return to. */
  undoDelete: () => string | null;
  dismissUndo: () => void;
  photos: CatchPhotoMap;
  replaceBook: (book: Logbook, photos: CatchPhotoMap) => void;
};

export type DeletedKind = "catch" | "spot" | "trip" | "sample" | "blank" | "rename" | "merge" | "file";

type Undo = { kind: DeletedKind; book: Logbook; photos: CatchPhotoMap; from: string };

const LogbookContext = createContext<LogbookApi | null>(null);

export function LogbookProvider({ children }: { children: ReactNode }) {
  const lang = useLang();
  // Read before the sample is put in its place: a book that is there but unreadable keeps its photos for now.
  const [startedUnreadable] = useState(storedBookUnreadable);
  const [book, setBook] = useState<Logbook>(() => {
    const stored = readStoredLogbook();
    if (stored) return stored;
    const seeded = sampleLogbook(new Date());
    try {
      saveLogbook(seeded);
    } catch {
      // Storage blocked or full: the sample still shows, and a save later says what went wrong.
    }
    return seeded;
  });
  const [photos, setPhotos] = useState<CatchPhotoMap>(() => {
    const storedPhotos = readStoredPhotos();
    if (startedUnreadable) return storedPhotos;
    const storedBook = readStoredLogbook() ?? { catches: [] };
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
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    // Another tab (the game, or the field log open twice) changed the book: carry on from its copy,
    // so the next save here doesn't write over the fish it added.
    const onStorage = (event: StorageEvent) => {
      if (event.key === LOGBOOK_STORAGE_KEY || event.key === null) {
        const stored = readStoredLogbook();
        if (stored) {
          setBook(stored);
          // An undo from before would put back the other tab's changes too.
          setUndo(null);
        }
      }
      if (event.key === PHOTO_STORAGE_KEY || event.key === null) setPhotos(readStoredPhotos());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

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
      if (!commit(next)) return false;
      // The sample or a blank book takes the book's place on purpose; a deleted fish or water is kept out of later merges.
      if (kind !== "sample" && kind !== "blank" && kind !== "file") {
        // Waters and outings too, so adding from an older file doesn't bring them back either.
        const kept = new Set([...next.catches, ...next.spots, ...next.trips].map((each) => each.id));
        noteDeletedFish([...book.catches, ...book.spots, ...book.trips].filter((each) => !kept.has(each.id)).map((each) => each.id));
      }
      setUndo(before);
      return true;
    };

    // A full or blocked browser leaves the book as it was and says so in the bar, rather than the button doing nothing.
    const commit = (next: Logbook) => {
      const result = persist(next, photosForBook(next, photos));
      setSaveError(result.ok ? null : result.message);
      return result.ok;
    };

    return {
      book: localizeSample(book),
      storedBook: book,
      photoFor: (id) => photos[id] ?? null,
      addCatch: (draft, photo) => {
        const parsed = parseCatchDraft(draft, book);
        if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };
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
        if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };
        const id = newId();
        // A full browser says so on the form instead of the save silently not happening.
        const saved = persist(withSpot(book, { ...parsed.value, id }), photos);
        return saved.ok ? { ok: true, id } : saved;
      },
      addTrip: (draft, fileIds = []) => {
        const parsed = parseTripDraft(draft, book);
        if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };
        const id = newId();
        const next = fileIds.reduce((filed, catchId) => withCatchOnTrip(filed, catchId, id), withTrip(book, { ...parsed.value, id }));
        const saved = persist(next, photos);
        return saved.ok ? { ok: true, id } : saved;
      },
      updateCatch: (id, draft, photo) => {
        const was = book.catches.find((entry) => entry.id === id);
        if (!was) {
          return { ok: false, message: t("That catch is not in this book.") };
        }
        const parsed = parseCatchDraft({ ...draft, note: bookLine(draft.note, was.note) }, book);
        if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };
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
        const was = book.spots.find((spot) => spot.id === id);
        if (!was) {
          return { ok: false, message: t("That spot is not in this book.") };
        }
        const parsed = parseSpotDraft({
          ...draft,
          name: bookLine(draft.name, was.name),
          notes: bookLine(draft.notes, was.notes),
          bestConditions: bookLine(draft.bestConditions, was.bestConditions),
        });
        if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };
        const saved = persist(replaceSpot(book, { ...parsed.value, id }), photos);
        return saved.ok ? { ok: true, id } : saved;
      },
      updateTrip: (id, draft) => {
        const before = book.trips.find((trip) => trip.id === id);
        if (!before) {
          return { ok: false, message: t("That outing is not in this book.") };
        }
        const parsed = parseTripDraft({ ...draft, title: bookLine(draft.title, before.title), note: bookLine(draft.note, before.note) }, book);
        if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };
        // The lost and missed tallies are kept on the water, not on the form: an edit leaves them be.
        const counts = { ...(before.lost ? { lost: before.lost } : {}), ...(before.missed ? { missed: before.missed } : {}) };
        const saved = persist(replaceTrip(book, { ...parsed.value, id, ...counts }), photos);
        return saved.ok ? { ok: true, id } : saved;
      },
      deleteCatch: (id) => remove("catch", withoutCatch(book, id)),
      fileCatches: (catchIds, tripId) => commit(catchIds.reduce((next, id) => withCatchOnTrip(next, id, tripId), book)),
      fileEach: (tripFor) => remove("file", [...tripFor].reduce((next, [id, tripId]) => withCatchOnTrip(next, id, tripId), book)),
      deleteSpot: (id) => remove("spot", withoutSpot(book, id)),
      deleteTrip: (id) => remove("trip", withoutTrip(book, id)),
      countOnTrip: (tripId, count, delta) => commit(withTripCount(book, tripId, count, delta)),
      changeBook: (kind, next) => remove(kind, next),
      undoable: undo?.kind ?? null,
      undoDelete: () => {
        if (!undo) return null;
        const result = persist(undo.book, undo.photos);
        setSaveError(result.ok ? null : result.message);
        if (result.ok) forgetDeletedFish([...undo.book.catches, ...undo.book.spots, ...undo.book.trips].map((each) => each.id));
        return result.ok ? undo.from : null;
      },
      saveError,
      dismissSaveError: () => setSaveError(null),
      dismissUndo: () => setUndo(null),
      removePhotos: (ids) => {
        const result = persist(book, ids.reduce(withoutCatchPhoto, photos));
        setSaveError(result.ok ? null : result.message);
        return result.ok;
      },
      // The sample takes the whole book's place, so it can be undone like a delete.
      restoreSample: () => remove("sample", sampleLogbook(new Date())),
      startBlank: () => remove("blank", { spots: [], trips: [], catches: [] }),
      photos,
      replaceBook: (nextBook, nextPhotos) => {
        setBook(nextBook);
        setPhotos(photosForBook(nextBook, nextPhotos));
        setUndo(null);
      },
    };
    // The language is a dependency: the sample week's lines are shown in it.
  }, [book, photos, lang, undo, saveError]);

  return <LogbookContext.Provider value={api}>{children}</LogbookContext.Provider>;
}

export function useLogbook(): LogbookApi {
  const api = useContext(LogbookContext);
  if (!api) throw new Error("Logbook is only available inside the field log");
  return api;
}
