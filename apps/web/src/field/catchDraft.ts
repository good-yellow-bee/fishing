import type { CatchDraft } from "@stillwater/shared";

/** A new catch typed but not saved yet, kept so a closed tab or a stray tap doesn't lose it. */
export type KeptDraft = CatchDraft & { timeTouched: boolean; units: string; savedAt: string };

export const CATCH_DRAFT_KEY = "stillwater.catch-draft.v1";

/** A day on: past that, a half-typed fish is more likely forgotten than wanted. */
const KEEP_MS = 24 * 60 * 60 * 1000;

const TEXT_FIELDS = ["species", "amount", "lure", "spotId", "tripId", "caughtAt", "note", "sky", "wind", "waterTemp"] as const;

/** Whether the player has typed anything worth coming back for (the presets alone are not). */
export function draftWorthKeeping(draft: Pick<CatchDraft, "species" | "amount" | "note" | "alsoAmount">): boolean {
  return Boolean(draft.species.trim() || draft.amount.trim() || draft.alsoAmount?.trim() || draft.note.trim());
}

export function parseKeptDraft(raw: string | null, now: Date): KeptDraft | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!TEXT_FIELDS.every((field) => typeof row[field] === "string")) return null;
  if (row.measureKind !== "length" && row.measureKind !== "weight") return null;
  if (typeof row.timeTouched !== "boolean" || typeof row.units !== "string" || typeof row.savedAt !== "string") return null;
  const savedAt = Date.parse(row.savedAt);
  if (!Number.isFinite(savedAt) || now.getTime() - savedAt > KEEP_MS) return null;
  // The second measure came later: an older kept draft has none, and a stray value is let go.
  if (row.alsoAmount !== undefined && typeof row.alsoAmount !== "string") delete row.alsoAmount;
  const draft = row as unknown as KeptDraft;
  return draftWorthKeeping(draft) ? draft : null;
}

export function readKeptDraft(now = new Date()): KeptDraft | null {
  try {
    return parseKeptDraft(localStorage.getItem(CATCH_DRAFT_KEY), now);
  } catch {
    return null;
  }
}

export function keepDraft(draft: KeptDraft) {
  try {
    if (draftWorthKeeping(draft)) localStorage.setItem(CATCH_DRAFT_KEY, JSON.stringify(draft));
    else localStorage.removeItem(CATCH_DRAFT_KEY);
  } catch {
    // A full or blocked store only costs the safety net.
  }
}

export function dropKeptDraft() {
  try {
    localStorage.removeItem(CATCH_DRAFT_KEY);
  } catch {
    // Nothing to drop.
  }
}

/** Changes to a fish already in the book, typed but not saved: kept for that fish while it still reads as it did. */
export type EditDraft = KeptDraft & { catchId: string; base: string };

/** Each fish's kept changes, by its id, so changes to one fish never overwrite another's. */
export const CATCH_EDIT_KEY = "stillwater.catch-edit.v2";

function readEdits(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** The kept changes to this fish, unless the fish was changed since (another tab, an undo), which would make them stale. */
export function parseEditDraft(raw: string | null, catchId: string, base: string, now: Date): EditDraft | null {
  const row = readEdits(raw)[catchId];
  const draft = row === undefined ? null : (parseKeptDraft(JSON.stringify(row), now) as EditDraft | null);
  return draft && draft.catchId === catchId && draft.base === base ? draft : null;
}

export function readEditDraft(catchId: string, base: string, now = new Date()): EditDraft | null {
  try {
    return parseEditDraft(localStorage.getItem(CATCH_EDIT_KEY), catchId, base, now);
  } catch {
    return null;
  }
}

/** Every fish's kept changes, less those a day old, with `change` applied. */
function writeEdits(change: (edits: Record<string, unknown>) => void) {
  try {
    const now = new Date();
    const edits = readEdits(localStorage.getItem(CATCH_EDIT_KEY));
    for (const [id, row] of Object.entries(edits)) if (!parseKeptDraft(JSON.stringify(row), now)) delete edits[id];
    change(edits);
    if (Object.keys(edits).length === 0) localStorage.removeItem(CATCH_EDIT_KEY);
    else localStorage.setItem(CATCH_EDIT_KEY, JSON.stringify(edits));
  } catch {
    // A full or blocked store only costs the safety net.
  }
}

export function keepEditDraft(draft: EditDraft) {
  writeEdits((edits) => {
    edits[draft.catchId] = draft;
  });
}

/** Lets go of the kept changes to this fish; another fish's stay. */
export function dropEditDraft(catchId: string) {
  writeEdits((edits) => {
    delete edits[catchId];
  });
}
