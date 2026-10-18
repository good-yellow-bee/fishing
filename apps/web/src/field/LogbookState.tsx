import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { LOGBOOK_STORAGE_KEY, STORAGE_FULL, isStorageFull, openStoredLogbook, readStoredLogbook, saveLogbook, setAsideCatchIds } from "./storage";
import { forgetDeletedFish, noteDeletedFish } from "./deletedFish";
import { PLAY_LAKE_ID, offPlayLake } from "./playLake";
import { noteText, toLocalInput } from "./format";
import { bringBackClearedCopy, withoutSample } from "./bookCopy";

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
  /** `openedWith`: the photo the form opened with; left unchanged, a photo another tab put on since stays. */
  updateCatch: (id: string, draft: CatchDraft, photo: string | null, openedWith?: string | null) => SaveResult;
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
  /** Takes the sample week out from beside the player's own fish, with the same undo as a delete. */
  dropSample: () => boolean;
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

export type DeletedKind = "catch" | "spot" | "trip" | "sample" | "blank" | "unsample" | "rename" | "merge" | "file";

/** The photos for this book's fish, and for the set-aside book's while it is kept: those can't be taken again. */
function photosKept(book: { catches: { id: string }[] }, photos: CatchPhotoMap): CatchPhotoMap {
  const aside = setAsideCatchIds();
  return photosForBook(aside.length > 0 ? { catches: [...book.catches, ...aside.map((id) => ({ id }))] } : book, photos);
}

type Undo = { kind: DeletedKind; book: Logbook; photos: CatchPhotoMap; from: string };

const LogbookContext = createContext<LogbookApi | null>(null);

export function LogbookProvider({ children }: { children: ReactNode }) {
  const lang = useLang();
  // Read before the sample is put in its place: a book that is there but unreadable keeps its photos for now.
  // The stored book is read once for all three: a ten-year book takes a while to parse on a phone.
  const [opening] = useState(openStoredLogbook);
  const startedUnreadable = opening.unreadable;
  const [book, setBook] = useState<Logbook>(() => {
    const stored = opening.book;
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
    const storedBook = opening.book ?? { catches: [] };
    const pruned = photosKept(storedBook, storedPhotos);
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
      if (event.key === PHOTO_STORAGE_KEY || event.key === null) {
        setPhotos(readStoredPhotos());
        // An undo would put back this tab's older photos over the other tab's.
        setUndo(null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // A phone that froze this page (in the background, or kept for the back button) can miss another tab's change:
  // coming back reads the stored book again, and carries on from it when it differs.
  const shown = useRef({ book, photos });
  useEffect(() => {
    shown.current = { book, photos };
  }, [book, photos]);
  useEffect(() => {
    const onBack = () => {
      if (document.visibilityState !== "visible") return;
      const stored = readStoredLogbook();
      const storedPhotos = readStoredPhotos();
      const bookChanged = stored !== null && JSON.stringify(stored) !== JSON.stringify(shown.current.book);
      const photosChanged = JSON.stringify(storedPhotos) !== JSON.stringify(shown.current.photos);
      if (bookChanged) setBook(stored);
      if (photosChanged) setPhotos(storedPhotos);
      if (bookChanged || photosChanged) setUndo(null);
    };
    document.addEventListener("visibilitychange", onBack);
    window.addEventListener("pageshow", onBack);
    return () => {
      document.removeEventListener("visibilitychange", onBack);
      window.removeEventListener("pageshow", onBack);
    };
  }, []);

  // Made again only for a new book or language, not for an undo or an error: pages keep what they worked out per book.
  // The language is a dependency: the sample week's lines are shown in it.
  const shownBook = useMemo(() => localizeSample(book), [book, lang]);

  const api = useMemo<LogbookApi>(() => {
    const persist = (nextBook: Logbook, nextPhotos: CatchPhotoMap): { ok: true } | { ok: false; message: string } => {
      try {
        saveLogbook(nextBook);
      } catch (error) {
        return { ok: false, message: t(isStorageFull(error) ? STORAGE_FULL : "The book could not be saved in this browser.") };
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
      const before = { kind, book, photos, from: window.location.pathname + window.location.search };
      if (!commit(next)) return false;
      // The sample or a blank book takes the book's place on purpose; a deleted fish or water is kept out of later merges,
      // and so is a removed sample week, so adding an older copy doesn't bring it back.
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
      const result = persist(next, photosKept(next, photos));
      setSaveError(result.ok ? null : result.message);
      return result.ok;
    };

    return {
      book: shownBook,
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
      updateCatch: (id, draft, photo, openedWith) => {
        const was = book.catches.find((entry) => entry.id === id);
        if (!was) {
          return { ok: false, message: t("That catch is not in this book.") };
        }
        const parsed = parseCatchDraft({ ...draft, note: draft.note === noteText(was.note) ? was.note : bookLine(draft.note, was.note) }, book);
        if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };
        if (offPlayLake(was) !== offPlayLake(parsed.value)) return { ok: false, message: t("What was caught in the game stays on the game's lake."), field: "spotId" };
        // The time box untouched keeps the stored moment: its seconds, and the hour a clock change repeats.
        if (draft.caughtAt === toLocalInput(new Date(was.caughtAt))) parsed.value.caughtAt = was.caughtAt;
        const current = photos[id] ?? null;
        let nextPhotos = photos;
        // The form's photo untouched: whatever the book holds now stays, a photo added in another tab included.
        const untouched = openedWith !== undefined && photo === openedWith;
        if (!untouched && photo !== current) {
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
        // Its untitled outings were saved under the old name: they take the new one.
        const renamed = parsed.value.name !== was.name;
        const next = replaceSpot(renamed ? { ...book, trips: book.trips.map((trip) => (trip.spotId === id && trip.title.trim() === was.name.trim() ? { ...trip, title: parsed.value.name } : trip)) } : book, { ...parsed.value, id });
        const saved = persist(next, photos);
        return saved.ok ? { ok: true, id } : saved;
      },
      updateTrip: (id, draft) => {
        const before = book.trips.find((trip) => trip.id === id);
        if (!before) {
          return { ok: false, message: t("That outing is not in this book.") };
        }
        const parsed = parseTripDraft({ ...draft, title: bookLine(draft.title, before.title), note: bookLine(draft.note, before.note) }, book);
        if (!parsed.ok) return { ok: false, message: parsed.message, field: parsed.field };
        // A game day and its fish stay on the game's lake, and a real outing stays off it.
        if (offPlayLake(before) !== offPlayLake(parsed.value)) return { ok: false, message: t("What was caught in the game stays on the game's lake."), field: "spotId" };
        // The lost and missed tallies are kept on the water, not on the form: an edit leaves them be.
        const counts = { ...(before.lost ? { lost: before.lost } : {}), ...(before.missed ? { missed: before.missed } : {}) };
        const saved = persist(replaceTrip(book, { ...parsed.value, id, ...counts }), photos);
        return saved.ok ? { ok: true, id } : saved;
      },
      deleteCatch: (id) => remove("catch", withoutCatch(book, id)),
      fileCatches: (catchIds, tripId) => remove("file", catchIds.reduce((next, id) => withCatchOnTrip(next, id, tripId), book)),
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
        // The book back from under the sample was downloaded when it was: its backup reminder comes back with it.
        if (result.ok && undo.kind === "sample") bringBackClearedCopy();
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
      // The game's lake and what was landed there stay: they come from play, not the sample.
      startBlank: () => remove("blank", { spots: book.spots.filter((spot) => spot.id === PLAY_LAKE_ID), trips: book.trips.filter((trip) => !offPlayLake(trip)), catches: book.catches.filter((entry) => !offPlayLake(entry)) }),
      dropSample: () => remove("unsample", withoutSample(book)),
      photos,
      replaceBook: (nextBook, nextPhotos) => {
        setBook(nextBook);
        setPhotos(photosKept(nextBook, nextPhotos));
        setUndo(null);
      },
    };
    // The language is a dependency: the sample week's lines are shown in it.
  }, [book, shownBook, photos, lang, undo, saveError]);

  return <LogbookContext.Provider value={api}>{children}</LogbookContext.Provider>;
}

export function useLogbook(): LogbookApi {
  const api = useContext(LogbookContext);
  if (!api) throw new Error("Logbook is only available inside the field log");
  return api;
}
