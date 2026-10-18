import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, inLake, lakeEdge } from "@stillwater/shared";
import { FLOAT_AT, LOOK_ROUND_SEC, ROD_TIP, SEAT_AT, floatGlow, headlampLook, headlampOut } from "./headlampFishing";
import { CAMP_FIRE_AT } from "./campTent";

function onLand({ x, z }: { x: number; z: number }) {
  const nx = x / LAKE_RX;
  const nz = (z - LAKE_CENTER_Z) / LAKE_RZ;
  return Math.hypot(nx, nz) > lakeEdge(Math.atan2(-nz, nx)) + 0.03;
}

describe("night angler with a headlamp", () => {
  it("is out at dusk and at night from spring to fall when it is dry and clear of fog", () => {
    expect(headlampOut("night", "clear", "summer")).toBe(true);
    expect(headlampOut("dusk", "overcast", "fall")).toBe(true);
    expect(headlampOut("day", "clear", "summer")).toBe(false);
    expect(headlampOut("night", "rain", "summer")).toBe(false);
    expect(headlampOut("night", "fog", "summer")).toBe(false);
    expect(headlampOut("night", "clear", "winter")).toBe(false);
  });

  it("sits on the middle of the far bank with the rod out over the water and the float on it, well away from the campers", () => {
    expect(onLand(SEAT_AT)).toBe(true);
    expect(SEAT_AT.z).toBeLessThan(LAKE_CENTER_Z - LAKE_RZ);
    expect(Math.abs(SEAT_AT.x)).toBeLessThan(4);
    expect(inLake(FLOAT_AT.x, FLOAT_AT.z)).toBe(true);
    expect(ROD_TIP.y).toBeGreaterThan(1);
    expect(Math.hypot(CAMP_FIRE_AT.x - SEAT_AT.x, CAMP_FIRE_AT.z - SEAT_AT.z)).toBeGreaterThan(8);
  });

  it("turns the head smoothly between the float, the tackle box and along the water, mostly on the float", () => {
    let last = headlampLook(0);
    let onFloat = 0;
    let down = false;
    let samples = 0;
    for (let t = 0.02; t < LOOK_ROUND_SEC; t += 0.02) {
      const look = headlampLook(t);
      expect(Math.abs(look.yaw - last.yaw)).toBeLessThan(0.05);
      expect(Math.abs(look.pitch - last.pitch)).toBeLessThan(0.05);
      if (look.yaw === 0 && look.pitch < -0.2 && look.pitch > -0.25) onFloat += 1;
      if (look.pitch < -0.9) down = true;
      samples += 1;
      last = look;
    }
    expect(onFloat / samples).toBeGreaterThan(0.5);
    expect(down).toBe(true);
  });

  it("keeps the float glowing, and holds the look on it under reduced motion", () => {
    for (let t = 0; t < 20; t += 0.5) {
      expect(floatGlow(t)).toBeGreaterThan(0.6);
      expect(floatGlow(t)).toBeLessThanOrEqual(1);
    }
    expect(headlampLook(11, true)).toEqual(headlampLook(0));
  });
});
