import { afterEach, describe, expect, it } from "vitest";
import { setLang, t } from "../i18n";
import { bookSpelling, pieceName } from "./gear/pieceKey";
import { notYetThisYear } from "./bests/notYet";

afterEach(() => setLang("en"));

describe("round 104: a kind typed in the plural with -es", () => {
  it("reads as the dictionary's kind", () => {
    expect(bookSpelling("Perches")).toBe("Perch");
    expect(bookSpelling("spinners")).toBe("Spinner");
    expect(bookSpelling("Glasses")).toBe("Glasses");
    setLang("pl");
    expect(pieceName("perches ")).toBe(t("Perch"));
  });
});

describe("round 104: not yet this year", () => {
  const fish = (id: string, species: string, caughtAt: string) => ({ id, species, measure: { kind: "length" as const, inches: 10 }, lure: "Jig", spotId: "own", tripId: null, caughtAt, note: "", weather: null });

  it("takes a kind however it was typed, without the dictionary", () => {
    const catches = [fish("a", "Perches", "2026-05-01T08:00:00.000Z"), fish("b", "Perch", "2027-02-01T08:00:00.000Z")];
    expect(notYetThisYear(catches, new Date(2027, 2, 1))).toEqual([]);
  });

  it("names a kind as most of last year's fish were written", () => {
    const catches = [fish("a", "Perch", "2026-05-01T08:00:00.000Z"), fish("b", "Perch", "2026-06-01T08:00:00.000Z"), fish("c", "perches", "2026-07-01T08:00:00.000Z")];
    expect(notYetThisYear(catches, new Date(2027, 2, 1))).toEqual(["Perch"]);
  });
});
