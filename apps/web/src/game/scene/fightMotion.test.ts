import { describe, expect, it } from "vitest";
import {
  FISH_LEAP_SEC,
  HOOKSET_SEC,
  STRIKE_SNAP_SEC,
  TUG_SEC,
  biteRodPitch,
  bobberPull,
  fightBodyLean,
  fightLineSag,
  fightRodPitch,
  fightRodRoll,
  fishLeadMeters,
  fishLeapHeight,
  fishSideMeters,
  hooksetTug,
  loadedFightPitch,
  reelPumpLift,
  type RodInput,
} from "./fightMotion.ts";

function rod(over: Partial<RodInput> = {}): RodInput {
  return {
    tension: 0.4,
    surge: 0,
    reeling: false,
    strikeAge: 2,
    biteAge: 0,
    time: 0,
    pump: 0,
    fromPitch: 1.5,
    ...over,
  };
}

describe("fight motion", () => {
  it("loads the rod on the bite, snaps it up to set the hook, then bends on a run", () => {
    const bite = biteRodPitch(0.3, 0);
    expect(bite).toBeGreaterThan(biteRodPitch(0, 0));
    const strike = fightRodPitch(rod({ strikeAge: STRIKE_SNAP_SEC, fromPitch: bite }));
    expect(strike).toBeLessThan(bite - 0.6);
    expect(fightRodPitch(rod({ strikeAge: STRIKE_SNAP_SEC + 0.1, fromPitch: bite }))).toBeLessThan(0.5);
    const running = loadedFightPitch(0.75, 2, false, 0, 0);
    const calm = loadedFightPitch(0.75, 0, false, 0, 0);
    expect(running).toBeGreaterThan(calm + 0.3);
    const settled = fightRodPitch(rod({ strikeAge: HOOKSET_SEC, tension: 0.75, surge: 2 }));
    expect(settled).toBeCloseTo(running, 5);
  });

  it("lifts the rod on a retrieve and keeps it buried when the fish is running", () => {
    expect(reelPumpLift(0)).toBeCloseTo(0);
    expect(reelPumpLift(0.62)).toBeCloseTo(1);
    expect(reelPumpLift(0.99)).toBeLessThan(0.1);
    const held = loadedFightPitch(0.4, 0, false, 0.62, 0);
    const pumping = loadedFightPitch(0.4, 0, true, 0.62, 0);
    expect(pumping).toBeLessThan(held - 0.3);
    const horsing = loadedFightPitch(0.4, 2, true, 0.62, 0);
    const running = loadedFightPitch(0.4, 2, false, 0.62, 0);
    expect(running - horsing).toBeLessThan(held - pumping);
  });

  it("sends the fish out on a run and hauls the lead back while reeling", () => {
    expect(fishLeadMeters(2, false)).toBeGreaterThan(fishLeadMeters(0, false) + 0.7);
    expect(fishLeadMeters(2, true)).toBeLessThan(fishLeadMeters(2, false));
    expect(fishLeadMeters(0, true)).toBeLessThan(fishLeadMeters(0, false));
    expect(fishSideMeters(2, 1)).toBeGreaterThan(0.8);
    expect(fishSideMeters(2, -1)).toBeLessThan(-0.8);
    expect(fishSideMeters(1, 1)).toBeGreaterThan(fishSideMeters(0, 1));
    expect(bobberPull(2, false)).toBeGreaterThan(bobberPull(2, true));
    expect(bobberPull(0, false)).toBe(0);
  });

  it("tightens the line on a run without a deeper belly than a slack fight", () => {
    const slack = fightLineSag(0, 0, false, 0);
    expect(slack).toBeCloseTo(0.54);
    expect(fightLineSag(0, 2, false, 0)).toBeLessThan(0.06);
    expect(fightLineSag(0.2, 0, true, 0.62)).toBeLessThan(fightLineSag(0.2, 0, false, 0));
    expect(fightLineSag(0, 0, true, 0)).toBeLessThanOrEqual(slack);
    expect(hooksetTug(-1)).toBe(0);
    expect(hooksetTug(0)).toBe(0);
    expect(hooksetTug(TUG_SEC / 2)).toBeCloseTo(1);
    expect(hooksetTug(TUG_SEC)).toBeCloseTo(0);
    expect(fishLeapHeight(-1)).toBe(0);
    expect(fishLeapHeight(FISH_LEAP_SEC / 2)).toBeGreaterThan(1);
    expect(fishLeapHeight(FISH_LEAP_SEC)).toBe(0);
  });

  it("leans back into the set and gets dragged forward on a run", () => {
    expect(fightBodyLean(0, false, -1)).toBeGreaterThan(0);
    expect(fightBodyLean(0, false, 0.08)).toBeLessThan(0);
    expect(fightBodyLean(0, true, 2)).toBeLessThan(0);
    expect(fightBodyLean(2, false, 2)).toBeGreaterThan(0);
    expect(fightRodRoll(2, 1, 0, 2, 0)).toBeGreaterThan(0.2);
    expect(fightRodRoll(2, -1, 0, 2, 0)).toBeLessThan(-0.2);
  });
});
