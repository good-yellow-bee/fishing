import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { dayMarks, markedMonths } from "./dayMarks";

describe("dayMarks", () => {
  it("counts each day's fish and notes the outings, only for the year asked", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const marks = dayMarks(book, "2026");
    const fish = [...marks.values()].reduce((sum, row) => sum + row.fish, 0);
    expect(fish).toBe(book.catches.filter((entry) => entry.caughtAt.startsWith("2026")).length);
    for (const trip of book.trips) if (trip.date.startsWith("2026")) expect(marks.get(trip.date)?.trips).toContain(trip.id);
    expect(dayMarks(book, "1999").size).toBe(0);
    expect(markedMonths(marks)).toEqual([...markedMonths(marks)].sort());
  });

  it("files a fish from after midnight under its outing's day, and names that outing", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const late = { ...book.catches[0]!, id: "late", tripId: "eve", caughtAt: new Date(2026, 9, 4, 1, 30).toISOString() };
    const marks = dayMarks({ ...book, trips: [{ id: "eve", date: "2026-10-03", spotId: late.spotId, title: "Evening", note: "" }], catches: [late] }, "2026");
    expect(marks.get("2026-10-03")).toEqual({ fish: 1, trips: ["eve"], lateTrip: "eve" });
    expect(marks.has("2026-10-04")).toBe(false);
  });

  it("leaves an outing whose fish were caught on another day as a day without fish", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const moved = { ...book.catches[0]!, id: "moved", tripId: "t1", caughtAt: new Date(2026, 8, 5, 12).toISOString() };
    const marks = dayMarks({ ...book, trips: [{ id: "t1", date: "2026-09-10", spotId: moved.spotId, title: "Moved", note: "" }], catches: [moved] }, "2026");
    expect(marks.get("2026-09-10")).toEqual({ fish: 0, trips: ["t1"], lateTrip: null });
    expect(marks.get("2026-09-05")?.fish).toBe(1);
  });
});
