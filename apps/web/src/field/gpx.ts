import { foldText, type Spot } from "@stillwater/shared";

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Waters with a place as GPX waypoints, named as the book names them, which a GPS, a sounder or a phone's map imports. */
export function gpxFor(spots: readonly Spot[]): string {
  const points = spots.flatMap((spot) =>
    spot.place
      ? [`  <wpt lat="${spot.place.lat}" lon="${spot.place.lng}">\n    <name>${escape(spot.name)}</name>${spot.notes.trim() ? `\n    <desc>${escape(spot.notes.trim())}</desc>` : ""}\n  </wpt>`]
      : [],
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Stillwater" xmlns="http://www.topografix.com/GPX/1/1">\n${points.join("\n")}\n</gpx>\n`;
}

/** A file name from a water's name: "Jezioro Łańskie" saves as "stillwater-jezioro-lanskie". */
export function fileSlug(name: string): string {
  const slug = foldText(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `stillwater-${slug || "water"}`;
}
