import type { Trip } from "@stillwater/shared";

/** The longest a note's line runs in the water page's list before it is cut. */
const EXCERPT = 100;

/** The latest notes written on outings already fished, newest first, each as its first line, cut short when long. */
export function notesHere(trips: readonly Trip[], today: string, limit = 3): { trip: Trip; text: string }[] {
  return trips
    .filter((trip) => trip.date <= today && trip.note.trim())
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
    .map((trip) => {
      const line = trip.note.trim().split(/\r\n|\r|\n/)[0]!.trim();
      const more = line.length > EXCERPT || trip.note.trim().length > line.length;
      return { trip, text: line.length > EXCERPT ? `${line.slice(0, EXCERPT - 1).trimEnd()}…` : more ? `${line}…` : line };
    });
}
