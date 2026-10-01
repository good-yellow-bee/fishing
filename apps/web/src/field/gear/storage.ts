import { isTackleBox, type TackleItem } from "@stillwater/shared";

export const TACKLE_STORAGE_KEY = "stillwater.tackle.v1";

export function readTackle(): TackleItem[] | null {
  try {
    const raw = localStorage.getItem(TACKLE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isTackleBox(parsed) ? parsed.items : null;
  } catch {
    return null;
  }
}

export function saveTackle(items: TackleItem[]) {
  localStorage.setItem(TACKLE_STORAGE_KEY, JSON.stringify({ items }));
}
