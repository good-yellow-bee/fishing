import { describe, expect, it } from "vitest";
import { anotherCatchLink } from "./anotherCatch";

describe("log another from a fish of an earlier day", () => {
  const fish = { spotId: "s1", species: "Walleye", lure: "Jig", tripId: "t1", measure: { kind: "length" as const } };

  it("carries that fish's time only when asked", () => {
    expect(anotherCatchLink(fish)).not.toContain("at=");
    expect(new URL(anotherCatchLink(fish, "2026-09-19T07:30"), "https://x").searchParams.get("at")).toBe("2026-09-19T07:30");
  });
});
