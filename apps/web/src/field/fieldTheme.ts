import { useSyncExternalStore } from "react";

/** The field log's colours: as the device has them, or held light or dark. */
export type FieldTheme = "device" | "light" | "dark";

export const FIELD_THEME_KEY = "stillwater.field-log.theme.v1";
const CHANGED = "stillwater-field-theme";

/** The choice made while storage refused it, kept for this page only. */
let remembered: FieldTheme | null = null;

export function readFieldTheme(): FieldTheme {
  try {
    const stored = localStorage.getItem(FIELD_THEME_KEY);
    return stored === "light" || stored === "dark" ? stored : "device";
  } catch {
    return "device";
  }
}

export function writeFieldTheme(theme: FieldTheme): void {
  try {
    if (theme === "device") localStorage.removeItem(FIELD_THEME_KEY);
    else localStorage.setItem(FIELD_THEME_KEY, theme);
  } catch {
    // Storage refused: the choice still holds until the page reloads.
    remembered = theme;
  }
  window.dispatchEvent(new Event(CHANGED));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGED, onChange);
  // Another tab changing it.
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useFieldTheme(): FieldTheme {
  return useSyncExternalStore(subscribe, () => remembered ?? readFieldTheme(), () => "device");
}
