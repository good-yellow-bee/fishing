import { describe, expect, it } from "vitest";
import { GOLDEN_BONUS, GOLDEN_ODDS, isGolden } from "./golden.ts";
import { fishById } from "./fish.ts";
import { catchPoints, validateCatch } from "./rules.ts";

function uuid(i: number) {
  const hex = i.toString(16).padStart(12, "0");
  return `1e0a0c08-7e6d-4ee2-8718-${hex}`;
}

describe("golden fish", () => {
  it("lands golden about one time in forty, the same way every time", () => {
    const ids = Array.from({ length: 8000 }, (_, i) => uuid(i));
    const golden = ids.filter(isGolden).length;
    expect(golden / ids.length).toBeGreaterThan(0.6 / GOLDEN_ODDS);
    expect(golden / ids.length).toBeLessThan(1.4 / GOLDEN_ODDS);
    expect(ids.map(isGolden)).toEqual(ids.map(isGolden));
  });

  it("reads an ID the same in any case", () => {
    const id = Array.from({ length: 8000 }, (_, i) => uuid(i)).find(isGolden)!;
    expect(isGolden(id.toUpperCase())).toBe(true);
  });

  it("doubles the points the server pays", () => {
    const ids = Array.from({ length: 8000 }, (_, i) => uuid(i));
    const golden = ids.find(isGolden)!;
    const plain = ids.find((id) => !isGolden(id))!;
    const profile = { userId: "u", displayName: "A", points: 0, lifetimePoints: 0, strength: 5, accuracy: 1, patience: 1 };
    const fish = fishById("bluegill")!;
    const request = { speciesId: fish.id, weight: fish.minWeight, spot: fish.spots[0]! };
    const at = new Date("2026-07-15T12:00:00Z");
    const base = validateCatch(profile, { ...request, requestId: plain }, at);
    const gold = validateCatch(profile, { ...request, requestId: golden }, at);
    const none = validateCatch(profile, request, at);
    if (!base.ok || !gold.ok || !none.ok) throw new Error("rejected");
    expect(none.points).toBe(base.points);
    expect(gold.points).toBe(catchPoints(fish, fish.minWeight, false, GOLDEN_BONUS));
    expect(gold.points).toBeGreaterThan(base.points);
  });
});
