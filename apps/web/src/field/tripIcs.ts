import type { Trip } from "@stillwater/shared";

/** Calendar text escapes backslashes, commas, semicolons and line breaks. */
function icsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function nextDay(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d + 1));
  return date.toISOString().slice(0, 10);
}

/** One all-day calendar event for an outing, for any calendar app to import. */
export function tripIcs(trip: Trip, place: string | null, now: Date = new Date()): string {
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
    ...(trip.note ? [`DESCRIPTION:${icsText(trip.note)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.join("\r\n")}\r\n`;
}

export function tripIcsName(trip: Trip): string {
  const slug = trip.title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "outing";
  return `stillwater-${trip.date}-${slug}.ics`;
}
