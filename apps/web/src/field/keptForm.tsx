import { useEffect, useRef, useState } from "react";
import { t } from "../i18n";

/** Unsaved changes to an outing or a water already in the book, by "trip:<id>" or "spot:<id>". */
export const KEPT_FORMS_KEY = "stillwater.kept-forms.v1";

/** A day on: past that, half-made changes are more likely forgotten than wanted. */
const KEEP_MS = 24 * 60 * 60 * 1000;

export type KeptForm = { fields: Record<string, string>; base: string; savedAt: string };

function readAll(raw: string | null): Record<string, KeptForm> {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, KeptForm>) : {};
  } catch {
    return {};
  }
}

function fresh(row: unknown, now: Date): row is KeptForm {
  if (!row || typeof row !== "object") return false;
  const { fields, base, savedAt } = row as Partial<KeptForm>;
  if (!fields || typeof fields !== "object" || typeof base !== "string" || typeof savedAt !== "string") return false;
  if (!Object.values(fields).every((value) => typeof value === "string")) return false;
  const at = Date.parse(savedAt);
  return Number.isFinite(at) && now.getTime() - at <= KEEP_MS;
}

/** The kept changes for this form, unless the record changed since (another tab, an undo), which makes them stale. */
export function parseKeptForm(raw: string | null, key: string, base: string, now: Date): KeptForm | null {
  const row = readAll(raw)[key];
  return fresh(row, now) && row.base === base ? row : null;
}

function write(change: (all: Record<string, KeptForm>) => void) {
  try {
    const now = new Date();
    const all = readAll(localStorage.getItem(KEPT_FORMS_KEY));
    for (const [key, row] of Object.entries(all)) if (!fresh(row, now)) delete all[key];
    change(all);
    if (Object.keys(all).length === 0) localStorage.removeItem(KEPT_FORMS_KEY);
    else localStorage.setItem(KEPT_FORMS_KEY, JSON.stringify(all));
  } catch {
    // A full or blocked store only costs the safety net.
  }
}

export function dropKeptForm(key: string) {
  write((all) => {
    delete all[key];
  });
}

/**
 * Keeps an edit form's unsaved changes for its record (`base` is the record as stored), and offers them back when the
 * form opens again. `key` is null for a form with nothing to keep (a new record). `fields` are the form's text values.
 */
export function useKeptForm(key: string | null, base: string, fields: Record<string, string>, pickUp: (fields: Record<string, string>) => void) {
  const [waiting, setWaiting] = useState<KeptForm | null>(() => {
    if (!key) return null;
    try {
      return parseKeptForm(localStorage.getItem(KEPT_FORMS_KEY), key, base, new Date());
    } catch {
      return null;
    }
  });
  const opened = useRef(JSON.stringify(fields));
  // Set once the form is saved or cancelled: the re-render a save causes must not keep the saved values as changes.
  const done = useRef(false);
  const now = JSON.stringify(fields);
  useEffect(() => {
    // While older changes wait, keep them rather than overwrite them.
    if (!key || waiting || done.current) return;
    if (now === opened.current) dropKeptForm(key);
    else write((all) => {
      all[key] = { fields: JSON.parse(now) as Record<string, string>, base, savedAt: new Date().toISOString() };
    });
  }, [key, waiting, now, base]);

  const banner = waiting ? (
    <div className="kept-draft" role="status">
      <p>{t("Changes you made here were not saved.")}</p>
      <button
        type="button"
        className="field-primary inline"
        onClick={() => {
          pickUp(waiting.fields);
          // Picked up counts as typed: it stays kept even before the next keystroke.
          opened.current = "";
          setWaiting(null);
        }}
      >
        {t("Pick them up")}
      </button>
      <button
        type="button"
        className="text-button"
        onClick={() => {
          if (key) dropKeptForm(key);
          setWaiting(null);
        }}
      >
        {t("Let it go")}
      </button>
    </div>
  ) : null;
  return {
    banner,
    drop: () => {
      done.current = true;
      if (key) dropKeptForm(key);
    },
  };
}
