import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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

type TackleApi = {
  items: TackleItem[];
  toggle: (id: string, packed: boolean) => void;
  add: (tripId: string, label: string) => string | null;
  remove: (id: string) => void;
  unpackTrip: (tripId: string) => void;
  /** Puts another outing's list on this one, everything still to pack. */
  copyTrip: (fromTripId: string, toTripId: string) => void;
  replaceTackle: (items: TackleItem[]) => void;
};

const TackleContext = createContext<TackleApi | null>(null);

/** Saves the lists; storage that is full or blocked leaves them working for this visit rather than stopping the page. */
function keep(items: TackleItem[]) {
  try {
    saveTackle(items);
  } catch {
    // Kept in memory only.
  }
}

export function TackleProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<TackleItem[]>(() => {
    const stored = readTackle();
    if (stored) return stored;
    return sampleTackle();
  });

  // Saved after each change rather than inside it, so a full or blocked storage can't stop the page drawing.
  useEffect(() => keep(items), [items]);

  useEffect(() => {
    // Another tab changed the lists (or loaded a book): carry on from its copy, so the next tick here keeps its items.
    const onStorage = (event: StorageEvent) => {
      if (event.key === TACKLE_STORAGE_KEY || event.key === null) setItems(readTackle() ?? []);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const api = useMemo<TackleApi>(() => {
    return {
      items,
      toggle: (id, packed) => {
        setItems((current) => withPacked(current, id, packed));
      },
      add: (tripId, label) => {
        const parsed = parseTackleLabel(label);
        if (!parsed.ok) return parsed.message;
        const name = parsed.value.toLowerCase();
        if (items.some((item) => item.tripId === tripId && item.label.toLowerCase() === name)) {
          return "That piece is already on this list.";
        }
        const item: TackleItem = {
          id: localId(),
          tripId,
          label: parsed.value,
          packed: false,
        };
        setItems((current) => withTackleItem(current, item));
        return null;
      },
      remove: (id) => {
        setItems((current) => withoutTackleItem(current, id));
      },
      unpackTrip: (tripId) => {
        setItems((current) => withTripUnpacked(current, tripId));
      },
      copyTrip: (fromTripId, toTripId) => {
        setItems((current) => [
          ...current,
          ...itemsForTrip(current, fromTripId).map((item) => ({ id: localId(), tripId: toTripId, label: item.label, packed: false })),
        ]);
      },
      replaceTackle: (next) => setItems(next),
    };
  }, [items]);

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
