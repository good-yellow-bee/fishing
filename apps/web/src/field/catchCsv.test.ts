import { afterEach, describe, expect, it } from "vitest";
import { sampleLogbook, type Logbook } from "@stillwater/shared";
import { reloadLang, setLang, setUnits } from "../i18n";
import { catchesCsv, cell, tripsCsv } from "./catchCsv";

function bookWith(note: string): Logbook {
  const book = sampleLogbook(new Date(2026, 9, 1));
  const first = book.catches.find((entry) => entry.measure.kind === "length")!;
  return { ...book, catches: [{ ...first, caughtAt: new Date(2026, 8, 30, 6, 40).toISOString(), note, measure: { kind: "length", inches: 10 } }] };
}

describe("the catches as a spreadsheet", () => {
  afterEach(() => {
    setUnits("imperial");
    setLang("en");
    reloadLang();
  });

  it("writes a header and one row per fish, quoting cells that need it", () => {
    const lines = catchesCsv(bookWith('Hit on the "pause", twice')).replace(/^﻿/, "").trimEnd().split("\r\n");
    expect(lines[0]).toBe("Date,Time,Outing day,Species,Length (in),Weight (lb),Lure or bait,Water,Trip,Sky,Wind,Water °F,Released,Note");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatch(/^2026-09-30,06:40,,[^,]+,10,,/);
    expect(lines[1]!.endsWith(',"Hit on the ""pause"", twice"')).toBe(true);
  });

  it("uses semicolons, decimal commas and metric for a Polish reader", () => {
    setLang("pl");
    setUnits("metric");
    const lines = catchesCsv(bookWith("Ok")).trimEnd().split("\r\n");
    expect(lines[0]).toContain("Długość (cm);Waga (kg)");
    expect(lines[1]).toMatch(/^2026-09-30;06:40;;[^;]+;25,4;;/);
  });
});

describe("a spreadsheet cell", () => {
  it("keeps text a spreadsheet would read as a formula as text, and leaves numbers alone", () => {
    expect(cell("=1+1", ",")).toBe("'=1+1");
    expect(cell("-fished the weed edge", ",")).toBe("'-fished the weed edge");
    expect(cell("@here", ",")).toBe("'@here");
    expect(cell("-3", ",")).toBe("-3");
    expect(cell("-1,5", ";")).toBe("-1,5");
    expect(cell("+1, nice", ",")).toBe(`"'+1, nice"`);
  });
});

describe("the outings as a spreadsheet", () => {
  afterEach(() => {
    setLang("en");
    reloadLang();
  });

  it("writes one row per outing, newest first, with its fish and its lost and missed counts", () => {
    const book = sampleLogbook(new Date(2026, 9, 1));
    const [first] = book.trips;
    const counted = { ...book, trips: book.trips.map((trip) => (trip.id === first!.id ? { ...trip, lost: 2, missed: 3 } : trip)) };
    const lines = tripsCsv(counted, "2099-01-01").replace(/^\ufeff/, "").trimEnd().split("\r\n");
    expect(lines[0]).toBe("Date,Trip,Water,Fish,Kinds,Lost fish,Missed strikes,Note");
    expect(lines).toHaveLength(book.trips.length + 1);
    const dates = lines.slice(1).map((line) => line.slice(0, 10));
    expect(dates).toEqual([...dates].sort().reverse());
    const row = lines.find((line) => line.startsWith(`${first!.date},`))!;
    const fish = book.catches.filter((entry) => entry.tripId === first!.id).length;
    // The kinds sit between the fish and the lost count, quoted when there are several.
    expect(row).toMatch(new RegExp(`,${fish},(?:"[^"]*"|[^,]*),2,3,`));
  });
});
