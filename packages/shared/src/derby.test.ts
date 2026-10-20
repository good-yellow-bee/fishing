import { describe, expect, it } from "vitest";
import { fishById } from "./fish.ts";
import { derbyOn, nextDerby, pastDerbies } from "./derby.ts";

describe("the weekend derby", () => {
  it("runs Saturday and Sunday UTC, naming the same non-legendary fish for the whole weekend", () => {
    const saturday = new Date(Date.UTC(2026, 9, 24, 0, 0));
    const sunday = new Date(Date.UTC(2026, 9, 25, 23, 59));
    expect(derbyOn(saturday)).toEqual({ from: "2026-10-24T00:00:00.000Z", to: "2026-10-26T00:00:00.000Z", fishId: derbyOn(sunday)!.fishId });
    expect(fishById(derbyOn(saturday)!.fishId)!.rarity).not.toBe("legendary");
    expect(derbyOn(new Date(Date.UTC(2026, 9, 26, 0, 0)))).toBeNull();
    expect(derbyOn(new Date(Date.UTC(2026, 9, 23, 23, 59)))).toBeNull();
    expect(nextDerby(new Date(Date.UTC(2026, 9, 21))).from).toBe("2026-10-24T00:00:00.000Z");
  });

  it("lists the derbies that have ended, newest first", () => {
    const past = pastDerbies(new Date(Date.UTC(2026, 9, 1)), new Date(Date.UTC(2026, 9, 25, 12)));
    expect(past.map((derby) => derby.from)).toEqual(["2026-10-17T00:00:00.000Z", "2026-10-10T00:00:00.000Z", "2026-10-03T00:00:00.000Z"]);
  });
});
