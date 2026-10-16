// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FISH } from "@stillwater/shared";
import type { FightPerformance, FightSim } from "../game/fight";
import { FightBar } from "./FightBar";

const perch = FISH.find((fish) => fish.id === "perch")!;
const trout = FISH.find((fish) => fish.id === "rainbow-trout")!;
const whitefish = FISH.find((fish) => fish.id === "lake-whitefish")!;
let root: Root | null = null;
let container: HTMLDivElement | null = null;
let frames: FrameRequestCallback[] = [];

let sim: { current: FightSim } = { current: { line: 1, tension: 0.3, surge: 0, stamina: 1, runSide: 1 } };

function mount(performance: FightPerformance | null, underpowered = false, species = perch, best: number | null = null) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
  sim = { current: { line: 1, tension: 0.3, surge: 0, stamina: 1, runSide: 1 } };
  const record = { current: performance };
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root!.render(<FightBar fight={{ species, weight: 0.8, underpowered }} sim={sim} performance={record} best={best} />));
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

describe("FightBar personal best", () => {
  it("says when the fish on the line is heavier than the field log's best", () => {
    mount({ peakTension: 0.3, maxLine: 1 }, false, perch, 0.6);
    expect(container!.querySelector(".fight-best")!.textContent).toBe("Heavier than your best (0.6 lb)");
  });

  it("stays quiet for a lighter fish and before the first of its kind", () => {
    mount({ peakTension: 0.3, maxLine: 1 }, false, perch, 1.2);
    expect(container!.querySelector(".fight-best")).toBeNull();
    act(() => root?.unmount());
    container?.remove();
    mount({ peakTension: 0.3, maxLine: 1 });
    expect(container!.querySelector(".fight-best")).toBeNull();
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

  it("marks the fight's highest tension on the bar, red once it reached the red", () => {
    const record = mount({ peakTension: 0.3, maxLine: 1 });
    frame();
    const peak = container!.querySelector<HTMLElement>(".peak")!;
    expect(peak.hidden).toBe(false);
    expect(peak.style.left).toBe("30%");
    expect(peak.dataset.zone).toBe("easy");
    record.current = { peakTension: 0.86, maxLine: 1 };
    frame();
    expect(parseFloat(peak.style.left)).toBeCloseTo(86);
    expect(peak.dataset.zone).toBe("red");
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

  it("warns once the fish takes a third of the way to escaping, and stripes the line bar from the right", () => {
    mount({ peakTension: 0.3, maxLine: 1 });
    const word = () => container!.querySelector<HTMLElement>(".fight-short")!;
    const overrun = () => container!.querySelector<HTMLElement>(".overrun")!.style.width;
    const line = () => container!.querySelectorAll('[role="meter"]')[1]!.getAttribute("aria-valuetext");
    sim.current.line = 1.05;
    frame();
    expect(word().hidden).toBe(true);
    expect(parseFloat(overrun())).toBeCloseTo(20);
    expect(line()).not.toMatch(/running out/i);
    sim.current.line = 1.15;
    frame();
    expect(word().hidden).toBe(false);
    expect(word().textContent).toBe("Running out of line!");
    expect(container!.querySelector<HTMLElement>(".fight-stamina")!.hidden).toBe(true);
    expect(line()).toMatch(/Running out of line!$/);
    sim.current.line = 0.6;
    frame();
    expect(word().hidden).toBe(true);
    expect(container!.querySelector<HTMLElement>(".fight-stamina")!.hidden).toBe(false);
    expect(overrun()).toBe("0%");
  });

  it("tells the angler to reel a played-out fish in while it is calm", () => {
    mount({ peakTension: 0.3, maxLine: 1 });
    const status = () => container!.querySelector(".fight-status")!.textContent;
    sim.current.stamina = 0.1;
    frame();
    expect(status()).toBe("It's played out — reel it in!");
    sim.current.surge = 1;
    frame();
    expect(status()).not.toBe("It's played out — reel it in!");
  });

  it("tells the angler to pump a sulking fish off the bottom", () => {
    mount({ peakTension: 0.3, maxLine: 1 });
    const status = () => container!.querySelector(".fight-status")!.textContent;
    sim.current.sulk = true;
    frame();
    expect(status()).toBe("It's sulking on the bottom — ease off, then pump!");
    sim.current.sulk = false;
    frame();
    expect(status()).not.toMatch(/sulking/);
  });

  it("says what the reeds and the inlet do to a fight, and nothing on open water", () => {
    const water = (w?: "weeds" | "current" | "deep" | "rocks" | "boat") => {
      act(() => root!.render(<FightBar fight={{ species: perch, weight: 0.8, underpowered: false, water: w }} sim={sim} performance={{ current: { peakTension: 0.3, maxLine: 1 } }} />));
      return container!.querySelector(".fight-water")?.textContent ?? null;
    };
    mount({ peakTension: 0.3, maxLine: 1 });
    expect(water()).toBeNull();
    expect(water("weeds")).toMatch(/weeds/);
    expect(water("current")).toMatch(/current takes line/);
    expect(water("deep")).toMatch(/dive/);
    expect(water("rocks")).toMatch(/rocks/);
    expect(water("boat")).toMatch(/swings to follow a run/);
  });

  it("says when the wind bellies a slack line, and nothing on a calm day", () => {
    const wind = (w?: "breezy" | "strong") => {
      act(() => root!.render(<FightBar fight={{ species: perch, weight: 0.8, underpowered: false, windy: w }} sim={sim} performance={{ current: { peakTension: 0.3, maxLine: 1 } }} />));
      return container!.querySelector(".fight-wind")?.textContent ?? null;
    };
    mount({ peakTension: 0.3, maxLine: 1 });
    expect(wind()).toBeNull();
    expect(wind("breezy")).toMatch(/^Breezy/);
    expect(wind("strong")).toMatch(/much faster/);
  });

  it("tells the angler a fish is in the weeds", () => {
    mount({ peakTension: 0.3, maxLine: 1 });
    const status = () => container!.querySelector(".fight-status")!.textContent;
    sim.current.weeded = true;
    frame();
    expect(status()).toBe("It ran into the weeds — reel slow and steady!");
    sim.current.weeded = false;
    frame();
    expect(status()).not.toMatch(/weeds/);
  });

  it("tells the angler a run is dragging the line over the rocks", () => {
    mount({ peakTension: 0.3, maxLine: 1 });
    const status = () => container!.querySelector(".fight-status")!.textContent;
    sim.current.surge = 2;
    sim.current.rocky = true;
    frame();
    expect(status()).toBe("It's dragging the line over the rocks — turn it!");
    sim.current.rocky = false;
    frame();
    expect(status()).not.toMatch(/rocks/);
  });

  it("warns of the last run at the net", () => {
    mount({ peakTension: 0.3, maxLine: 1 });
    const status = () => container!.querySelector(".fight-status")!.textContent;
    sim.current.surge = 1;
    sim.current.lastRun = true;
    frame();
    expect(status()).toBe("Let go now — it sees the net!");
    sim.current.lastRun = false;
    frame();
    expect(status()).not.toBe("Let go now — it sees the net!");
  });

  it("warns that the hook is tearing out of a soft mouth", () => {
    mount({ peakTension: 0.3, maxLine: 1 });
    const status = () => container!.querySelector(".fight-status")!.textContent;
    sim.current.tearing = true;
    frame();
    expect(status()).toBe("EASE OFF — the hook is tearing out!");
    sim.current.tearing = false;
    frame();
    expect(status()).not.toBe("EASE OFF — the hook is tearing out!");
  });

  it("says a whitefish has a soft mouth, and no other fish", () => {
    mount({ peakTension: 0.3, maxLine: 1 }, false, whitefish);
    expect(container!.textContent).toContain("Soft mouth: reel in the red and the hook tears out");
    mount({ peakTension: 0.3, maxLine: 1 }, false, trout);
    expect(container!.textContent).not.toContain("Soft mouth");
  });

  it("names each fish's habit on the card, and only its own", () => {
    const habit = (id: string) => {
      mount({ peakTension: 0.3, maxLine: 1 }, false, FISH.find((fish) => fish.id === id)!);
      return [...container!.querySelectorAll(".fight-water")].map((line) => line.textContent).filter((line) => /^(Jumper|Breacher|Roller|Scrapper|Long runner|Soft mouth):/.test(line ?? ""));
    };
    expect(habit("rainbow-trout")).toEqual(["Jumper: every second run is a leap, so let go when it comes up"]);
    expect(habit("sturgeon")).toEqual(["Breacher: its first run is a leap, so let go when it comes up"]);
    expect(habit("pike")).toEqual(["Roller: at the net it rolls on the line instead of running"]);
    expect(habit("carp")).toEqual(["Long runner: the first run is the long one, so let it go"]);
    expect(habit("crappie")).toEqual(["Soft mouth: reel in the red and the hook tears out"]);
    expect(habit("salmon")).toEqual([
      "Jumper: every second run is a leap, so let go when it comes up",
      "Long runner: the first run is the long one, so let it go",
    ]);
    expect(habit("smallmouth-bass")).toEqual([
      "Jumper: every second run is a leap, so let go when it comes up",
      "Scrapper: pound for pound it fights hardest, so it tires slowly",
    ]);
    expect(habit("perch")).toEqual([]);
  });

  it("calls a carp's long first run", () => {
    mount({ peakTension: 0.3, maxLine: 1 });
    const status = () => container!.querySelector(".fight-status")!.textContent;
    sim.current.firstRun = true;
    sim.current.surge = 1;
    frame();
    expect(status()).toBe("Let go now — its first run is the long one!");
    sim.current.surge = 2;
    frame();
    expect(status()).toBe("Let it run — the first run is the longest!");
    sim.current.firstRun = false;
    frame();
    expect(status()).not.toBe("Let it run — the first run is the longest!");
  });

  it("says which way to pull the rod against a run, cheers a turn, and says a leap or a roll can't be turned", () => {
    mount({ peakTension: 0.3, maxLine: 1 }, false, trout);
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
    expect(shown()).toEqual(["leap"]);
    expect(container!.querySelector(".fight-steer")!.textContent).toContain("A leap can't be turned — just let go");
    sim.current.jump = false;
    sim.current.roll = true;
    sim.current.surge = 1;
    frame();
    expect(shown()).toEqual(["roll"]);
    sim.current.surge = 0;
    sim.current.roll = false;
    frame();
    expect(shown()).toEqual(["calm"]);
  });

  it("has controller words beside the key and screen ones", () => {
    mount({ peakTension: 0.3, maxLine: 1 }, false, trout);
    const pad = [...container!.querySelectorAll(".on-pad")].map((part) => part.textContent);
    expect(pad).toContain("Turn a run: push the left stick the other way");
    expect(pad).toContain("(left stick)");
    expect(pad).toContain("HOLD A or RT to reel");
  });

  it("leaves the steering out for a starter fish's head shakes", () => {
    mount({ peakTension: 0.3, maxLine: 1 });
    sim.current.surge = 2;
    frame();
    expect(container!.querySelector(".fight-steer")).toBeNull();
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
