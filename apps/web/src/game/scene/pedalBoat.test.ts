import { describe, expect, it } from "vitest";
import { OPEN_PAD, inLake } from "@stillwater/shared";
import { canoeRoute } from "./canoeTrip";
import { CORMORANT_ROCK } from "./cormorantPerch";
import { LAP_SEC, pedaloAt, pedaloOut } from "./pedalBoat";
import { sailingOut } from "./sailingTrip";

const CALM = { x: 0.01, z: 0.01 };
const BREEZY = { x: 0.05, z: -0.06 };

describe("swan pedalo", () => {
  it("goes out on calm, fine summer days", () => {
    expect(pedaloOut("day", "clear", "summer", CALM)).toBe(true);
    expect(pedaloOut("day", "partly-cloudy", "summer", CALM)).toBe(true);
    expect(pedaloOut("day", "overcast", "summer", CALM)).toBe(false);
    expect(pedaloOut("day", "rain", "summer", CALM)).toBe(false);
    expect(pedaloOut("day", "clear", "spring", CALM)).toBe(false);
    expect(pedaloOut("dusk", "clear", "summer", CALM)).toBe(false);
    expect(pedaloOut("day", "clear", "summer", BREEZY)).toBe(false);
  });

  it("never shares the water with the sailing dinghy", () => {
    for (const wind of [CALM, BREEZY, { x: 0.035, z: 0 }, { x: 0, z: 0.0349 }]) {
      expect(pedaloOut("day", "clear", "summer", wind) && sailingOut("day", "clear", "summer", wind)).toBe(false);
    }
  });

  it("keeps to open water, clear of the canoe's route, the open-water spot and the cormorant's rock", () => {
    for (let t = 0; t < LAP_SEC; t += 0.5) {
      const pose = pedaloAt(t);
      expect(inLake(pose.x, pose.z)).toBe(true);
      for (let u = 0; u <= 1; u += 0.05) {
        const canoe = canoeRoute(u);
        expect(Math.hypot(pose.x - canoe.x, pose.z - canoe.z)).toBeGreaterThan(3);
      }
      expect(Math.hypot(pose.x - OPEN_PAD.x, pose.z - OPEN_PAD.z)).toBeGreaterThan(2.5);
      expect(Math.hypot(pose.x - CORMORANT_ROCK.x, pose.z - CORMORANT_ROCK.z)).toBeGreaterThan(2);
    }
  });

  it("heads the way it is going round its loop", () => {
    for (let t = 0; t < LAP_SEC; t += 3) {
      const here = pedaloAt(t);
      const next = pedaloAt(t + 0.2);
      const heading = Math.atan2(next.x - here.x, next.z - here.z);
      expect(Math.abs(Math.atan2(Math.sin(heading - here.yaw), Math.cos(heading - here.yaw)))).toBeLessThan(0.05);
    }
  });

  it("holds still with reduced motion", () => {
    expect(pedaloAt(3, true)).toEqual(pedaloAt(40, true));
  });
});
