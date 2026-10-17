import type { Logbook } from "@stillwater/shared";

/**
 * One water folded into another: its outings and fish move over, and it leaves the book. The water kept holds on to
 * its own notes, best conditions and place, taking the other's only where it had none. The book unchanged when either
 * water is missing or they are the same one.
 */
export function mergeWaters(book: Logbook, fromId: string, intoId: string): Logbook {
  const from = book.spots.find((spot) => spot.id === fromId);
  const into = book.spots.find((spot) => spot.id === intoId);
  if (!from || !into || from.id === into.id) return book;
  const kept = {
    ...into,
    notes: into.notes.trim() ? into.notes : from.notes,
    bestConditions: into.bestConditions.trim() ? into.bestConditions : from.bestConditions,
    ...(into.place ?? from.place ? { place: into.place ?? from.place } : {}),
  };
  return {
    spots: book.spots.filter((spot) => spot.id !== from.id).map((spot) => (spot.id === into.id ? kept : spot)),
    trips: book.trips.map((trip) => (trip.spotId === from.id ? { ...trip, spotId: into.id } : trip)),
    catches: book.catches.map((entry) => (entry.spotId === from.id ? { ...entry, spotId: into.id } : entry)),
  };
}

/** Where each water merged away in this browser went, so a water from an older file lands in the one it joined. */
export const MERGED_WATERS_KEY = "stillwater.field-log.merged-waters.v1";

export function readMergedWaters(): Record<string, string> {
  try {
    const raw = JSON.parse(localStorage.getItem(MERGED_WATERS_KEY) ?? "{}") as unknown;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw).filter((pair): pair is [string, string] => typeof pair[1] === "string"));
  } catch {
    return {};
  }
}

export function noteMergedWater(fromId: string, intoId: string) {
  try {
    localStorage.setItem(MERGED_WATERS_KEY, JSON.stringify({ ...readMergedWaters(), [fromId]: intoId }));
  } catch {
    // Only a guard for later file adds; the merge itself is already saved.
  }
}

/**
 * A file's book with every water merged away here moved into the one it joined: its fish and outings follow, and the
 * old water drops out. A merge that was undone (the water is back in `here`) is left alone.
 */
export function intoMergedWaters(file: Logbook, here: Logbook, merged: Record<string, string>): Logbook {
  const hereIds = new Set(here.spots.map((spot) => spot.id));
  const target = (id: string): string => {
    let at = id;
    // Follow a water merged more than once, as far as one still here.
    for (let step = 0; step < 10 && !hereIds.has(at) && merged[at]; step++) at = merged[at]!;
    return hereIds.has(at) ? at : id;
  };
  const moved = file.spots.some((spot) => target(spot.id) !== spot.id) || file.catches.some((entry) => target(entry.spotId) !== entry.spotId);
  if (!moved) return file;
  return {
    spots: file.spots.filter((spot) => target(spot.id) === spot.id),
    trips: file.trips.map((trip) => (target(trip.spotId) === trip.spotId ? trip : { ...trip, spotId: target(trip.spotId) })),
    catches: file.catches.map((entry) => (target(entry.spotId) === entry.spotId ? entry : { ...entry, spotId: target(entry.spotId) })),
  };
}
