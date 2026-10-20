import { describe, expect, it } from "vitest";
import { FIRST_SEC, GAP_SEC, bankToadAt, bankToadStart, bankToadStep, type BankToadState } from "./bankToad";
import type { Angler } from "./robinHop";
import { VISIT_SEC } from "./toadHop";

const STEP = 1 / 30;
const standing: Angler = { x: -13.6, y: 0, z: 10.7, yaw: Math.PI, moving: false };
const ground = () => 0.05;

function run(until: number, settled = () => true, dry: (x: number, z: number) => number | null = ground) {
  let state: BankToadState = bankToadStart(0);
  const frames: { t: number; state: BankToadState; pose: ReturnType<typeof bankToadAt> }[] = [];
  for (let t = 0; t <= until; t += STEP) {
    state = bankToadStep(state, t, standing, settled(), dry);
    frames.push({ t, state, pose: bankToadAt(state, t) });
  }
  return frames;
}

describe("toad on the bank", () => {
  it("creeps out of the grass behind the angler, hops across at the ground's height, and creeps back in", () => {
    const frames = run(FIRST_SEC + VISIT_SEC + 5);
    const seen = frames.filter((f) => f.pose.here);
    expect(seen.length * STEP).toBeGreaterThan(VISIT_SEC - 1);
    expect(seen[0]!.pose.show).toBeLessThan(0.1);
    expect(seen[Math.floor(seen.length / 2)]!.pose.show).toBe(1);
    expect(seen[seen.length - 1]!.pose.show).toBeLessThan(0.1);
    for (const f of seen) {
      const back = -((f.pose.x - standing.x) * Math.sin(standing.yaw) + (f.pose.z - standing.z) * Math.cos(standing.yaw));
      expect(back).toBeGreaterThan(0.5);
      expect(f.pose.y).toBeGreaterThanOrEqual(0.05);
      expect(Math.hypot(f.pose.x - standing.x, f.pose.z - standing.z)).toBeLessThan(2);
    }
    expect(seen.some((f) => f.pose.kick > 0.9)).toBe(true);
    expect(seen.some((f) => f.pose.throat > 0.5)).toBe(true);
  });

  it("comes again a while after, only to an angler settled ashore on dry ground", () => {
    const frames = run(FIRST_SEC + VISIT_SEC + GAP_SEC + 10);
    expect(frames.filter((f, i) => f.state.mode === "crossing" && frames[i - 1]?.state.mode !== "crossing")).toHaveLength(2);
    expect(run(60, () => false).every((f) => !f.pose.here)).toBe(true);
    expect(run(60, () => true, () => null).every((f) => !f.pose.here)).toBe(true);
  });
});
