import { describe, expect, it } from "vitest";
import { CURL_SEC, FIRST_SEC, GAP_SEC, PASS_SEC, hedgehogAt, hedgehogOut, hedgehogPath, hedgehogStart, hedgehogStep, type HedgehogState } from "./hedgehogWalk";
import type { Angler } from "./robinHop";

const STEP = 1 / 30;
const standing: Angler = { x: -13.6, y: 0, z: 10.7, yaw: Math.PI, moving: false };
const dry = () => 0;

function run(until: number, fuss: (t: number) => boolean = () => false, settled = () => true, ground: (x: number, z: number) => number | null = dry) {
  let state: HedgehogState = hedgehogStart(0);
  const frames: { t: number; state: HedgehogState; pose: ReturnType<typeof hedgehogAt> }[] = [];
  for (let t = 0; t <= until; t += STEP) {
    state = hedgehogStep(state, t, STEP, standing, settled(), fuss(t), ground);
    frames.push({ t, state, pose: hedgehogAt(state, t, false, ground) });
  }
  return frames;
}

const leftAt = (fs: ReturnType<typeof run>) => fs.find((f, i) => f.state.mode === "away" && fs[i - 1]?.state.mode === "walking")!.t;

describe("hedgehog on the bank", () => {
  it("comes out on dry evenings and nights from spring to fall", () => {
    expect(hedgehogOut("dusk", "clear", "summer")).toBe(true);
    expect(hedgehogOut("night", "fog", "fall")).toBe(true);
    expect(hedgehogOut("night", "rain", "summer")).toBe(false);
    expect(hedgehogOut("day", "clear", "summer")).toBe(false);
    expect(hedgehogOut("night", "clear", "winter")).toBe(false);
  });

  it("snuffles past behind the angler from side to side, stopping to sniff, growing in and out at the ends, without jumps", () => {
    const frames = run(FIRST_SEC + PASS_SEC + 10);
    const seen = frames.filter((f) => f.pose.here);
    expect(seen.length * STEP).toBeGreaterThan(PASS_SEC - 1);
    expect(seen.some((f) => f.pose.sniff > 0.5)).toBe(true);
    expect(seen[0]!.pose.show).toBeLessThan(0.1);
    expect(seen[Math.floor(seen.length / 2)]!.pose.show).toBe(1);
    for (const f of seen) {
      const back = -((f.pose.x - standing.x) * Math.sin(standing.yaw) + (f.pose.z - standing.z) * Math.cos(standing.yaw));
      expect(back).toBeGreaterThan(0.5);
    }
    for (let i = 1; i < seen.length; i++) expect(Math.hypot(seen[i]!.pose.x - seen[i - 1]!.pose.x, seen[i]!.pose.z - seen[i - 1]!.pose.z)).toBeLessThan(0.05);
    expect(frames[frames.length - 1]!.state.mode).toBe("away");
  });

  it("curls up at a fuss and stays put until a while after it ends, then trundles on", () => {
    const from = FIRST_SEC + 3;
    const frames = run(FIRST_SEC + PASS_SEC + 20, (t) => t > from && t < from + 4);
    const at = (t: number) => frames.find((f) => f.t >= t)!.pose;
    expect(at(from + 0.5).curl).toBeGreaterThan(0.9);
    expect(at(from + 4 + CURL_SEC - 0.5).curl).toBeGreaterThan(0.9);
    expect(Math.hypot(at(from + 6).x - at(from + 0.5).x, at(from + 6).z - at(from + 0.5).z)).toBeLessThan(0.01);
    expect(at(from + 4 + CURL_SEC + 2).curl).toBe(0);
    expect(leftAt(frames) - leftAt(run(FIRST_SEC + PASS_SEC + 20))).toBeGreaterThan(4 + CURL_SEC - 0.5);
  });

  it("waits for a fuss already going on to be over before it sets off", () => {
    const frames = run(FIRST_SEC + 12, (t) => t < FIRST_SEC + 6);
    expect(frames.find((f) => f.pose.here)!.t).toBeGreaterThanOrEqual(FIRST_SEC + 6);
  });

  it("only walks a bank that is dry all along, at its height, and only to an angler settled ashore", () => {
    expect(hedgehogPath(standing, () => null)).toBeNull();
    // A thin strip of water anywhere along its way keeps it from coming.
    expect(hedgehogPath(standing, (x, z) => (Math.abs(x - standing.x) < 0.12 && z > standing.z ? null : 0))).toBeNull();
    expect(run(60, () => false, () => true, () => null).every((f) => !f.pose.here)).toBe(true);
    expect(run(60, () => false, () => false).every((f) => !f.pose.here)).toBe(true);
    const boards = run(FIRST_SEC + 5, () => false, () => true, () => 0.047);
    expect(boards.find((f) => f.pose.here)!.pose.y).toBe(0.047);
    const frames = run(FIRST_SEC + PASS_SEC + GAP_SEC + 30);
    expect(frames.filter((f, i) => f.state.mode === "walking" && frames[i - 1]?.state.mode !== "walking")).toHaveLength(2);
  });

  it("stands still where it comes in with reduced motion", () => {
    let state: HedgehogState = hedgehogStart(0);
    for (let t = 0; t < FIRST_SEC + 1; t += STEP) state = hedgehogStep(state, t, STEP, standing, true, false, dry);
    expect(hedgehogAt(state, 10, true, dry)).toEqual(hedgehogAt(state, 14, true, dry));
  });
});
