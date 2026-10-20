import { describe, expect, it } from "vitest";
import { DOCK_PLANKS, LAKE_CENTER_Z, inLake, onDockPlanks } from "@stillwater/shared";
import { BANK_BOARDS, onBankBoard } from "./bankWalk";
import { stakeAt } from "./stakeSpot";

describe("the night line's stake", () => {
  it("stands on the dock's deck, leaning out west over the water", () => {
    const stake = stakeAt("dock")!;
    expect(onDockPlanks(stake.x, stake.z)).toBe(true);
    expect(stake.y).toBe(DOCK_PLANKS.top);
    expect(Math.sin(stake.yaw)).toBeCloseTo(-1, 5);
  });

  it("stands on each bank at the waterline, leaning toward the lake", () => {
    for (const bank of ["point", "reeds", "dropoff", "inlet"] as const) {
      const stake = stakeAt(bank)!;
      expect(inLake(stake.x, stake.z), bank).toBe(false);
      expect(BANK_BOARDS.some((board) => onBankBoard(board, stake.x, stake.z)), bank).toBe(false);
      // Where its line meets the water, out along its lean, is the lake (the inlet's narrow tip counts as lake further in).
      const reach = bank === "inlet" ? 2.5 : 2;
      const out = { x: stake.x + Math.sin(stake.yaw) * reach, z: stake.z + Math.cos(stake.yaw) * reach };
      expect(inLake(out.x, out.z), bank).toBe(true);
      expect(Math.sin(stake.yaw) * -stake.x + Math.cos(stake.yaw) * (LAKE_CENTER_Z - stake.z), bank).toBeGreaterThan(0);
    }
    expect(stakeAt("open")).toBeNull();
  });
});
