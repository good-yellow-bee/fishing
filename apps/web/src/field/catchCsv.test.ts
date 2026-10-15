import { afterEach, describe, expect, it } from "vitest";
import { sampleLogbook, type Logbook } from "@stillwater/shared";
import { reloadLang, setLang, setUnits } from "../i18n";
import { catchesCsv } from "./catchCsv";

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
    expect(lines[0]).toBe("Date,Time,Species,Length (in),Weight (lb),Lure or bait,Water,Trip,Sky,Wind,Water °F,Note");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatch(/^2026-09-30,06:40,[^,]+,10,,/);
    expect(lines[1]!.endsWith(',"Hit on the ""pause"", twice"')).toBe(true);
  });

  it("uses semicolons, decimal commas and metric for a Polish reader", () => {
    setLang("pl");
    setUnits("metric");
    const lines = catchesCsv(bookWith("Ok")).trimEnd().split("\r\n");
    expect(lines[0]).toContain("Długość (cm);Waga (kg)");
    expect(lines[1]).toMatch(/^2026-09-30;06:40;[^;]+;25,4;;/);
  });
});
