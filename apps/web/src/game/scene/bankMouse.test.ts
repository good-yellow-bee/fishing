import { describe, expect, it } from "vitest";
import { FIRST_SEC, GAP_SEC, TRACKS_FADE_SEC, trackPrints, bankMouseAt, bankMouseStart, bankMouseStep, nextTracks, tracksShow, type BankMouseState, type MouseTracks } from "./bankMouse";
import { VISIT_SEC, snowMouseOut } from "./mouseScurry";
import type { Angler } from "./robinHop";

const STEP = 1 / 30;
const standing: Angler = { x: -13.6, y: 0, z: 10.7, yaw: Math.PI, moving: false };
const snow = () => 0.08;

function run(until: number, settled = () => true, ground: (x: number, z: number) => number | null = snow) {
  let state: BankMouseState = bankMouseStart(0);
  let tracks: MouseTracks | null = null;
  const frames: { t: number; state: BankMouseState; pose: ReturnType<typeof bankMouseAt>; tracks: MouseTracks | null }[] = [];
  for (let t = 0; t <= until; t += STEP) {
    state = bankMouseStep(state, t, standing, settled(), ground);
    tracks = nextTracks(state, tracks, t);
    frames.push({ t, state, pose: bankMouseAt(state, t), tracks });
  }
  return frames;
}

describe("mouse on a winter bank", () => {
  it("is out on winter evenings and nights only", () => {
    expect(snowMouseOut("night", "clear", "winter")).toBe(true);
    expect(snowMouseOut("dusk", "fog", "winter")).toBe(true);
    expect(snowMouseOut("day", "clear", "winter")).toBe(false);
    expect(snowMouseOut("night", "clear", "fall")).toBe(false);
    // Not out while it snows.
    expect(snowMouseOut("night", "rain", "winter")).toBe(false);
  });

  it("pops out of the snow behind the angler, runs across at the snow's height, sits up to nibble, and dives back in", () => {
    const frames = run(FIRST_SEC + VISIT_SEC + 2);
    const seen = frames.filter((f) => f.pose.here);
    expect(seen.length * STEP).toBeGreaterThan(VISIT_SEC - 0.5);
    expect(seen[0]!.pose.show).toBeLessThan(0.2);
    expect(seen.some((f) => f.pose.sitting > 0.9)).toBe(true);
    for (const f of seen) {
      const back = -((f.pose.x - standing.x) * Math.sin(standing.yaw) + (f.pose.z - standing.z) * Math.cos(standing.yaw));
      expect(back).toBeGreaterThan(0.5);
      expect(f.pose.y).toBeCloseTo(0.08);
    }
  });

  it("leaves tracks that reach as far as it has run, stay once it has gone, and fade before the next comes", () => {
    const frames = run(FIRST_SEC + VISIT_SEC + GAP_SEC + 1);
    const mid = frames.find((f) => f.t > FIRST_SEC + VISIT_SEC / 3)!;
    const end = frames.find((f) => f.t > FIRST_SEC + VISIT_SEC - 0.1)!;
    expect(mid.tracks!.reach).toBeGreaterThan(0.1);
    expect(end.tracks!.reach).toBeGreaterThan(mid.tracks!.reach);
    // Its prints follow its way, alternating side to side, and run no further than it has.
    const prints = trackPrints(mid.tracks!, 100);
    expect(prints.length).toBeGreaterThan(1);
    const { from } = mid.tracks!.way;
    for (const p of prints) expect(Math.hypot(p.x - from.x, p.z - from.z)).toBeLessThan(mid.tracks!.reach + 0.03);
    expect(prints[0]!.y).toBeCloseTo(0.08);
    expect(trackPrints(end.tracks!, 5)).toHaveLength(5);
    const after = frames.find((f) => f.t > FIRST_SEC + VISIT_SEC + 5)!;
    expect(after.pose.here).toBe(false);
    expect(tracksShow(after.tracks!, after.t)).toBeGreaterThan(0.5);
    expect(frames.find((f) => f.t > FIRST_SEC + VISIT_SEC + TRACKS_FADE_SEC + 1)!.tracks).toBeNull();
  });

  it("comes only to an angler settled ashore on snow-covered ground", () => {
    expect(run(60, () => false).every((f) => !f.pose.here)).toBe(true);
    expect(run(60, () => true, () => null).every((f) => !f.pose.here)).toBe(true);
  });
});
