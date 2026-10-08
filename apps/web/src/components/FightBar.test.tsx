// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FISH } from "@stillwater/shared";
import type { FightPerformance, FightSim } from "../game/fight";
import { FightBar } from "./FightBar";

const perch = FISH.find((fish) => fish.id === "perch")!;
let root: Root | null = null;
let container: HTMLDivElement | null = null;
let frames: FrameRequestCallback[] = [];

let sim: { current: FightSim } = { current: { line: 1, tension: 0.3, surge: 0 } };

function mount(performance: FightPerformance | null, underpowered = false) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
  sim = { current: { line: 1, tension: 0.3, surge: 0 } };
  const record = { current: performance };
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root!.render(<FightBar fight={{ species: perch, weight: 0.8, underpowered }} sim={sim} performance={record} />));
  return record;
}

function frame() {
  const next = frames;
  frames = [];
  act(() => next.forEach((callback) => callback(0)));
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  frames = [];
  vi.unstubAllGlobals();
});

describe("FightBar controls", () => {
  it("keeps the reel and let-go controls on the card while the fish runs", () => {
    mount({ peakTension: 0.3, maxLine: 1 });
    frame();
    const controls = container!.querySelector(".fight-controls")!.textContent;
    expect(controls).toMatch(/hold click \/ space to reel/i);
    expect(controls).toMatch(/hold the screen to reel/i);
    expect(controls).toMatch(/let go when tension goes red or the fish runs/i);

    sim.current.surge = 2;
    frame();
    expect(container!.querySelector(".fight-status")!.textContent).toMatch(/^let go/i);
    expect(container!.querySelector(".fight-controls")!.textContent).toBe(controls);
  });
});

describe("FightBar clean-fight chip", () => {
  it("shows the bonus while the fight is clean and strikes it once tension goes red", () => {
    const record = mount({ peakTension: 0.3, maxLine: 1 });
    frame();
    const chip = container!.querySelector(".fight-clean")!;
    expect(chip.textContent).toMatch(/clean fight/i);
    expect(chip.classList.contains("lost")).toBe(false);
    record.current = { peakTension: 0.85, maxLine: 1 };
    frame();
    expect(chip.textContent).toMatch(/lost/i);
    expect(chip.classList.contains("lost")).toBe(true);
  });

  it("strikes the bonus when the fish nearly runs out the line", () => {
    mount({ peakTension: 0.4, maxLine: 1.21 });
    frame();
    expect(container!.querySelector(".fight-clean")!.classList.contains("lost")).toBe(true);
  });

  it("shows no chip for a fish too heavy to fight", () => {
    mount(null, true);
    frame();
    expect(container!.querySelector(".fight-clean")).toBeNull();
  });
});
