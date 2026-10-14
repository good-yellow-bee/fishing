import { describe, expect, it } from "vitest";
import { SIP_EVERY_SEC, SIP_FIRST_SEC, SIP_LIFT_SEC, SIP_SEC, sipWeight } from "./sipMotion";

describe("thermos sip", () => {
  it("waits a while after the cast before the first sip", () => {
    expect(sipWeight(-1)).toBe(0);
    expect(sipWeight(SIP_FIRST_SEC - 0.1)).toBe(0);
  });

  it("lifts the cup, holds it, and sets it back down", () => {
    expect(sipWeight(SIP_FIRST_SEC + SIP_LIFT_SEC / 2)).toBeGreaterThan(0);
    expect(sipWeight(SIP_FIRST_SEC + SIP_LIFT_SEC / 2)).toBeLessThan(1);
    expect(sipWeight(SIP_FIRST_SEC + SIP_LIFT_SEC + 0.5)).toBe(1);
    expect(sipWeight(SIP_FIRST_SEC + SIP_SEC + 0.1)).toBe(0);
  });

  it("comes round again while the float keeps sitting", () => {
    expect(sipWeight(SIP_FIRST_SEC + SIP_EVERY_SEC + SIP_LIFT_SEC + 0.5)).toBe(1);
    expect(sipWeight(SIP_FIRST_SEC + SIP_EVERY_SEC / 2)).toBe(0);
  });
});
