import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  parseTackleLabel,
  sampleTackle,
  withPacked,
  withTackleItem,
  type TackleItem,
} from "@stillwater/shared";
import { readTackle, saveTackle } from "./storage";

type TackleApi = {
  items: TackleItem[];
  toggle: (id: string, packed: boolean) => void;
  add: (tripId: string, label: string) => string | null;
  replaceTackle: (items: TackleItem[]) => void;
};

const TackleContext = createContext<TackleApi | null>(null);

export function TackleProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<TackleItem[]>(() => {
    const stored = readTackle();
    if (stored) return stored;
    const seeded = sampleTackle();
    saveTackle(seeded);
    return seeded;
  });

  const api = useMemo<TackleApi>(() => {
    return {
      items,
      toggle: (id, packed) => {
        setItems((current) => {
          const next = withPacked(current, id, packed);
          saveTackle(next);
          return next;
        });
      },
      add: (tripId, label) => {
        const parsed = parseTackleLabel(label);
        if (!parsed.ok) return parsed.message;
        const item: TackleItem = {
          id: crypto.randomUUID(),
          tripId,
          label: parsed.value,
          packed: false,
        };
        setItems((current) => {
          const next = withTackleItem(current, item);
          saveTackle(next);
          return next;
        });
        return null;
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
