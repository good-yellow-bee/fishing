import { describe, expect, it } from "vitest";
import { sampleLogbook, type CatchEntry } from "@stillwater/shared";
import { t } from "../i18n";
import { findCatches } from "./CatchSearch";

describe("big in a search", () => {
  const base = sampleLogbook(new Date(2026, 9, 15)).catches[0]!;
  const pike = (id: string, inches: number): CatchEntry => ({ ...base, id, species: "Northern pike", measure: { kind: "length", inches }, alsoMeasure: undefined });

  it("finds the fish bigger than their kind's typical size", () => {
    const catches = [pike("a", 20), pike("b", 22), pike("c", 24), pike("d", 26), pike("e", 30)];
    const book = { spots: [], trips: [], catches };
    expect(findCatches(book, "big", t).map((entry) => entry.id).sort()).toEqual(["d", "e"]);
    expect(findCatches(book, "duże", t)).toHaveLength(2);
  });

  it("leaves game fish out of the usual size", () => {
    const catches = [pike("a", 20), pike("b", 22), pike("c", 24), pike("d", 26), pike("e", 30), ...[1, 2, 3, 4, 5, 6].map((n) => ({ ...pike(`g${n}`, 10), spotId: "spot-stillwater" }))];
    const book = { spots: [], trips: [], catches };
    expect(findCatches(book, "big", t).map((entry) => entry.id).filter((id) => !id.startsWith("g")).sort()).toEqual(["d", "e"]);
  });
});
