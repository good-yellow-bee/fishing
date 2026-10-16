import { describe, expect, it } from "vitest";
import { dateWords } from "./dateWords";

// A Friday.
const now = new Date(2026, 9, 16, 14, 0);
const day = (ymd: string) => ({ from: ymd, to: ymd });

describe("dateWords", () => {
  it("reads today, yesterday and weekdays, in English and Polish", () => {
    expect(dateWords("today", now)).toEqual(day("2026-10-16"));
    expect(dateWords("Wczoraj", now)).toEqual(day("2026-10-15"));
    expect(dateWords("dzis", now)).toEqual(day("2026-10-16"));
    expect(dateWords("sroda", now)).toEqual(dateWords("środa", now));
    expect(dateWords("15 pazdziernika", now)).toEqual(day("2026-10-15"));
    expect(dateWords("friday", now)).toEqual(day("2026-10-16"));
    expect(dateWords("saturday", now)).toEqual(day("2026-10-10"));
    expect(dateWords("sun", now)).toBeNull();
    expect(dateWords("poniedziałek", now)).toEqual(day("2026-10-12"));
  });

  it("reads weeks and months", () => {
    expect(dateWords("this week", now)).toEqual({ from: "2026-10-12", to: "2026-10-16" });
    expect(dateWords("last week", now)).toEqual({ from: "2026-10-05", to: "2026-10-11" });
    expect(dateWords("last month", now)).toEqual({ from: "2026-09-01", to: "2026-09-30" });
  });

  it("reads a day of a month as the cards write it, last year's when this year's is still to come", () => {
    expect(dateWords("Oct 15", now)).toEqual(day("2026-10-15"));
    expect(dateWords("october 15", now)).toEqual(day("2026-10-15"));
    expect(dateWords("15 października", now)).toEqual(day("2026-10-15"));
    expect(dateWords("15 paź", now)).toEqual(day("2026-10-15"));
    expect(dateWords("Dec 24", now)).toEqual(day("2025-12-24"));
    expect(dateWords("Feb 30", now)).toBeNull();
    expect(dateWords("Feb 29", new Date(2028, 0, 10))).toEqual(day("2024-02-29"));
    expect(dateWords("Feb 29", new Date(2029, 5, 1))).toEqual(day("2028-02-29"));
  });

  it("leaves other words alone", () => {
    expect(dateWords("pike", now)).toBeNull();
    expect(dateWords("dawn patrol", now)).toBeNull();
    expect(dateWords("mar", now)).toBeNull();
  });
});
