import { describe, expect, it } from "vitest";
import { spotAt } from "@stillwater/shared";
import { LOG_REACH, tightToLog } from "./sunkenLog";
import { BASKING_LOG } from "./scene/turtleMotion";

describe("tightToLog", () => {
  const { x, z, length, yaw } = BASKING_LOG;
  const end = { x: x + (length / 2) * Math.cos(yaw), z: z - (length / 2) * Math.sin(yaw) };

  it("lands tight along the whole log, out to its reach", () => {
    expect(tightToLog(x, z)).toBe(true);
    expect(tightToLog(end.x, end.z)).toBe(true);
    // Square off the log's side, just inside and just past the reach.
    const side = { x: Math.sin(yaw), z: Math.cos(yaw) };
    expect(tightToLog(x + side.x * LOG_REACH * 0.95, z + side.z * LOG_REACH * 0.95)).toBe(true);
    expect(tightToLog(x + side.x * LOG_REACH * 1.1, z + side.z * LOG_REACH * 1.1)).toBe(false);
  });

  it("stops past the log's ends", () => {
    const out = (length / 2 + LOG_REACH + 0.2);
    expect(tightToLog(x + out * Math.cos(yaw), z - out * Math.sin(yaw))).toBe(false);
  });

  it("lies in the Point's water, so it is fished from there", () => {
    expect(spotAt(x, z)).toBe("point");
    expect(spotAt(end.x, end.z)).toBe("point");
  });
});
