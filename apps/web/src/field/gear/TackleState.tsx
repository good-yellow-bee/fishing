import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  itemsForTrip,
  parseTackleLabel,
  sampleTackle,
  withPacked,
  withTripUnpacked,
  withTackleItem,
  withoutTackleItem,
  type TackleItem,
} from "@stillwater/shared";
import { localId } from "../../game/localId";
import { TACKLE_STORAGE_KEY, readTackle, saveTackle } from "./storage";
import { pieceKey } from "./pieceKey";

type TackleApi = {
  items: TackleItem[];
  toggle: (id: string, packed: boolean) => void;
  add: (tripId: string, label: string) => string | null;
  remove: (id: string) => void;
  unpackTrip: (tripId: string) => void;
  /** Puts another outing's list on this one, everything still to pack. */
  copyTrip: (fromTripId: string, toTripId: string) => void;
  replaceTackle: (items: TackleItem[]) => void;
  /** The outing whose list was last changed when storage refused the save, so that list can say so; null once one saves. */
  unsavedTrip: string | null;
};

const TackleContext = createContext<TackleApi | null>(null);

/** Saves the lists; storage that is full or blocked leaves them working for this visit rather than stopping the page. */
function keep(items: TackleItem[]): boolean {
  try {
    saveTackle(items);
    return true;
  } catch {
    // Kept in memory only, and the list says so.
    return false;
  }
}

export function TackleProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<TackleItem[]>(() => {
    const stored = readTackle();
    if (stored) return stored;
    return sampleTackle();
  });

  const [first] = useState(items);
  // The list last changed here, so a refused save is told where it happened rather than on every list.
  const touched = useRef<string | null>(null);
  const [unsavedTrip, setUnsavedTrip] = useState<string | null>(null);
  // Saved after each change rather than inside it, so a full or blocked storage can't stop the page drawing.
  // The sample lists put in on a first visit are no change of the angler's: a refused save of those says nothing.
  useEffect(() => {
    const saved = keep(items);
    if (items !== first) setUnsavedTrip(saved ? null : touched.current);
  }, [items, first]);

  useEffect(() => {
    // Another tab changed the lists (or loaded a book): carry on from its copy, so the next tick here keeps its items.
    const onStorage = (event: StorageEvent) => {
      if (event.key === TACKLE_STORAGE_KEY || event.key === null) setItems(readTackle() ?? []);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const api = useMemo<TackleApi>(() => {
    const touch = (tripId: string | undefined) => {
      touched.current = tripId ?? null;
    };
    return {
      items,
      unsavedTrip,
      toggle: (id, packed) => {
        touch(items.find((item) => item.id === id)?.tripId);
        setItems((current) => withPacked(current, id, packed));
      },
      add: (tripId, label) => {
        const parsed = parseTackleLabel(label);
        if (!parsed.ok) return parsed.message;
        // "Spinnerbaits" on a list with "Spinnerbait" is the same piece, as the fish counts take it.
        const name = pieceKey(parsed.value);
        if (items.some((item) => item.tripId === tripId && pieceKey(item.label) === name)) {
          return "That piece is already on this list.";
        }
        const item: TackleItem = {
          id: localId(),
          tripId,
          label: parsed.value,
          packed: false,
        };
        touch(tripId);
        setItems((current) => withTackleItem(current, item));
        return null;
      },
      remove: (id) => {
        touch(items.find((item) => item.id === id)?.tripId);
        setItems((current) => withoutTackleItem(current, id));
      },
      unpackTrip: (tripId) => {
        touch(tripId);
        setItems((current) => withTripUnpacked(current, tripId));
      },
      copyTrip: (fromTripId, toTripId) => {
        touch(toTripId);
        setItems((current) => [
          ...current,
          ...itemsForTrip(current, fromTripId).map((item) => ({ id: localId(), tripId: toTripId, label: item.label, packed: false })),
        ]);
      },
      replaceTackle: (next) => {
        touch(undefined);
        setItems(next);
      },
    };
  }, [items, unsavedTrip]);

  return <TackleContext.Provider value={api}>{children}</TackleContext.Provider>;
}

export function useTackle(): TackleApi {
  const api = useContext(TackleContext);
  if (!api) throw new Error("Tackle is only available inside the field log");
  return api;
}

/** The tackle lists where a page can show them, or null outside the field log (a card rendered on its own). */
export function useTackleItems(): TackleItem[] | null {
  return useContext(TackleContext)?.items ?? null;
}
