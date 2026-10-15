import type { CatchDraft } from "@stillwater/shared";

/** A new catch typed but not saved yet, kept so a closed tab or a stray tap doesn't lose it. */
export type KeptDraft = CatchDraft & { timeTouched: boolean; units: string; savedAt: string };

export const CATCH_DRAFT_KEY = "stillwater.catch-draft.v1";

/** A day on: past that, a half-typed fish is more likely forgotten than wanted. */
const KEEP_MS = 24 * 60 * 60 * 1000;

const TEXT_FIELDS = ["species", "amount", "lure", "spotId", "tripId", "caughtAt", "note", "sky", "wind", "waterTemp"] as const;

/** Whether the player has typed anything worth coming back for (the presets alone are not). */
export function draftWorthKeeping(draft: Pick<CatchDraft, "species" | "amount" | "note">): boolean {
  return Boolean(draft.species.trim() || draft.amount.trim() || draft.note.trim());
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
