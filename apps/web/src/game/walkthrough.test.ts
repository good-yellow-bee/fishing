import { describe, expect, it } from "vitest";
import { nextStep, stepLine, type WalkthroughSnapshot, type WalkthroughStep } from "./walkthrough";

const idle: WalkthroughSnapshot = {
  fishing: true,
  phase: "idle",
  cast: "none",
  nibble: false,
  surge: 0,
  reeling: false,
  touch: false,
  outcome: null,
};

function walk(snaps: Partial<WalkthroughSnapshot>[]) {
  let step: WalkthroughStep = "aim";
  return snaps.map((snap) => (step = nextStep(step, { ...idle, ...snap })));
}

describe("first-cast walkthrough", () => {
  it("lights each step as the angler does it, through to the first fish", () => {
    expect(
      walk([
        {},
        { cast: "ok" },
        { phase: "casting", cast: "ok" },
        { phase: "waiting" },
        { phase: "waiting", nibble: true },
        { phase: "hookset" },
        { phase: "fight" },
        { phase: "result", outcome: "landed" },
      ]),
    ).toEqual(["aim", "charge", "charge", "wait", "wait", "strike", "ease", "landed"]);
  });

  it("sends a lost fish back to the cast, and keeps landed once reached", () => {
    expect(walk([{ phase: "hookset" }, { phase: "result", outcome: "miss" }, { phase: "fight" }, { phase: "result", outcome: "broke" }])).toEqual([
      "strike",
      "charge",
      "ease",
      "charge",
    ]);
    expect(nextStep("landed", idle)).toBe("landed");
  });

  it("asks for aim again when the ring leaves the water or the angler leaves the bank", () => {
    expect(nextStep("charge", { ...idle, cast: "shore" })).toBe("aim");
    expect(nextStep("charge", { ...idle, fishing: false, cast: "ok" })).toBe("aim");
  });

  it("says what to do now, including on the run", () => {
    expect(stepLine("aim", { ...idle, fishing: false })).toMatch(/walk to the water/);
    expect(stepLine("aim", { ...idle, fishing: true, touch: false })).toMatch(/mouse/);
    expect(stepLine("aim", { ...idle, fishing: true, touch: true })).toBe("Touch the water close in front of you and hold.");
    expect(stepLine("wait", { ...idle, nibble: true })).toMatch(/Not yet/);
    expect(stepLine("wait", idle)).toMatch(/only when it says Now!/);
    expect(stepLine("ease", { ...idle, surge: 2, reeling: true })).toBe("It's running. Let go!");
    expect(stepLine("ease", { ...idle, surge: 2 })).toMatch(/Let it run/);
    expect(stepLine("ease", idle)).toMatch(/Tension bar goes red/);
    expect(stepLine("charge", { ...idle, outcome: "miss" })).toBe("Not this time. Cast again.");
    expect(stepLine("charge", { ...idle, phase: "casting", touch: true })).toMatch(/Lift your finger when the Cast bar reaches the green/);
    expect(stepLine("charge", { ...idle, phase: "casting" })).toMatch(/Let go when the Cast bar reaches the green/);
    expect(stepLine("strike", { ...idle, touch: true })).toBe("Now! Tap.");
  });

  it("sends a finger that touched the far lake or the land back to the water in front", () => {
    expect(stepLine("aim", { ...idle, touch: true, cast: "basin" })).toBe("Too far. Touch the water closer in front of you.");
    expect(stepLine("aim", { ...idle, touch: true, cast: "range" })).toBe("Too far. Touch the water closer in front of you.");
    expect(stepLine("aim", { ...idle, touch: true, cast: "shore" })).toBe("That's land. Touch the water in front of you.");
    expect(stepLine("aim", { ...idle, cast: "basin" })).toBe("Too far. Point at the water closer in front of you.");
  });

  it("keeps keys, the mouse and jargon off a touch screen's lines", () => {
    const snaps: Partial<WalkthroughSnapshot>[] = [
      { fishing: false },
      {},
      { cast: "basin" },
      { cast: "shore" },
      { cast: "ok" },
      { phase: "casting", cast: "ok" },
      { outcome: "miss" },
      { phase: "waiting" },
      { phase: "waiting", nibble: true },
      { phase: "hookset" },
      { phase: "fight" },
      { phase: "fight", surge: 2 },
    ];
    for (const snap of snaps) {
      const step = nextStep("aim", { ...idle, ...snap, touch: true });
      const line = stepLine(step, { ...idle, ...snap, touch: true });
      expect(line).not.toMatch(/WASD|arrow|mouse|Space|Click|moss|band|open water/i);
    }
  });
});
