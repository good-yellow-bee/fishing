import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { kindPairs } from "./kindPairs";

describe("one kind under two names", () => {
  const base = sampleLogbook(new Date(2026, 9, 15)).catches[0]!;
  const fish = (id: string, species: string) => ({ ...base, id, species });
  const pl: Record<string, string> = { "European perch": "Okoń", "Wels catfish": "Sum" };
  const show = (name: string) => pl[name] ?? name;

  it("pairs names that read the same, the fewer joined into the more", () => {
    const catches = [fish("a", "Okoń"), fish("b", "European perch"), fish("c", "European perch"), fish("d", "Sum"), fish("e", "Wels catfish"), fish("f", "Pike")];
    expect(kindPairs(catches, show)).toEqual([
      { shown: "Okoń", from: "Okoń", into: "European perch", fromCount: 1, intoCount: 2 },
      { shown: "Sum", from: "Sum", into: "Wels catfish", fromCount: 1, intoCount: 1 },
    ]);
  });

  it("leaves one name in two cases alone", () => {
    expect(kindPairs([fish("a", "pike"), fish("b", "Pike ")], show)).toEqual([]);
  });
});
