import { describe, expect, it } from "vitest";
import { GROUND_SEC, HOP_GAP_SEC, HOP_START, HOP_VISIT_SEC, hopAt, hopStep, type Angler, type HopState } from "./robinHop";

const STEP = 1 / 30;
const standing: Angler = { x: -13.6, y: 0.05, z: 10.7, yaw: Math.PI, moving: false };

function run(until: number, angler: (t: number) => Angler, settled: (t: number) => boolean = () => true) {
  let state: HopState = HOP_START;
  const frames: { t: number; state: HopState; pose: ReturnType<typeof hopAt> }[] = [];
  for (let t = 0; t <= until; t += STEP) {
    state = hopStep(state, t, angler(t), settled(t));
    frames.push({ t, state, pose: hopAt(state, t) });
  }
  return frames;
}

describe("the robin at your feet", () => {
  it("comes to an angler standing still ashore, lands by their feet, hops about, and goes; then comes again", () => {
    const frames = run(HOP_VISIT_SEC * 2 + HOP_GAP_SEC + 30, () => standing);
    const visits = frames.filter((f, i) => f.state.mode === "visiting" && frames[i - 1]?.state.mode !== "visiting");
    expect(visits.length).toBeGreaterThanOrEqual(2);
    const grounded = frames.filter((f) => f.pose.here && f.pose.flying === 0);
    expect(grounded.length * STEP).toBeGreaterThan(GROUND_SEC * 1.5);
    for (const f of grounded) {
      expect(Math.hypot(f.pose.x - standing.x, f.pose.z - standing.z)).toBeLessThan(1);
      expect(Math.hypot(f.pose.x - standing.x, f.pose.z - standing.z)).toBeGreaterThan(0.3);
      expect(f.pose.y).toBeGreaterThanOrEqual(standing.y);
    }
    let last = frames[0]!.pose;
    for (const f of frames) {
      if (f.pose.here && last.here) expect(Math.hypot(f.pose.x - last.x, f.pose.y - last.y, f.pose.z - last.z)).toBeLessThan(0.25);
      last = f.pose;
    }
  });

  it("never comes while the angler is on the dock or out in the boat", () => {
    const frames = run(120, () => standing, () => false);
    expect(frames.every((f) => !f.pose.here)).toBe(true);
  });

  it("goes at once when the angler walks off", () => {
    const frames = run(60, (t) => ({ ...standing, moving: t > 12 }));
    const landedAt = frames.find((f) => f.pose.here && f.pose.flying === 0)!.t;
    expect(landedAt).toBeLessThan(12);
    expect(frames.find((f) => f.t > 12.1)!.pose.flying).toBe(1);
    expect(frames.find((f) => f.t > 14)!.pose.here).toBe(false);
  });

  it("sits still where it lands with reduced motion", () => {
    let state: HopState = HOP_START;
    for (let t = 0; t < 10; t += STEP) state = hopStep(state, t, standing, true);
    expect(state.mode).toBe("visiting");
    expect(hopAt(state, 10, true)).toEqual(hopAt(state, 15, true));
  });
});
