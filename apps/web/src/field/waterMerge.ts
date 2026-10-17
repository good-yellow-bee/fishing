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
