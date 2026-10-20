import { describe, expect, it } from "vitest";
import { addToBag, bagDay, bagOf, bagToBeat, bagTotal, BAG_SIZE } from "./dayBag.ts";

describe("the day's bag", () => {
  it("runs from UTC midnight to the next, one race for the whole lodge", () => {
    expect(bagDay(new Date(Date.UTC(2026, 9, 20, 23, 59)))).toEqual({ from: "2026-10-20T00:00:00.000Z", to: "2026-10-21T00:00:00.000Z" });
  });

  it("keeps the heaviest five fish and totals them", () => {
    const weights = [0.5, 3, 1.25, 0.4, 2, 0.75, 6];
    expect(bagOf(weights)).toEqual([6, 3, 2, 1.25, 0.75]);
    expect(bagOf(weights)).toHaveLength(BAG_SIZE);
    expect(bagTotal(weights)).toBe(13);
    expect(bagTotal([0.1, 0.2])).toBe(0.3);
  });

  it("takes any fish while it has room, then only one heavier than its lightest", () => {
    expect(bagToBeat([1, 2])).toBeNull();
    expect(bagToBeat([1, 2, 3, 4, 5, 0.5])).toBe(1);
  });

  it("says how much a new fish raised the bag", () => {
    expect(addToBag([1, 2], 0.5)).toEqual({ bag: [2, 1, 0.5], raisedBy: 0.5 });
    expect(addToBag([1, 2, 3, 4, 5], 0.5).raisedBy).toBe(0);
    expect(addToBag([1, 2, 3, 4, 5], 1.6)).toEqual({ bag: [5, 4, 3, 2, 1.6], raisedBy: 0.6 });
  });
});
