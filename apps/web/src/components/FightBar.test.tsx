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

let sim: { current: FightSim } = { current: { line: 1, tension: 0.3, surge: 0, stamina: 1, runSide: 1 } };

function mount(performance: FightPerformance | null, underpowered = false) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
  sim = { current: { line: 1, tension: 0.3, surge: 0, stamina: 1, runSide: 1 } };
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
    expect(controls).toMatch(/let go when the fish is about to run or tension goes red/i);

    sim.current.surge = 1;
    frame();
    expect(container!.querySelector(".fight-status")!.textContent).toMatch(/^let go now/i);

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

describe("FightBar for screen readers", () => {
  it("reports tension and line as meters and speaks each new call once", () => {
    mount({ peakTension: 0.3, maxLine: 1 });
    sim.current.tension = 0.62;
    sim.current.line = 0.25;
    frame();
    const [tension, line] = [...container!.querySelectorAll('[role="meter"]')];
    expect(tension!.getAttribute("aria-valuenow")).toBe("62");
    expect(line!.getAttribute("aria-valuenow")).toBe("75");
    const status = container!.querySelector('.fight-status[role="status"]')!;
    const said = status.textContent;
    let writes = 0;
    new MutationObserver((records) => (writes += records.length)).observe(status, { childList: true, characterData: true, subtree: true });
    frame();
    frame();
    return Promise.resolve().then(() => {
      expect(writes).toBe(0);
      expect(status.textContent).toBe(said);
    });
  });

  it("says how much fight the fish has left beside the line bar and in the line meter", () => {
    mount({ peakTension: 0.3, maxLine: 1 });
    const word = () => container!.querySelector(".fight-stamina")!;
    expect(word().textContent).toBe("Fish fresh");
    sim.current.stamina = 0.4;
    frame();
    expect(word().textContent).toBe("Fish tiring");
    expect(word().getAttribute("data-stamina")).toBe("tiring");
    const line = container!.querySelectorAll('[role="meter"]')[1]!;
    expect(line.getAttribute("aria-valuetext")).toMatch(/Fish tiring$/);
    sim.current.stamina = 0.1;
    frame();
    expect(word().textContent).toBe("Fish played out");
  });

  it("says which way to pull the rod against a run, cheers a turn, and stays quiet on a leap", () => {
    mount({ peakTension: 0.3, maxLine: 1 });
    const shown = () => [...container!.querySelectorAll<HTMLElement>(".fight-steer [data-for]")].filter((part) => !part.hidden).map((part) => part.dataset.for);
    frame();
    expect(shown()).toEqual(["calm"]);
    sim.current.surge = 1;
    sim.current.runSide = 1;
    frame();
    expect(shown()).toEqual(["left"]);
    expect(container!.querySelector(".fight-steer")!.textContent).toContain("It runs right — pull left");
    sim.current.surge = 2;
    sim.current.runSide = -1;
    frame();
    expect(shown()).toEqual(["right"]);
    sim.current.turning = true;
    frame();
    expect(shown()).toEqual(["turning"]);
    sim.current.turning = false;
    sim.current.jump = true;
    frame();
    expect(shown()).toEqual(["calm"]);
  });

  it("calls a leap by name, warning first and then telling the angler to bow", () => {
    mount({ peakTension: 0.3, maxLine: 1 });
    const status = () => container!.querySelector(".fight-status")!.textContent;
    sim.current.jump = true;
    sim.current.surge = 1;
    frame();
    expect(status()).toBe("Let go now — it's coming up!");
    sim.current.surge = 2;
    frame();
    expect(status()).toBe("BOW — it's jumping!");
    expect(container!.querySelector(".fight-bar")!.getAttribute("data-jump")).toBe("1");
  });
});
