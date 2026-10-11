import {
  isLakeHour,
  isSky,
  LAKE_HOUR_LABELS,
  localDate,
  SKY_LABELS,
  SPOT_IDS,
  SPOT_LABELS,
  type LakeHour,
  type Sky,
  type SpotId,
} from "@stillwater/shared";

/** One fish from today's outing, as the recap and the field-log trip need it. */
export type SessionFish = {
  id: string;
  speciesId: string;
  speciesName: string;
  weight: number;
  spot: SpotId;
  hour: LakeHour;
  /** New in the field guide when it was landed. */
  first: boolean;
  clean: boolean;
};

/** The outing so far. Kept in this browser so a closed tab can still be written up next visit. */
export type SessionDraft = {
  id: string;
  /** Local calendar day it started, YYYY-MM-DD. */
  date: string;
  sky: Sky;
  fish: SessionFish[];
};

export function sessionKey(userId: string) {
  return `stillwater.session.${userId}.v1`;
}

export function startSession(now: Date, sky: Sky): SessionDraft {
  return { id: `trip-play-${now.getTime().toString(36)}`, date: localDate(now), sky, fish: [] };
}

/** Adds a landed fish once; a repeated outcome for the same catch changes nothing. */
export function withSessionFish(draft: SessionDraft, fish: SessionFish): SessionDraft {
  if (draft.fish.some((entry) => entry.id === fish.id)) return draft;
  return { ...draft, fish: [...draft.fish, fish] };
}

function mostCommon<T extends string>(values: readonly T[]): T | null {
  const counts = new Map<T, number>();
  let best: T | null = null;
  for (const value of values) {
    const count = (counts.get(value) ?? 0) + 1;
    counts.set(value, count);
    // Ties go to the earlier value, so the bank you started at names a split day.
    if (best === null || count > counts.get(best)!) best = value;
  }
  return best;
}

export type SessionSummary = {
  count: number;
  heaviest: SessionFish | null;
  firsts: SessionFish[];
  clean: number;
  bank: SpotId | null;
  hour: LakeHour | null;
};

export function sessionSummary(draft: SessionDraft): SessionSummary {
  const heaviest = draft.fish.reduce<SessionFish | null>((best, fish) => (!best || fish.weight > best.weight ? fish : best), null);
  return {
    count: draft.fish.length,
    heaviest,
    firsts: draft.fish.filter((fish) => fish.first),
    clean: draft.fish.filter((fish) => fish.clean).length,
    bank: mostCommon(draft.fish.map((fish) => fish.spot)),
    hour: mostCommon(draft.fish.map((fish) => fish.hour)),
  };
}

/** "Dusk at the dock · overcast" */
export function sessionTitle(draft: SessionDraft): string {
  const summary = sessionSummary(draft);
  const when = summary.hour ? LAKE_HOUR_LABELS[summary.hour] : "A day";
  const where = summary.bank ? `at the ${SPOT_LABELS[summary.bank].toLowerCase()}` : "on the lake";
  return `${when} ${where} · ${SKY_LABELS[draft.sky].toLowerCase()}`;
}

function isSessionFish(value: unknown): value is SessionFish {
  if (typeof value !== "object" || value === null) return false;
  const fish = value as Record<string, unknown>;
  return (
    typeof fish.id === "string" &&
    typeof fish.speciesId === "string" &&
    typeof fish.speciesName === "string" &&
    typeof fish.weight === "number" &&
    Number.isFinite(fish.weight) &&
    SPOT_IDS.some((spot) => spot === fish.spot) &&
    typeof fish.hour === "string" &&
    isLakeHour(fish.hour) &&
    typeof fish.first === "boolean" &&
    typeof fish.clean === "boolean"
  );
}

export function parseSession(raw: string | null): SessionDraft | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const draft = value as Record<string, unknown>;
    if (typeof draft.id !== "string" || typeof draft.date !== "string" || !isSky(draft.sky)) return null;
    if (!Array.isArray(draft.fish) || !draft.fish.every(isSessionFish)) return null;
    return { id: draft.id, date: draft.date, sky: draft.sky, fish: draft.fish };
  } catch {
    return null;
  }
}

export function loadSession(userId: string): SessionDraft | null {
  try {
    return parseSession(localStorage.getItem(sessionKey(userId)));
  } catch {
    return null;
  }
}

export function saveSession(userId: string, draft: SessionDraft | null) {
  try {
    if (draft) localStorage.setItem(sessionKey(userId), JSON.stringify(draft));
    else localStorage.removeItem(sessionKey(userId));
  } catch {
    // Private mode: the outing still recaps this visit.
  }
}
