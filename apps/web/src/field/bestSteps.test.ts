import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { bestSteps } from "./bestSteps";

describe("how the best of a kind grew", () => {
  const base = sampleLogbook(new Date(2026, 9, 15)).catches[0]!;
  const fish = (id: string, day: number, inches: number) => ({ ...base, id, caughtAt: `2026-0${day}-01T08:00:00.000Z`, measure: { kind: "length" as const, inches } });

  it("keeps the first fish and each that beat all before it, with the gain", () => {
    const steps = bestSteps([fish("d", 4, 14), fish("a", 1, 10), fish("b", 2, 9), fish("c", 3, 12), fish("e", 5, 14)], "length")!;
    expect(steps.map((step) => step.entry.id)).toEqual(["a", "c", "d"]);
    expect(steps.map((step) => step.gain)).toEqual([null, { kind: "length", inches: 2 }, { kind: "length", inches: 2 }]);
  });

  it("has nothing to tell when the first fish was never beaten, or for the other measure", () => {
    expect(bestSteps([fish("a", 1, 10), fish("b", 2, 9)], "length")).toBeNull();
    expect(bestSteps([fish("a", 1, 10), fish("c", 3, 12)], "weight")).toBeNull();
  });
});
