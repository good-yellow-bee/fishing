import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { biggestOf } from "./BiggestHere";

describe("biggestOf", () => {
  const base = sampleLogbook(new Date(2026, 9, 15)).catches[0]!;
  const fish = (id: string, inches: number, pounds?: number) => ({
    ...base,
    id,
    measure: { kind: "length" as const, inches },
    alsoMeasure: pounds === undefined ? undefined : { kind: "weight" as const, pounds },
  });

  it("finds the longest and the heaviest, which may be different fish", () => {
    const rows = [fish("a", 30, 6), fish("b", 32), fish("c", 28, 7)];
    expect(biggestOf(rows).longest?.id).toBe("b");
    expect(biggestOf(rows).heaviest?.id).toBe("c");
  });

  it("leaves a size nobody took empty", () => {
    expect(biggestOf([fish("a", 12)]).heaviest).toBeNull();
    expect(biggestOf([])).toEqual({ longest: null, heaviest: null });
  });
});
