import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  parseCatchDraft,
  parseSpotDraft,
  parseTripDraft,
  sampleLogbook,
  withCatch,
  withSpot,
  withTrip,
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
