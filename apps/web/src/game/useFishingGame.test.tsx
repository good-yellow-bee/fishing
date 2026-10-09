// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DOCK_STAND_X, DOCK_STAND_Z, SPOT_LABELS, type Profile } from "@stillwater/shared";
import type { FightOutcome, FightPerformance } from "./fight";
import { HOTSPOT_PERIOD_MS, HOTSPOT_RADIUS, hotspotAt } from "./hotspot";
import { pickBite, waitMs } from "./logic";

const step = vi.fn<() => FightOutcome>(() => {
  throw new Error("simulated fight failure");
});
let fightPerformance: FightPerformance = { peakTension: 0.2, maxLine: 1 };

vi.mock("./fx", () => ({
  fx: { cast: vi.fn(), splash: vi.fn(), bite: vi.fn(), nibble: vi.fn(), snap: vi.fn(), land: vi.fn(), surge: vi.fn(), reel: vi.fn() },
}));
vi.mock("./logic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./logic")>();
  return { ...actual, pickBite: vi.fn(actual.pickBite) };
});
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

/** Mid-period with the bubbles on the dock, clear of the harness's default aim at 0.5,3. */
function dockBubbles() {
  for (let period = Math.floor(Date.UTC(2026, 9, 8, 12) / HOTSPOT_PERIOD_MS); ; period += 1) {
    const at = (period + 0.5) * HOTSPOT_PERIOD_MS;
    const bubbles = hotspotAt(at, 1);
    if (bubbles.spot === "dock" && Math.hypot(bubbles.x - 0.5, bubbles.z - 3) > HOTSPOT_RADIUS * 2) return { at, bubbles };
  }
}

const DOCK_BUBBLES = dockBubbles();

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
      <i data-testid="rarity">{game.fight?.species.rarity ?? ""}</i>
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

/** Pins the clock so a bubble move never lands inside a test by accident. */
function mount(at = DOCK_BUBBLES.at) {
  vi.useFakeTimers();
  vi.setSystemTime(at);
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

const hint = () => container!.querySelector("[data-testid=hint]")?.textContent;
const phase = () => container!.querySelector("output")?.textContent;

function cast(surface: HTMLDivElement) {
  act(() => surface.dispatchEvent(pointer("pointerdown")));
  now += 500;
  act(() => window.dispatchEvent(pointer("pointerup")));
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

describe("useFishingGame lost fight", () => {
  const hint = () => container!.querySelector("[data-testid=hint]")?.textContent;

  it("says why the line broke and what to do next time", () => {
    const surface = mount();

    step.mockReturnValueOnce("snapped");
    castAndFight(surface, 1);
    expect(container!.querySelector("output")?.textContent).toBe("idle:broke");
    expect(hint()).toMatch(/too much tension.*let go when the bar turns red or the fish is about to run/i);

    act(() => (container!.querySelector("button") as HTMLButtonElement).click());
    step.mockReturnValueOnce("escaped");
    castAndFight(surface, 2);
    expect(container!.querySelector("output")?.textContent).toBe("idle:broke");
    expect(hint()).toMatch(/ran out of line.*reel whenever the fish is calm/i);
  });
});

describe("useFishingGame strike timing", () => {
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

  it("takes back the early-strike hint when a second finger shows it was a camera pinch", () => {
    const surface = mount();
    cast(surface);
    act(() => vi.advanceTimersByTime(600));
    act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
    expect(hint()).toMatch(/too early/i);
    const second = new MouseEvent("pointerdown", { bubbles: true, button: 0 });
    Object.defineProperties(second, { pointerId: { value: 3 }, isPrimary: { value: false }, pointerType: { value: "touch" } });
    act(() => surface.dispatchEvent(second));
    expect(hint()).toMatch(/watch the bobber/i);
    expect(phase()).toBe("waiting:none");
  });
});

describe("useFishingGame bubbling hotspot", () => {
  const sooner = () => Math.ceil(waitMs(profile.patience, "day", true));
  const usual = () => Math.ceil(waitMs(profile.patience, "day"));
  const inBubbles = () => vi.mocked(pickBite).mock.lastCall?.[7];
  const boundary = DOCK_BUBBLES.bubbles.startsAt + HOTSPOT_PERIOD_MS;
  const movedLine = `The bubbles moved to the ${SPOT_LABELS[hotspotAt(boundary, 1).spot]}.`;

  it("tells the angler the lure is in the bubbles, brings the bite sooner and draws from the bubbles' odds", () => {
    const surface = mount();
    surface.dataset.angler = `${DOCK_STAND_X},${DOCK_STAND_Z}`;
    surface.dataset.aim = `${DOCK_BUBBLES.bubbles.x},${DOCK_BUBBLES.bubbles.z}`;
    cast(surface);
    expect(hint()).toMatch(/your lure is in the bubbles/i);
    // A camera pinch takes back the early strike's hint, not the bubbles line.
    act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
    expect(hint()).toMatch(/too early/i);
    const pinch = new MouseEvent("pointerdown", { bubbles: true, button: 0 });
    Object.defineProperties(pinch, { pointerId: { value: 3 }, isPrimary: { value: false }, pointerType: { value: "touch" } });
    act(() => surface.dispatchEvent(pinch));
    expect(hint()).toMatch(/your lure is in the bubbles/i);
    act(() => window.dispatchEvent(pointer("pointerup", 2)));

    expect(sooner()).toBeLessThan(waitMs(profile.patience, "day"));
    act(() => vi.advanceTimersByTime(sooner()));
    expect(phase()).toBe("hookset:none");
    act(() => surface.dispatchEvent(pointer("pointerdown", 4)));
    expect(phase()).toBe("fight:none");
    expect(inBubbles()).toBe(true);
  });

  it("waits the usual time and draws the usual odds for a cast outside the bubbles", () => {
    const surface = mount();
    surface.dataset.angler = `${DOCK_STAND_X},${DOCK_STAND_Z}`;
    cast(surface);
    expect(hint()).toMatch(/watch the bobber/i);
    expect(hint()).not.toMatch(/bubbles/i);
    act(() => vi.advanceTimersByTime(sooner()));
    expect(phase()).toBe("waiting:none");
    act(() => vi.advanceTimersByTime(usual() - sooner()));
    expect(phase()).toBe("hookset:none");
    act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
    expect(phase()).toBe("fight:none");
    expect(inBubbles()).toBe(false);
  });

  it("tells an idle angler where the bubbles went, but leaves a waiting angler's hint alone", () => {
    mount(boundary - 1_000);
    act(() => vi.advanceTimersByTime(1_001));
    expect(hint()).toBe(movedLine);
    act(() => root?.unmount());
    container?.remove();

    const surface = mount(boundary - 1_000);
    cast(surface);
    act(() => vi.advanceTimersByTime(1_001));
    expect(phase()).toBe("waiting:none");
    expect(hint()).toMatch(/watch the bobber/i);
  });

  it("tells a move that came mid-cast once the angler is back to idle, and only once", () => {
    const surface = mount(boundary - 1_000);
    cast(surface);
    act(() => vi.advanceTimersByTime(1_001));
    expect(phase()).toBe("waiting:none");
    act(() => vi.advanceTimersByTime(usual()));
    expect(phase()).toBe("hookset:none");
    act(() => vi.advanceTimersByTime(5_000));
    expect(phase()).toBe("result:miss");
    expect(hint()).not.toBe(movedLine);
    act(() => (container!.querySelector("button") as HTMLButtonElement).click());
    expect(phase()).toBe("idle:none");
    expect(hint()).toBe(movedLine);

    cast(surface);
    act(() => vi.advanceTimersByTime(usual()));
    act(() => vi.advanceTimersByTime(5_000));
    act(() => (container!.querySelector("button") as HTMLButtonElement).click());
    expect(hint()).not.toBe(movedLine);
  });
});

describe("useFishingGame cast feedback", () => {
  const hint = () => container!.querySelector("[data-testid=hint]")?.textContent;
  const phase = () => container!.querySelector("output")?.textContent;
  const rarity = () => container!.querySelector("[data-testid=rarity]")?.textContent;

  /** Full power takes 900ms; Accuracy 3 puts the band at about 0.50–0.75. */
  function castFor(surface: HTMLDivElement, holdMs: number) {
    act(() => surface.dispatchEvent(pointer("pointerdown")));
    now += holdMs;
    act(() => window.dispatchEvent(pointer("pointerup")));
  }

  /** A late roll draws the last fish in the pool, so a full dock pool hooks a catfish. */
  function hookOnLateRoll(surface: HTMLDivElement) {
    act(() => vi.advanceTimersByTime(2_201));
    vi.mocked(Math.random).mockReturnValue(0.99);
    act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
  }

  it("says a short cast only draws small fish, and only a common bites", () => {
    const surface = mount();
    castFor(surface, 300);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toBe("Short cast — only small fish will look.");
    hookOnLateRoll(surface);
    expect(phase()).toBe("fight:none");
    expect(rarity()).toBe("common");
  });

  it("keeps the plain wait hint for a cast in the band, which draws past the commons", () => {
    const surface = mount();
    castFor(surface, 500);
    expect(hint()).toMatch(/watch the bobber/i);
    hookOnLateRoll(surface);
    expect(phase()).toBe("fight:none");
    expect(rarity()).toBe("uncommon");
  });

  it("does not call out a release past the band, since only a backlash changes anything", () => {
    const surface = mount();
    castFor(surface, 800);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toMatch(/watch the bobber/i);
  });

  it("puts the short-cast hint back when an early strike turns out to be a camera pinch", () => {
    const surface = mount();
    castFor(surface, 300);
    act(() => vi.advanceTimersByTime(600));
    act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
    expect(hint()).toMatch(/too early/i);
    const second = new MouseEvent("pointerdown", { bubbles: true, button: 0 });
    Object.defineProperties(second, { pointerId: { value: 3 }, isPrimary: { value: false }, pointerType: { value: "touch" } });
    act(() => surface.dispatchEvent(second));
    expect(hint()).toMatch(/short cast/i);
  });
});

