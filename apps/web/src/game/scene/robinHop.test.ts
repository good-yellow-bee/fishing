import { describe, expect, it } from "vitest";
import { FIRST_SEC, GROUND_SEC, HOP_GAP_SEC, HOP_VISIT_SEC, hopAt, hopStart, hopStep, robinGround, type Angler, type HopState, type HopWorld } from "./robinHop";
import { BANK_BOARDS, BANK_TOP } from "./bankWalk";

const STEP = 1 / 30;
const standing: Angler = { x: -13.6, y: 0, z: 10.7, yaw: Math.PI, moving: false };
const dry = () => 0;
const calm: HopWorld = { dockRobinHere: false, struck: false, still: false, ground: dry };

function run(until: number, angler: (t: number) => Angler, world: (t: number) => HopWorld = () => calm, settled: (t: number) => boolean = () => true) {
  let state: HopState = hopStart(0);
  const frames: { t: number; state: HopState; pose: ReturnType<typeof hopAt> }[] = [];
  for (let t = 0; t <= until; t += STEP) {
    state = hopStep(state, t, angler(t), settled(t), world(t));
    frames.push({ t, state, pose: hopAt(state, t, world(t).still) });
  }
  return frames;
}

describe("the robin at your feet", () => {
  it("comes to an angler standing still ashore, lands by their feet, hops about, and goes; then comes again", () => {
    const frames = run(HOP_VISIT_SEC * 2 + HOP_GAP_SEC + 30, () => standing);
    const visits = frames.filter((f, i) => f.state.mode === "visiting" && frames[i - 1]?.state.mode !== "visiting");
    expect(visits.length).toBeGreaterThanOrEqual(2);
    expect(visits[0]!.t).toBeGreaterThanOrEqual(FIRST_SEC - STEP);
    const grounded = frames.filter((f) => f.pose.here && f.pose.flying === 0);
    expect(grounded.length * STEP).toBeGreaterThan(GROUND_SEC * 1.5);
    for (const f of grounded) {
      const d = Math.hypot(f.pose.x - standing.x, f.pose.z - standing.z);
      expect(d).toBeLessThan(1);
      expect(d).toBeGreaterThan(0.3);
    }
    let last = frames[0]!.pose;
    for (const f of frames) {
      if (f.pose.here && last.here) {
        expect(Math.hypot(f.pose.x - last.x, f.pose.y - last.y, f.pose.z - last.z)).toBeLessThan(0.25);
        if (!f.pose.flying && !last.flying) expect(Math.abs(f.pose.yaw - last.yaw)).toBeLessThan(0.1);
      }
      last = f.pose;
    }
  });

  it("stands on the bank boards where there are boards, on the ground elsewhere, and never on the water", () => {
    const board = BANK_BOARDS[0]!;
    expect(robinGround(board.x, board.z)).toBeGreaterThanOrEqual(BANK_TOP);
    expect(robinGround(0, 20)).toBe(0);
    expect(robinGround(0, -6)).toBeNull();
    // Water on the left: it lands on the right instead; water both sides: it does not come.
    const rightOnly = run(20, () => standing, () => ({ ...calm, ground: (x) => (x > standing.x ? null : 0) }));
    const landed = rightOnly.find((f) => f.state.mode === "visiting")!.state as Extract<HopState, { mode: "visiting" }>;
    expect(landed.x).toBeLessThan(standing.x);
    const wet = run(60, () => standing, () => ({ ...calm, ground: () => null }));
    expect(wet.every((f) => !f.pose.here)).toBe(true);
  });

  it("never comes while the angler is on the dock or out in the boat, nor while the dock robin is about", () => {
    expect(run(120, () => standing, () => calm, () => false).every((f) => !f.pose.here)).toBe(true);
    expect(run(120, () => standing, () => ({ ...calm, dockRobinHere: true })).every((f) => !f.pose.here)).toBe(true);
  });

  it("goes at once when the angler walks off or strikes", () => {
    const walked = run(60, (t) => ({ ...standing, moving: t > 12 }));
    expect(walked.find((f) => f.pose.here && f.pose.flying === 0)!.t).toBeLessThan(12);
    expect(walked.find((f) => f.t > 12.1)!.pose.flying).toBe(1);
    expect(walked.find((f) => f.t > 14)!.pose.here).toBe(false);
    const struck = run(60, () => standing, (t) => ({ ...calm, struck: Math.abs(t - 12) < STEP / 2 }));
    expect(struck.find((f) => f.t > 12.1)!.pose.flying).toBe(1);
  });

  it("sits still where it lands with reduced motion, and leaves from where it sat", () => {
    const still = { ...calm, still: true };
    const frames = run(30, (t) => ({ ...standing, moving: t > 15 }), () => still);
    const sat = frames.filter((f) => f.state.mode === "visiting");
    expect(sat[0]!.pose).toEqual(sat[sat.length - 1]!.pose);
    const leaving = frames.find((f) => f.state.mode === "leaving")!;
    expect(Math.hypot(leaving.pose.x - sat[0]!.pose.x, leaving.pose.z - sat[0]!.pose.z)).toBeLessThan(0.05);
  });
});
