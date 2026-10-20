import { describe, expect, it } from "vitest";
import { fishById } from "./fish.ts";
import { derbyOn, lastDerby, nextDerby, pastDerbies } from "./derby.ts";

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
    const past = pastDerbies(new Date(Date.UTC(2026, 9, 1)), new Date(Date.UTC(2026, 10, 15, 12)));
    // Never before the first derby, whatever `since` asks.
    expect(past.map((derby) => derby.from)).toEqual(["2026-11-14T00:00:00.000Z", "2026-11-07T00:00:00.000Z", "2026-10-31T00:00:00.000Z", "2026-10-24T00:00:00.000Z"].slice(1));
    expect(lastDerby(new Date(Date.UTC(2026, 10, 15, 12)))!.from).toBe("2026-11-07T00:00:00.000Z");
    expect(lastDerby(new Date(Date.UTC(2026, 10, 16, 1)))!.from).toBe("2026-11-14T00:00:00.000Z");
    expect(lastDerby(new Date(Date.UTC(2026, 9, 25)))).toBeNull();
  });
});
