import { describe, expect, it } from "vitest";
import { SHOP_X, SHOP_Z } from "@stillwater/shared";
import { FIRE_AT } from "./campfireSmoke";
import { FIRESIDE_AT, FIRESIDE_YAW, LOOK_EVERY_SEC, NAP_AT, catAt, catPlace } from "./catNap";
import { SNOWMAN_AT } from "./snowmanLook";

describe("the shack's cat", () => {
  it("naps by day, sits by the fire while it burns, and keeps indoors in the rain", () => {
    expect(catPlace("day", "clear")).toBe("nap");
    expect(catPlace("day", "overcast")).toBe("nap");
    expect(catPlace("dusk", "clear")).toBe("fireside");
    expect(catPlace("night", "fog")).toBe("fireside");
    expect(catPlace("dawn", "clear")).toBe("fireside");
    expect(catPlace("day", "rain")).toBeNull();
    expect(catPlace("night", "rain")).toBeNull();
  });

  it("sits near the fire, clear of the stones, facing the flames", () => {
    const off = Math.hypot(FIRESIDE_AT.x - FIRE_AT.x, FIRESIDE_AT.z - FIRE_AT.z);
    expect(off).toBeGreaterThan(0.5);
    expect(off).toBeLessThan(1);
    const facing = { x: Math.sin(FIRESIDE_YAW), z: Math.cos(FIRESIDE_YAW) };
    expect(facing.x * (FIRE_AT.x - FIRESIDE_AT.x) + facing.z * (FIRE_AT.z - FIRESIDE_AT.z)).toBeCloseTo(off);
  });

  it("naps by the shack, out of the angler's spot and the snowman's", () => {
    expect(Math.hypot(NAP_AT.x - SHOP_X, NAP_AT.z - SHOP_Z)).toBeLessThan(2.5);
    expect(Math.hypot(NAP_AT.x - SHOP_X, NAP_AT.z - SHOP_Z)).toBeGreaterThan(1.2);
    expect(Math.hypot(NAP_AT.x - SNOWMAN_AT.x, NAP_AT.z - SNOWMAN_AT.z)).toBeGreaterThan(1);
  });

  it("now and then lifts its head from the nap, and twitches its tail tip in bursts", () => {
    const looks = Array.from({ length: LOOK_EVERY_SEC * 10 }, (_, i) => catAt(i / 10).look);
    expect(Math.max(...looks)).toBeCloseTo(1, 1);
    expect(looks.filter((look) => look === 0).length).toBeGreaterThan(looks.length / 2);
    const flicks = Array.from({ length: 200 }, (_, i) => Math.abs(catAt(i / 10).flick));
    expect(Math.max(...flicks)).toBeGreaterThan(0.3);
    expect(flicks.filter((flick) => flick < 0.01).length).toBeGreaterThan(40);
  });

  it("holds still when motion is reduced", () => {
    expect(catAt(3.2, true)).toEqual({ look: 0, turn: 0, flick: 0 });
  });
});
