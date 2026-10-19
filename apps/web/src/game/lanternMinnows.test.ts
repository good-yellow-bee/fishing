import { describe, expect, it } from "vitest";
import { spotAt } from "@stillwater/shared";
import { amongLanternMinnows, MINNOW_REACH, minnowLike } from "./lanternMinnows";
import { MINNOW_POOL } from "./scene/minnowSwirl";

describe("amongLanternMinnows", () => {
  it("lands among the minnows in the lanterns' light after dark", () => {
    expect(amongLanternMinnows("night", MINNOW_POOL.x, MINNOW_POOL.z)).toBe(true);
    expect(amongLanternMinnows("night", MINNOW_POOL.x + MINNOW_POOL.r + MINNOW_REACH - 0.05, MINNOW_POOL.z)).toBe(true);
    expect(amongLanternMinnows("night", MINNOW_POOL.x + MINNOW_POOL.r + MINNOW_REACH + 0.2, MINNOW_POOL.z)).toBe(false);
  });

  it("finds no minnows while the lanterns are out, and the pool lies in the dock's water", () => {
    for (const hour of ["dawn", "day", "dusk"] as const) expect(amongLanternMinnows(hour, MINNOW_POOL.x, MINNOW_POOL.z)).toBe(false);
    expect(spotAt(MINNOW_POOL.x, MINNOW_POOL.z)).toBe("dock");
  });
});

describe("minnowLike", () => {
  it("takes a lure that swims like a small fish, not bait or a lure on top", () => {
    expect(minnowLike("Marabou jig")).toBe(true);
    expect(minnowLike("#5 Mepps")).toBe(true);
    expect(minnowLike("Kastmaster spoon")).toBe(true);
    expect(minnowLike("Shallow crankbait")).toBe(true);
    expect(minnowLike("Nightcrawlers")).toBe(false);
    expect(minnowLike("Popper")).toBe(false);
    expect(minnowLike(undefined)).toBe(false);
  });
});
