import { describe, expect, it } from "vitest";
import { CURL_SEC, FIRST_SEC, GAP_SEC, WALK_SEC, hedgehogAt, hedgehogOut, hedgehogPath, hedgehogStart, hedgehogStep, type HedgehogState } from "./hedgehogWalk";
import type { Angler } from "./robinHop";

const STEP = 1 / 30;
const standing: Angler = { x: -13.6, y: 0, z: 10.7, yaw: Math.PI, moving: false };
const dry = () => 0;

function run(until: number, struckAt: number[] = [], settled = () => true, ground: (x: number, z: number) => number | null = dry) {
  let state: HedgehogState = hedgehogStart(0);
  const frames: { t: number; state: HedgehogState; pose: ReturnType<typeof hedgehogAt> }[] = [];
  for (let t = 0; t <= until; t += STEP) {
    const struck = struckAt.some((s) => Math.abs(t - s) < STEP / 2);
    state = hedgehogStep(state, t, standing, settled(), struck, ground);
    frames.push({ t, state, pose: hedgehogAt(state, t) });
  }
  return frames;
}

describe("hedgehog on the bank", () => {
  it("comes out on dry evenings and nights from spring to fall", () => {
    expect(hedgehogOut("dusk", "clear", "summer")).toBe(true);
    expect(hedgehogOut("night", "fog", "fall")).toBe(true);
    expect(hedgehogOut("night", "rain", "summer")).toBe(false);
    expect(hedgehogOut("day", "clear", "summer")).toBe(false);
    expect(hedgehogOut("night", "clear", "winter")).toBe(false);
  });

  it("snuffles past behind the angler from side to side, stopping to sniff, without jumps", () => {
    const frames = run(FIRST_SEC + WALK_SEC + 10);
    const seen = frames.filter((f) => f.pose.here);
    expect(seen.length * STEP).toBeGreaterThan(WALK_SEC);
    expect(seen.some((f) => f.pose.sniff > 0.5)).toBe(true);
    // Behind the angler: the far side from the water they face.
    for (const f of seen) {
      const back = -((f.pose.x - standing.x) * Math.sin(standing.yaw) + (f.pose.z - standing.z) * Math.cos(standing.yaw));
      expect(back).toBeGreaterThan(0.5);
    }
    for (let i = 1; i < seen.length; i++) expect(Math.hypot(seen[i]!.pose.x - seen[i - 1]!.pose.x, seen[i]!.pose.z - seen[i - 1]!.pose.z)).toBeLessThan(0.05);
    expect(frames[frames.length - 1]!.state.mode).toBe("away");
  });

  it("curls into a ball at a strike, stays put while curled, then trundles on; a second strike while curled changes nothing", () => {
    const strike = FIRST_SEC + 3;
    const frames = run(FIRST_SEC + WALK_SEC + CURL_SEC + 15, [strike, strike + 1]);
    const at = (t: number) => frames.find((f) => f.t >= t)!.pose;
    expect(at(strike + 0.5).curl).toBeGreaterThan(0.9);
    expect(Math.hypot(at(strike + 4).x - at(strike + 0.5).x, at(strike + 4).z - at(strike + 0.5).z)).toBeLessThan(0.01);
    expect(at(strike + CURL_SEC + 2).curl).toBe(0);
    expect(at(strike + CURL_SEC + 3).trot).toBe(1);
    // Its walk took that much longer.
    const plain = run(FIRST_SEC + WALK_SEC + 15);
    const leftAt = (fs: typeof frames) => fs.find((f, i) => f.state.mode === "away" && fs[i - 1]?.state.mode === "walking")!.t;
    expect(leftAt(frames) - leftAt(plain)).toBeGreaterThan(CURL_SEC);
  });

  it("only walks a bank that is dry all along, and only to an angler settled ashore", () => {
    expect(hedgehogPath(standing, () => null)).toBeNull();
    expect(run(60, [], () => true, () => null).every((f) => !f.pose.here)).toBe(true);
    expect(run(60, [], () => false).every((f) => !f.pose.here)).toBe(true);
    const frames = run(FIRST_SEC + WALK_SEC + GAP_SEC + 30);
    const walks = frames.filter((f, i) => f.state.mode === "walking" && frames[i - 1]?.state.mode !== "walking");
    expect(walks).toHaveLength(2);
  });

  it("stands still where it comes in with reduced motion", () => {
    let state: HedgehogState = hedgehogStart(0);
    for (let t = 0; t < FIRST_SEC + 1; t += STEP) state = hedgehogStep(state, t, standing, true, false, dry);
    expect(hedgehogAt(state, 10, true)).toEqual(hedgehogAt(state, 14, true));
  });
});
