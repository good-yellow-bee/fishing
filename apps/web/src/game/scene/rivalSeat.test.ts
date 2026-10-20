import { describe, expect, it } from "vitest";
import { DOCK_STAND_X, DOCK_STAND_Z, LAKE_CENTER_Z, POINT_PAD, inLake } from "@stillwater/shared";
import { BANK_BOARDS, DROPOFF_STAND, INLET_STAND, REEDS_STAND, onBankBoard } from "./bankWalk";
import { rivalOut, rivalSeat } from "./rivalSeat";

const STANDS = { dock: { x: DOCK_STAND_X, z: DOCK_STAND_Z }, point: POINT_PAD, reeds: REEDS_STAND, dropoff: DROPOFF_STAND, inlet: INLET_STAND } as const;

describe("the other angler at the crowded bank", () => {
  it("sits ashore near each bank's stand, off the walk boards, facing the lake", () => {
    for (const [bank, stand] of Object.entries(STANDS) as [keyof typeof STANDS, { x: number; z: number }][]) {
      const seat = rivalSeat(bank)!;
      expect(inLake(seat.x, seat.z), bank).toBe(false);
      expect(Math.hypot(seat.x - stand.x, seat.z - stand.z), bank).toBeLessThan(bank === "dock" ? 8 : 4.5);
      expect(BANK_BOARDS.some((board) => onBankBoard(board, seat.x, seat.z)), bank).toBe(false);
      // Facing (sin yaw, cos yaw) points toward the lake's middle.
      const toMiddle = { x: -seat.x, z: LAKE_CENTER_Z - seat.z };
      expect(Math.sin(seat.yaw) * toMiddle.x + Math.cos(seat.yaw) * toMiddle.z, bank).toBeGreaterThan(0);
    }
  });

  it("keeps the point's and the reeds' chairs well apart", () => {
    const point = rivalSeat("point")!;
    const reeds = rivalSeat("reeds")!;
    expect(Math.hypot(point.x - reeds.x, point.z - reeds.z)).toBeGreaterThan(3);
  });

  it("is out from dawn to dusk, and no one else fishes open water", () => {
    expect(rivalOut("dawn")).toBe(true);
    expect(rivalOut("dusk")).toBe(true);
    expect(rivalOut("night")).toBe(false);
    expect(rivalSeat("open")).toBeNull();
  });
});
