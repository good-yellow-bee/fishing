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
});
