import { describe, expect, it } from "vitest";
import { slamBest, slamCompletedBy } from "./slams.ts";

describe("slams", () => {
  it("counts the most of each slam's kinds landed on one day", () => {
    const best = slamBest([
      { day: "2026-10-18", speciesId: "smallmouth-bass" },
      { day: "2026-10-19", speciesId: "largemouth-bass" },
      { day: "2026-10-20", speciesId: "brook-trout" },
      { day: "2026-10-20", speciesId: "rainbow-trout" },
      { day: "2026-10-20", speciesId: "rainbow-trout" },
    ]);
    expect(best).toEqual({ "bass-slam": 1, "trout-slam": 2 });
    expect(slamBest([{ day: "a", speciesId: "smallmouth-bass" }, { day: "a", speciesId: "largemouth-bass" }])["bass-slam"]).toBe(2);
  });

  it("names the slam a fish completes only as the last kind missing that day", () => {
    expect(slamCompletedBy(["smallmouth-bass", "perch"], "largemouth-bass")).toBe("bass-slam");
    expect(slamCompletedBy(["smallmouth-bass", "largemouth-bass"], "largemouth-bass")).toBeNull();
    expect(slamCompletedBy(["brook-trout"], "salmon")).toBeNull();
    expect(slamCompletedBy(["brook-trout", "salmon"], "rainbow-trout")).toBe("trout-slam");
    expect(slamCompletedBy([], "perch")).toBeNull();
  });
});
