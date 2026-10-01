import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  parseCatchDraft,
  parseSpotDraft,
  parseTripDraft,
  replaceCatch,
  replaceSpot,
  replaceTrip,
  sampleLogbook,
  withCatch,
  withSpot,
  withTrip,
  withoutCatch,
  withoutSpot,
  withoutTrip,
  type CatchDraft,
  type Logbook,
  type SpotDraft,
  type TripDraft,
} from "@stillwater/shared";
import { readStoredLogbook, saveLogbook } from "./storage";

type SaveResult = { ok: true; id: string } | { ok: false; message: string };

type LogbookApi = {
  book: Logbook;
  addCatch: (draft: CatchDraft) => SaveResult;
  addSpot: (draft: SpotDraft) => SaveResult;
  addTrip: (draft: TripDraft) => SaveResult;
  updateCatch: (id: string, draft: CatchDraft) => SaveResult;
  updateSpot: (id: string, draft: SpotDraft) => SaveResult;
  updateTrip: (id: string, draft: TripDraft) => SaveResult;
  deleteCatch: (id: string) => void;
  deleteSpot: (id: string) => void;
  deleteTrip: (id: string) => void;
  restoreSample: () => void;
};

const LogbookContext = createContext<LogbookApi | null>(null);

function newId(): string {
  return crypto.randomUUID();
}

export function LogbookProvider({ children }: { children: ReactNode }) {
  const [book, setBook] = useState<Logbook>(() => {
    const stored = readStoredLogbook();
    if (stored) return stored;
    const seeded = sampleLogbook(new Date());
    saveLogbook(seeded);
    return seeded;
  });

  const api = useMemo<LogbookApi>(() => {
    const commit = (next: Logbook) => {
      saveLogbook(next);
      setBook(next);
    };

    return {
      book,
      addCatch: (draft) => {
        const parsed = parseCatchDraft(draft, book);
        if (!parsed.ok) return { ok: false, message: parsed.message };
        const id = newId();
        commit(withCatch(book, { ...parsed.value, id }));
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
      updateCatch: (id, draft) => {
        if (!book.catches.some((entry) => entry.id === id)) {
          return { ok: false, message: "That catch is not in this book." };
        }
        const parsed = parseCatchDraft(draft, book);
        if (!parsed.ok) return { ok: false, message: parsed.message };
        commit(replaceCatch(book, { ...parsed.value, id }));
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
    };
  }, [book]);

  return <LogbookContext.Provider value={api}>{children}</LogbookContext.Provider>;
}

export function useLogbook(): LogbookApi {
  const api = useContext(LogbookContext);
  if (!api) throw new Error("Logbook is only available inside the field log");
  return api;
}
