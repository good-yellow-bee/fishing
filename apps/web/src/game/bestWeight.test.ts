import { describe, expect, it } from "vitest";
import type { Logbook } from "@stillwater/shared";
import { bestPounds } from "./bestWeight";

const entry = (species: string, measure: Logbook["catches"][number]["measure"]) => ({ species, measure }) as Logbook["catches"][number];

describe("bestPounds", () => {
  it("finds the heaviest weighed fish of the species and skips measured ones", () => {
    const book = {
      spots: [],
      trips: [],
      catches: [
        entry("Perch", { kind: "weight", pounds: 0.6 }),
        entry("Perch", { kind: "weight", pounds: 1.1 }),
        entry("Perch", { kind: "length", inches: 14 }),
        entry("Carp", { kind: "weight", pounds: 9 }),
      ],
    } as Logbook;
    expect(bestPounds(book, "Perch")).toBe(1.1);
    expect(bestPounds(book, "Pike")).toBeNull();
  });
});
