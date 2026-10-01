import { isTackleBox, type TackleItem } from "@stillwater/shared";

const KEY = "stillwater.tackle.v1";

export function readTackle(): TackleItem[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isTackleBox(parsed) ? parsed.items : null;
  } catch {
    return null;
  }
}

export function saveTackle(items: TackleItem[]) {
  localStorage.setItem(KEY, JSON.stringify({ items }));
}
