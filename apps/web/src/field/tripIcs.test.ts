import { describe, expect, it } from "vitest";
import { tripIcs, tripIcsName } from "./tripIcs";

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
    expect(text).toContain("DESCRIPTION:Bring the net\; early\\nstart\r\n");
    expect(text).toContain("LOCATION:Cedar Bend\r\n");
  });

  it("leaves out an unknown place and an empty note", () => {
    const text = tripIcs({ ...trip, note: "" }, null);
    expect(text).not.toContain("LOCATION:");
    expect(text).not.toContain("DESCRIPTION:");
  });

  it("names the file by day and title", () => {
    expect(tripIcsName(trip)).toBe("stillwater-2026-10-31-dawn-patrol-weed-edge.ics");
    expect(tripIcsName({ ...trip, title: "Łódź o świcie" })).toBe("stillwater-2026-10-31-odz-o-swicie.ics");
  });
});
