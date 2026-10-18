import { describe, expect, it } from "vitest";
import { tripIcs, tripIcsName, tripsIcs } from "./tripIcs";

const trip = { id: "trip-dawn", date: "2026-10-31", spotId: "spot-cedar", title: "Dawn patrol, weed edge", note: "Bring the net; early\nstart" };

describe("trip calendar file", () => {
  it("makes one all-day event ending the next day, across a month end", () => {
    const text = tripIcs(trip, "Cedar Bend", new Date("2026-10-15T04:00:00.000Z"));
    expect(text).toContain("DTSTART;VALUE=DATE:20261031\r\n");
    expect(text).toContain("DTEND;VALUE=DATE:20261101\r\n");
    expect(text).toContain("DTSTAMP:20261015T040000Z\r\n");
    expect(text).toContain("UID:trip-dawn@stillwater\r\n");
    expect(text.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(text.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("escapes commas, semicolons and line breaks", () => {
    const text = tripIcs(trip, "Cedar Bend", new Date("2026-10-15T04:00:00.000Z"));
    expect(text).toContain("SUMMARY:Dawn patrol\\, weed edge\r\n");
    expect(text).toContain("DESCRIPTION:Bring the net\\; early\\nstart\r\n");
    expect(text).toContain("LOCATION:Cedar Bend\r\n");
  });

  it("gives the water's own place as coordinates", () => {
    const text = tripIcs(trip, "Cedar Bend", new Date("2026-10-15T04:00:00.000Z"), { lat: 46.848, lng: -94.14 });
    expect(text).toContain("GEO:46.848;-94.14\r\n");
  });

  it("leaves out an unknown place and an empty note", () => {
    const text = tripIcs({ ...trip, note: "" }, null);
    expect(text).not.toContain("GEO:");
    expect(text).not.toContain("LOCATION:");
    expect(text).not.toContain("DESCRIPTION:");
  });

  it("names the file by day and title", () => {
    expect(tripIcsName(trip)).toBe("stillwater-2026-10-31-dawn-patrol-weed-edge.ics");
    expect(tripIcsName({ ...trip, title: "Łódź o świcie" })).toBe("stillwater-2026-10-31-lodz-o-swicie.ics");
  });

  it("folds a long line at 75 bytes without splitting a letter", () => {
    const note = "Łowimy przy trzcinach, potem zmiana na głęboką wodę przy spadzie i powrót o zmierzchu.";
    const text = tripIcs({ ...trip, note }, null);
    const lines = text.split("\r\n");
    for (const line of lines) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    const description = text.slice(text.indexOf("DESCRIPTION:")).split("\r\nEND")[0]!.replace(/\r\n /g, "");
    expect(description).toBe(`DESCRIPTION:${note.replace(/,/g, "\\,")}`);
  });

  it("puts every outing coming up in one file, one event each", () => {
    const text = tripsIcs([{ trip, place: "Cedar Bend" }, { trip: { ...trip, id: "trip-2", date: "2026-11-07", title: "Second" }, place: null }], new Date(Date.UTC(2026, 9, 1)));
    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(text.match(/BEGIN:VCALENDAR/g)).toHaveLength(1);
    expect(text).toContain("UID:trip-2@stillwater");
    expect(text).toContain("DTSTART;VALUE=DATE:20261107");
  });
});
