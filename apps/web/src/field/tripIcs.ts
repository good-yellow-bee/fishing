import { foldText, type SpotPlace, type Trip } from "@stillwater/shared";

/** Calendar text escapes backslashes, commas, semicolons and line breaks. */
function icsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

const encoder = new TextEncoder();

/** Calendar lines stop at 75 bytes; longer ones go on over lines that start with a space. */
function fold(line: string): string {
  const parts: string[] = [];
  let part = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    // The space that opens a carried-on line counts toward its 75.
    if (bytes + size > (parts.length === 0 ? 75 : 74)) {
      parts.push(part);
      part = "";
      bytes = 0;
    }
    part += char;
    bytes += size;
  }
  parts.push(part);
  return parts.join("\r\n ");
}

function nextDay(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d + 1));
  return date.toISOString().slice(0, 10);
}

/** One all-day calendar event for an outing, for any calendar app to import. */
/** `at` is the water's own place, when the angler noted it: calendar apps can open it on a map. */
export function tripIcs(trip: Trip, place: string | null, now: Date = new Date(), at?: SpotPlace): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Stillwater//Field log//EN",
    "BEGIN:VEVENT",
    `UID:${trip.id}@stillwater`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${trip.date.replace(/-/g, "")}`,
    `DTEND;VALUE=DATE:${nextDay(trip.date).replace(/-/g, "")}`,
    `SUMMARY:${icsText(trip.title)}`,
    ...(place ? [`LOCATION:${icsText(place)}`] : []),
    ...(at ? [`GEO:${at.lat};${at.lng}`] : []),
    ...(trip.note ? [`DESCRIPTION:${icsText(trip.note)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

export function tripIcsName(trip: Trip): string {
  // Folded as the search folds it, so "Łowienie" keeps its Ł as an l.
  const slug = foldText(trip.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "outing";
  return `stillwater-${trip.date}-${slug}.ics`;
}
