import type { Logbook, Trip } from "@stillwater/shared";

/** The most a lost or missed tally holds, and the longest an outing note runs, as the book allows. */
const TRIP_COUNT_CAP = 999;
const NOTE_CAP = 400;

/**
 * One water folded into another: its outings and fish move over (an outing on a day the kept water has one joins
 * that one), and it leaves the book. The water kept holds on to
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
  // The same day out logged on both phones: the moved outing folds into the kept water's outing of that date, its
  // fish, counts and note with it, rather than leaving two outings on one day.
  const sameDay = new Map<string, Trip>();
  for (const trip of book.trips) if (trip.spotId === into.id && !sameDay.has(trip.date)) sameDay.set(trip.date, trip);
  const foldInto = new Map<string, Trip>();
  for (const trip of book.trips) {
    const host = trip.spotId === from.id ? sameDay.get(trip.date) : undefined;
    if (host) foldInto.set(trip.id, host);
  }
  const folded = new Map<string, Trip>();
  for (const [id, host] of foldInto) {
    const trip = book.trips.find((each) => each.id === id)!;
    const was = folded.get(host.id) ?? host;
    const named = (title: string) => [from.name, into.name].some((name) => name.trim().toLowerCase() === title.trim().toLowerCase()) || !title.trim();
    const lost = Math.min(TRIP_COUNT_CAP, (was.lost ?? 0) + (trip.lost ?? 0));
    const missed = Math.min(TRIP_COUNT_CAP, (was.missed ?? 0) + (trip.missed ?? 0));
    folded.set(host.id, {
      ...was,
      title: named(was.title) && !named(trip.title) ? trip.title : was.title,
      note: [was.note.trim(), trip.note.trim()].filter((note, index, notes) => note && notes.indexOf(note) === index).join("\n").slice(0, NOTE_CAP),
      ...(lost > 0 ? { lost } : {}),
      ...(missed > 0 ? { missed } : {}),
    });
  }
  return {
    spots: book.spots.filter((spot) => spot.id !== from.id).map((spot) => (spot.id === into.id ? kept : spot)),
    trips: book.trips.filter((trip) => !foldInto.has(trip.id)).map((trip) => folded.get(trip.id) ?? (trip.spotId === from.id ? { ...trip, spotId: into.id } : trip)),
    catches: book.catches.map((entry) => {
      const host = entry.tripId ? foldInto.get(entry.tripId) : undefined;
      return entry.spotId === from.id || host ? { ...entry, ...(entry.spotId === from.id ? { spotId: into.id } : {}), ...(host ? { tripId: host.id } : {}) } : entry;
    }),
  };
}

/** What a merge would carry over, for the line under the picker: outings and fish moved, and outings that join one. */
export function mergeMoves(book: Logbook, fromId: string, intoId: string): { outings: number; fish: number; joined: number } {
  const days = new Set(book.trips.filter((trip) => trip.spotId === intoId).map((trip) => trip.date));
  const moved = book.trips.filter((trip) => trip.spotId === fromId);
  return {
    outings: moved.length,
    fish: book.catches.filter((entry) => entry.spotId === fromId).length,
    joined: moved.filter((trip) => days.has(trip.date)).length,
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
