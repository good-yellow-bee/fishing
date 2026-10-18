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
    expect(stepLine("aim", { ...idle, fishing: false })).toMatch(/Walk onto a bank/);
    expect(stepLine("aim", { ...idle, fishing: true, touch: false })).toMatch(/arrow keys/);
    expect(stepLine("aim", { ...idle, fishing: true, touch: true })).not.toMatch(/arrow keys/);
    expect(stepLine("wait", { ...idle, nibble: true })).toMatch(/Not yet/);
    expect(stepLine("ease", { ...idle, surge: 2, reeling: true })).toBe("It's running. Let go!");
    expect(stepLine("ease", { ...idle, surge: 2 })).toMatch(/Let it run/);
    expect(stepLine("charge", { ...idle, outcome: "miss" })).toMatch(/Cast again/);
    expect(stepLine("charge", { ...idle, touch: true })).toMatch(/finger/);
    expect(stepLine("strike", { ...idle, touch: true })).toBe("Now! Tap.");
  });
});
