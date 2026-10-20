import { foldText, type Spot } from "@stillwater/shared";
import { plainName } from "./tripDates";

// Characters XML forbids (pasted or imported: control characters, U+FFFE/U+FFFF, half a surrogate pair) read as a
// space: one would make the whole file unreadable to a GPS.
// eslint-disable-next-line no-control-regex
const NOT_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
const xmlText = (text: string) => text.replace(NOT_XML, " ").trim();
const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A coordinate as GPX takes it: to six places (about 11 cm), never "-1e-7" for a place right on the equator. */
const decimal = (value: number) => String(Number(value.toFixed(6)) || 0);

/** Waters with a place as GPX waypoints, named as the book names them, which a GPS, a sounder or a phone's map imports. */
export function gpxFor(spots: readonly Spot[]): string {
  const points = spots.flatMap((spot) =>
    spot.place
      ? [`  <wpt lat="${decimal(spot.place.lat)}" lon="${decimal(spot.place.lng)}">\n    <name>${escape(plainName(xmlText(spot.name)))}</name>${xmlText(spot.notes) ? `\n    <desc>${escape(xmlText(spot.notes))}</desc>` : ""}\n  </wpt>`]
      : [],
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Stillwater" xmlns="http://www.topografix.com/GPX/1/1">\n${points.join("\n")}\n</gpx>\n`;
}

/** A file name from a water's name: "Jezioro Łańskie" saves as "stillwater-jezioro-lanskie". */
export function fileSlug(name: string): string {
  const slug = foldText(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `stillwater-${slug || "water"}`;
}
