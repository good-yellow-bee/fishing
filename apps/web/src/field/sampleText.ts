import { sampleLogbook, type Logbook } from "@stillwater/shared";
import { t } from "../i18n";

/** Every line the sample week writes; only these are put into the reader's language, never the player's own words. */
const SAMPLE_LINES: ReadonlySet<string> = (() => {
  const book = sampleLogbook(new Date());
  return new Set(
    [
      ...book.spots.flatMap((spot) => [spot.name, spot.notes, spot.bestConditions]),
      ...book.trips.flatMap((trip) => [trip.title, trip.note]),
      ...book.catches.map((entry) => entry.note),
    ].filter(Boolean),
  );
})();

const shown = (text: string) => (SAMPLE_LINES.has(text) ? t(text) : text);

/**
 * The book as the reader sees it: the sample week's invented waters, trips
 * and notes in their language. The stored book keeps the English lines, so
 * switching language switches them too; a sample line the player edits is
 * saved in their words like anything else.
 */
export function localizeSample(book: Logbook): Logbook {
  return {
    ...book,
    spots: book.spots.map((spot) => ({ ...spot, name: shown(spot.name), notes: shown(spot.notes), bestConditions: shown(spot.bestConditions) })),
    trips: book.trips.map((trip) => ({ ...trip, title: shown(trip.title), note: shown(trip.note) })),
    catches: book.catches.map((entry) => (SAMPLE_LINES.has(entry.note) ? { ...entry, note: t(entry.note) } : entry)),
  };
}
