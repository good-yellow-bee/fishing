import { inLake } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import {
  BITE_SLACK_END,
  BITE_TAP_SEC,
  BITE_THROB_SEC,
  BITE_YANK_END,
  FISH_LEAP_SEC,
  HOOKSET_SEC,
  STRIKE_SNAP_SEC,
  TUG_SEC,
  applyBiteDart,
  biteDart,
  biteLineSag,
  bitePlunge,
  biteRodPitch,
  bobberPull,
  fightBodyLean,
  fightLineSag,
  fightRodPitch,
  fightRodRoll,
  applyRetrieve,
  clearFightLine,
  dockLineLips,
  fishDepthMeters,
  fishLeadMeters,
  fishLeapHeight,
  fishSideMeters,
  hooksetTug,
  loadedFightPitch,
  reelPumpLift,
  retrieveHang,
  retrieveHop,
  retrieveWake,
  retrieveWeave,
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
    const rest = biteRodPitch(0, 0);
    const tap = biteRodPitch(BITE_TAP_SEC / 2, 0);
    const slack = biteRodPitch((BITE_TAP_SEC + BITE_SLACK_END) / 2, 0);
    const yanked = biteRodPitch(BITE_YANK_END, 0);
    expect(tap).toBeGreaterThan(rest + 0.2);
    expect(slack).toBeLessThan(tap - 0.15);
    expect(yanked).toBeGreaterThan(tap);
    const down = biteRodPitch(BITE_YANK_END + BITE_THROB_SEC * 0.25, 0);
    const up = biteRodPitch(BITE_YANK_END + BITE_THROB_SEC * 0.75, 0);
    expect(down).toBeGreaterThan(up + 0.15);
    expect(bitePlunge(BITE_YANK_END)).toBeGreaterThan(bitePlunge(BITE_TAP_SEC / 2) + 0.2);
    expect(bitePlunge(BITE_YANK_END + BITE_THROB_SEC * 0.25)).toBeGreaterThan(bitePlunge(BITE_YANK_END));
    expect(bitePlunge(BITE_YANK_END + BITE_THROB_SEC * 0.75)).toBeLessThan(0.08);
    expect(biteLineSag(0.05)).toBeGreaterThan(biteLineSag(BITE_YANK_END) + 0.15);
    expect(biteDart(BITE_SLACK_END)).toBe(0);
    expect(biteDart((BITE_SLACK_END + BITE_YANK_END) / 2)).toBeGreaterThan(0.2);
    const darted = applyBiteDart(0, -4, 0, 2, (BITE_SLACK_END + BITE_YANK_END) / 2);
    expect(inLake(darted.x, darted.z)).toBe(true);
    expect(Math.abs(darted.x)).toBeGreaterThan(0.15);
    expect(applyBiteDart(0, -4, 0, 2, 0)).toEqual({ x: 0, z: -4 });
    expect(Math.abs(fightRodRoll(0, 0, 0, -1, (BITE_SLACK_END + BITE_YANK_END) / 2))).toBeGreaterThan(0.1);
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
    expect(fishDepthMeters(0)).toBeGreaterThan(0.34);
    expect(fishDepthMeters(2)).toBeLessThan(0.08);
    const buried = loadedFightPitch(1, 2, false, 0, Math.PI / 54);
    expect(buried).toBeLessThan(1.56);
    expect(buried).toBeGreaterThan(loadedFightPitch(1, 0, false, 0, Math.PI / 54) + 0.3);
  });

  it("keeps the fight line off the dock deck and the ground", () => {
    expect(clearFightLine(0.1, 0, 6.5)).toBeGreaterThan(0.7);
    expect(clearFightLine(1.4, 0, 6.5)).toBe(1.4);
    expect(clearFightLine(-0.4, 0, 16)).toBeGreaterThan(0.1);
    expect(clearFightLine(-0.25, 0, 0)).toBe(-0.25);
  });

  it("hauls the lure in on each pump and keeps that dart off the bank", () => {
    expect(retrieveHang(0, true, 0)).toBeGreaterThan(0.8);
    expect(retrieveHang(0.62, true, 0)).toBeCloseTo(0);
    expect(retrieveHang(0, false, 0)).toBe(0);
    expect(retrieveHang(0.3, true, 2)).toBe(0);
    expect(retrieveWeave(0.62, true, 0)).toBeGreaterThan(0.5);
    expect(retrieveWeave(1.62, true, 0)).toBeLessThan(-0.2);
    expect(retrieveWeave(0, true, 0)).toBeCloseTo(0);
    expect(retrieveHop(0.62, true, 0)).toBeGreaterThan(retrieveHop(0, true, 0));
    expect(retrieveWake(0.62, true, 0)).toBeGreaterThan(0.9);
    expect(retrieveWake(0.62, true, 2)).toBe(0);

    const reelX = 0;
    const reelZ = 8;
    const hung = applyRetrieve(0, -4, reelX, reelZ, 0, true, 0);
    const hauled = applyRetrieve(0, -4, reelX, reelZ, 0.62, true, 0);
    const hungReach = Math.hypot(hung.x - reelX, hung.z - reelZ);
    const hauledReach = Math.hypot(hauled.x - reelX, hauled.z - reelZ);
    expect(hungReach).toBeGreaterThan(12.7);
    expect(hauledReach).toBeLessThan(hungReach - 0.3);
    expect(Math.abs(hauled.x)).toBeGreaterThan(0.2);
    const still = applyRetrieve(0, -4, reelX, reelZ, 0.62, false, 0);
    expect(still).toEqual({ x: 0, z: -4 });
    const running = applyRetrieve(0, -4, reelX, reelZ, 0, true, 2);
    expect(running).toEqual({ x: 0, z: -4 });

    const edgeZ = -16.35;
    expect(inLake(0, edgeZ)).toBe(true);
    const shore = applyRetrieve(0, edgeZ, 0, -8, 0, true, 0);
    expect(inLake(shore.x, shore.z)).toBe(true);
    expect(shore.z).toBeGreaterThan(edgeZ - 0.48);
    const beside = applyRetrieve(1.2, 6.5, 0, 8, 1.62, true, 0);
    const onDeck = beside.x >= -1.05 && beside.x <= 1.05 && beside.z >= 5.2 && beside.z <= 8.5;
    expect(onDeck).toBe(false);
    const shaved = applyRetrieve(1.6, 6.5, 0, 8, 1.62, true, 0);
    expect(shaved.x).toBeGreaterThan(1.05 + 0.18);

    const end = dockLineLips(0, 0.72, 5.5, 0, 0.15, 4.4);
    expect(end).toHaveLength(1);
    expect(end[0]!.y).toBeGreaterThanOrEqual(0.72);
    expect(end[0]!.z).toBeCloseTo(5.2, 2);
    const side = dockLineLips(0, 0.8, 6.5, -2.2, 0.1, 6.5);
    expect(side[0]!.x).toBeCloseTo(-1.05, 2);
    expect(side[0]!.y).toBeGreaterThanOrEqual(0.72);
    expect(dockLineLips(3, 0.4, 2, 6, 0.2, -2)).toEqual([]);
    expect(dockLineLips(0, 1.6, 6.2, 0, 1.4, 4.2)).toEqual([]);
  });

  it("leans back into the set and gets dragged forward on a run", () => {
    expect(fightBodyLean(0, false, -1)).toBeGreaterThan(0);
    expect(fightBodyLean(0, false, -1, BITE_YANK_END)).toBeGreaterThan(fightBodyLean(0, false, -1, 0) + 0.1);
    expect(fightBodyLean(0, false, 0.08)).toBeLessThan(0);
    expect(fightBodyLean(0, true, 2)).toBeLessThan(0);
    expect(fightBodyLean(2, false, 2)).toBeGreaterThan(0);
    expect(fightRodRoll(2, 1, 0, 2, 0)).toBeGreaterThan(0.2);
    expect(fightRodRoll(2, -1, 0, 2, 0)).toBeLessThan(-0.2);
  });
});
