// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@stillwater/shared";
import type { FightOutcome, FightPerformance } from "./fight";

const step = vi.fn<() => FightOutcome>(() => {
  throw new Error("simulated fight failure");
});
let fightPerformance: FightPerformance = { peakTension: 0.2, maxLine: 1 };

vi.mock("./fx", () => ({
  fx: { cast: vi.fn(), splash: vi.fn(), bite: vi.fn(), nibble: vi.fn(), snap: vi.fn(), land: vi.fn(), surge: vi.fn(), reel: vi.fn() },
}));
vi.mock("./fight", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./fight")>();
  return {
    ...actual,
    makeFight: () => ({ sim: { line: 1, tension: 0.2, surge: 0 }, performance: fightPerformance, step }),
  };
});

import { useFishingGame } from "./useFishingGame";

const profile: Profile = {
  userId: "test", displayName: "Test", points: 0, lifetimePoints: 0, strength: 5, accuracy: 3, patience: 1,
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let frames: FrameRequestCallback[] = [];
let now = 0;

function pointer(type: string, pointerId = 1) {
  const event = new MouseEvent(type, { bubbles: true, button: 0 });
  Object.defineProperties(event, { pointerId: { value: pointerId }, isPrimary: { value: true } });
  return event;
}

function Harness() {
  const game = useFishingGame(profile, "day");
  return (
    <>
      <div ref={game.surfaceRef} data-stance="dock" data-aim="0.5,3" data-angler="0.15,7.42" />
      <output data-testid="phase">{game.phase}:{game.outcome?.kind ?? "none"}</output>
      <span data-testid="clean">{game.outcome?.kind === "landed" ? String(game.outcome.clean) : ""}</span>
      <button type="button" onClick={game.dismissResult}>dismiss</button>
      <p data-testid="hint">{game.hint}</p>
    </>
  );
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  frames = [];
  now = 0;
  fightPerformance = { peakTension: 0.2, maxLine: 1 };
  step.mockClear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function mount() {
  vi.useFakeTimers();
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
  vi.spyOn(Math, "random").mockReturnValue(0);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root!.render(<Harness />));
  return container.querySelector("div")!;
}

/** Casts, waits out the bite, sets the hook and runs one fight frame. */
function castAndFight(surface: HTMLDivElement, pointerId: number) {
  act(() => surface.dispatchEvent(pointer("pointerdown", pointerId)));
  now += 500;
  act(() => window.dispatchEvent(pointer("pointerup", pointerId)));
  act(() => vi.advanceTimersByTime(2_201));
  act(() => surface.dispatchEvent(pointer("pointerdown", pointerId)));
  act(() => frames.at(-1)!(now));
}

describe("useFishingGame animation recovery", () => {
  it("recovers a throwing fight frame and allows the next cast", () => {
    const surface = mount();
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);

    act(() => surface.dispatchEvent(pointer("pointerdown")));
    now = 500;
    act(() => window.dispatchEvent(pointer("pointerup")));
    act(() => vi.advanceTimersByTime(2_201));
    act(() => surface.dispatchEvent(pointer("pointerdown")));
    const frame = frames.at(-1)!;
    const scheduled = frames.length;
    act(() => frame(1_000));

    expect(step).toHaveBeenCalledTimes(1);
    expect(logged).toHaveBeenCalledWith(expect.objectContaining({ message: "simulated fight failure" }));
    expect(container!.querySelector("output")?.textContent).toBe("result:error");
    expect(frames.length).toBe(scheduled + 1);
    act(() => frames.at(-1)!(1_016));
    expect(frames.length).toBe(scheduled + 2);
    act(() => (container!.querySelector("button") as HTMLButtonElement).click());
    act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
    expect(container!.querySelector("output")?.textContent).toBe("casting:none");
  });
});

describe("useFishingGame landed outcome", () => {
  it("marks a landed fight clean only when it stayed out of the red", () => {
    const surface = mount();

    fightPerformance = { peakTension: 0.5, maxLine: 1 };
    step.mockReturnValueOnce("landed");
    castAndFight(surface, 1);
    expect(container!.querySelector("output")?.textContent).toBe("result:landed");
    expect(container!.querySelector("span")?.textContent).toBe("true");

    act(() => (container!.querySelector("button") as HTMLButtonElement).click());
    fightPerformance = { peakTension: 0.9, maxLine: 1 };
    step.mockReturnValueOnce("landed");
    castAndFight(surface, 2);
    expect(container!.querySelector("output")?.textContent).toBe("result:landed");
    expect(container!.querySelector("span")?.textContent).toBe("false");
  });
});

describe("useFishingGame strike timing", () => {
  const hint = () => container!.querySelector("[data-testid=hint]")?.textContent;
  const phase = () => container!.querySelector("output")?.textContent;

  function cast(surface: HTMLDivElement) {
    act(() => surface.dispatchEvent(pointer("pointerdown")));
    now += 500;
    act(() => window.dispatchEvent(pointer("pointerup")));
  }

  it("says an early strike is too early and still lets the real bite be hooked", () => {
    const surface = mount();
    cast(surface);
    act(() => vi.advanceTimersByTime(600));
    act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
    expect(hint()).toMatch(/too early/i);
    expect(phase()).toBe("waiting:none");
    act(() => window.dispatchEvent(pointer("pointerup", 2)));
    act(() => vi.advanceTimersByTime(1_601));
    expect(phase()).toBe("hookset:none");
    act(() => surface.dispatchEvent(pointer("pointerdown", 3)));
    expect(phase()).toBe("fight:none");
  });

  it("gives a human reaction time to hook the real bite", () => {
    const surface = mount();
    cast(surface);
    act(() => vi.advanceTimersByTime(2_201));
    expect(phase()).toBe("hookset:none");
    act(() => vi.advanceTimersByTime(1_000));
    act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
    expect(phase()).toBe("fight:none");
  });
});

