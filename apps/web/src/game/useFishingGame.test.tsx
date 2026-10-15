// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DOCK_STAND_X, DOCK_STAND_Z, FISH, SPOT_LABELS, type LakeHour, type Profile } from "@stillwater/shared";
import type { FightOutcome, FightPerformance } from "./fight";
import { HOTSPOT_PERIOD_MS, HOTSPOT_RADIUS, hotspotAt } from "./hotspot";
import { pickBite, waitMs } from "./logic";

const step = vi.fn<() => FightOutcome>(() => {
  throw new Error("simulated fight failure");
});
let fightPerformance: FightPerformance = { peakTension: 0.2, maxLine: 1 };
let fightLine = 1;

vi.mock("./fx", () => ({
  fx: { cast: vi.fn(), splash: vi.fn(), bite: vi.fn(), nibble: vi.fn(), plop: vi.fn(), rodBell: vi.fn(), snap: vi.fn(), land: vi.fn(), surge: vi.fn(), reel: vi.fn(), haptic: vi.fn(), drag: { set: vi.fn(), stop: vi.fn() } },
}));
// The tests time bites to the usual wait; the day's hot bank is kept off the dock.
vi.mock("@stillwater/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stillwater/shared")>();
  return { ...actual, hotBankForDay: () => "inlet" };
});
vi.mock("./eveningRise", () => ({ isRiseCast: () => true }));
vi.mock("./snag", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./snag")>();
  return { ...actual, castSnags: vi.fn(() => false) };
});
vi.mock("./logic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./logic")>();
  return { ...actual, pickBite: vi.fn(actual.pickBite) };
});
vi.mock("./fight", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./fight")>();
  return {
    ...actual,
    makeFight: () => ({ sim: { line: fightLine, tension: 0.2, surge: 0, stamina: 1, runSide: 1 }, performance: fightPerformance, step }),
  };
});

import { updateSettings } from "./settings";
import { RECAST_GUARD_MS, SECOND_TAKE_MS, useFishingGame } from "./useFishingGame";
import { fx } from "./fx";
import { castSnags, SNAG_AT_MS, SNAG_TAPS } from "./snag";

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

function Harness({ current = profile, hour = "day", rising = false }: { current?: Profile; hour?: LakeHour; rising?: boolean }) {
  const game = useFishingGame(current, hour, undefined, undefined, false, undefined, undefined, rising);
  return (
    <>
      <div ref={game.surfaceRef} data-stance="dock" data-aim="0.5,3" data-angler="0.15,7.42">
        <button type="button" data-thumb-strike>Strike</button>
        <button type="button" data-steer="-1">Left</button>
      </div>
      <output data-testid="phase">{game.phase}:{game.outcome?.kind ?? "none"}</output>
      <span data-testid="clean">{game.outcome?.kind === "landed" ? String(game.outcome.clean) : ""}</span>
      <i data-testid="broke">{game.outcome?.kind === "broke" ? game.outcome.message : ""}</i>
      <i data-testid="clean-run">{game.outcome?.kind === "landed" ? String(game.outcome.notes?.cleanRun) : ""}</i>
      <button type="button" onClick={game.dismissResult}>dismiss</button>
      <p data-testid="hint">{game.hint}</p>
      <b data-testid="bite">{game.bite ? `${game.bite.species.id}|${game.bite.weight}` : ""}</b>
      <b data-testid="fight">{game.fight ? `${game.fight.species.id}|${game.fight.weight}` : ""}</b>
      <b data-testid="missed">{game.outcome?.kind === "miss" && game.outcome.fish ? `${game.outcome.fish.species.id}|${game.outcome.fish.weight}` : ""}</b>
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
  fightLine = 1;
  step.mockClear();
  vi.mocked(pickBite).mockClear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Pins the clock so a bubble move never lands inside a test by accident. */
function mount(at = DOCK_BUBBLES.at, current = profile, hour: LakeHour = "day", rising = false) {
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
  act(() => root!.render(<Harness current={current} hour={hour} rising={rising} />));
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
    act(() => (container!.querySelector("button:not([data-thumb-strike]):not([data-steer])") as HTMLButtonElement).click());
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

    act(() => (container!.querySelector("button:not([data-thumb-strike]):not([data-steer])") as HTMLButtonElement).click());
    fightPerformance = { peakTension: 0.9, maxLine: 1 };
    step.mockReturnValueOnce("landed");
    castAndFight(surface, 2);
    expect(container!.querySelector("output")?.textContent).toBe("result:landed");
    expect(container!.querySelector("span")?.textContent).toBe("false");
  });

  it("counts clean fights in a row, and starts again after a dirty landing or a lost fish", () => {
    const surface = mount();
    const run = () => container!.querySelector("[data-testid=clean-run]")?.textContent;
    const dismiss = () => act(() => (container!.querySelector("button:not([data-thumb-strike]):not([data-steer])") as HTMLButtonElement).click());
    const land = (peakTension: number, seed: number) => {
      fightPerformance = { peakTension, maxLine: 1 };
      step.mockReturnValueOnce("landed");
      castAndFight(surface, seed);
    };

    land(0.5, 1);
    expect(run()).toBe("1");
    dismiss();
    land(0.5, 2);
    expect(run()).toBe("2");
    dismiss();
    land(0.9, 3);
    expect(run()).toBe("0");
    dismiss();
    land(0.5, 4);
    expect(run()).toBe("1");
    dismiss();
    step.mockReturnValueOnce("snapped");
    castAndFight(surface, 5);
    act(() => vi.advanceTimersByTime(5_000));
    land(0.5, 6);
    expect(run()).toBe("1");
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

    act(() => (container!.querySelector("button:not([data-thumb-strike]):not([data-steer])") as HTMLButtonElement).click());
    step.mockReturnValueOnce("escaped");
    castAndFight(surface, 2);
    expect(container!.querySelector("output")?.textContent).toBe("idle:broke");
    expect(hint()).toMatch(/ran out of line.*reel whenever the fish is calm/i);
  });

  it("says how close a snapped fish came to the net", () => {
    const surface = mount();
    const message = () => container!.querySelector("[data-testid=broke]")?.textContent;

    fightLine = 0.15;
    step.mockReturnValueOnce("snapped");
    castAndFight(surface, 1);
    expect(message()).toMatch(/snapped the line — too much tension\. It was 85% of the way in\.$/);

    act(() => (container!.querySelector("button:not([data-thumb-strike]):not([data-steer])") as HTMLButtonElement).click());
    fightLine = 0.95;
    step.mockReturnValueOnce("snapped");
    castAndFight(surface, 2);
    expect(message()).toMatch(/too much tension\.$/);
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

  it("says the hook is solid on a quick strike, and not on a slow one", () => {
    let surface = mount();
    cast(surface);
    act(() => vi.advanceTimersByTime(2_201));
    act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
    expect(hint()).toMatch(/^Hooked solid in 0\.00 s! /);
    act(() => root!.unmount());
    container!.remove();

    surface = mount();
    cast(surface);
    act(() => vi.advanceTimersByTime(2_201));
    now += 900;
    act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
    expect(phase()).toBe("fight:none");
    expect(hint()).not.toMatch(/hooked solid/i);
    // The limit is 40% of the strike window, which Accuracy and the starter mercy both widen.
    expect(hint()).toMatch(/^Hooked in 0\.90 s \(solid under 0\.\d\d s\)\. /);
  });

  it("holds the bite while the lure is snagged, and lets it come once tapped free", () => {
    vi.mocked(castSnags).mockReturnValueOnce(true);
    const surface = mount();
    cast(surface);
    act(() => vi.advanceTimersByTime(SNAG_AT_MS + 1));
    expect(hint()).toBe(`Snagged in the weed. Tap ${SNAG_TAPS} times to work it free.`);
    act(() => vi.advanceTimersByTime(20_000));
    expect(phase()).toBe("waiting:none");
    for (let tap = 1; tap < SNAG_TAPS; tap += 1) {
      act(() => surface.dispatchEvent(pointer("pointerdown", 10 + tap)));
      act(() => window.dispatchEvent(pointer("pointerup", 10 + tap)));
    }
    expect(hint()).toBe(`Working it free… ${SNAG_TAPS - 1} of ${SNAG_TAPS}`);
    act(() => surface.dispatchEvent(pointer("pointerdown", 20)));
    act(() => window.dispatchEvent(pointer("pointerup", 20)));
    expect(hint()).toBe("Free of the weed. Let it settle.");
    act(() => vi.advanceTimersByTime(2_201));
    expect(phase()).toBe("hookset:none");
  });

  it("holds the bite and the strike window while the game is in another tab", () => {
    const surface = mount();
    const show = (state: "hidden" | "visible") => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
      act(() => void document.dispatchEvent(new Event("visibilitychange")));
    };
    try {
      cast(surface);
      show("hidden");
      act(() => vi.advanceTimersByTime(60_000));
      expect(phase()).toBe("waiting:none");
      show("visible");
      act(() => vi.advanceTimersByTime(1_500));
      expect(phase()).toBe("hookset:none");
      show("hidden");
      act(() => vi.advanceTimersByTime(60_000));
      expect(phase()).toBe("hookset:none");
      show("visible");
      act(() => vi.advanceTimersByTime(100));
      expect(phase()).toBe("hookset:none");
      act(() => vi.advanceTimersByTime(20_000));
      expect(phase()).not.toBe("hookset:none");
    } finally {
      show("visible");
    }
  });

  it("strikes and reels from the thumb button, but never casts from it", () => {
    const surface = mount();
    const thumb = surface.querySelector<HTMLButtonElement>("[data-thumb-strike]")!;
    act(() => thumb.dispatchEvent(pointer("pointerdown", 2)));
    expect(phase()).toBe("idle:none");
    cast(surface);
    act(() => vi.advanceTimersByTime(2_201));
    expect(phase()).toBe("hookset:none");
    act(() => thumb.dispatchEvent(pointer("pointerdown", 3)));
    expect(phase()).toBe("fight:none");
    step.mockReturnValueOnce("fighting");
    now += 16;
    act(() => frames.at(-1)!(now));
    expect(step).toHaveBeenLastCalledWith(expect.any(Number), expect.any(Number), true, 0);
  });

  it("pulls the rod with ← → or A D and a held side button in a fight, and lets go when they do", () => {
    const surface = mount();
    const left = surface.querySelector<HTMLButtonElement>("[data-steer]")!;
    cast(surface);
    act(() => vi.advanceTimersByTime(2_201));
    act(() => surface.dispatchEvent(pointer("pointerdown", 3)));
    act(() => window.dispatchEvent(pointer("pointerup", 3)));
    expect(phase()).toBe("fight:none");
    const frame = () => {
      step.mockReturnValueOnce("fighting");
      now += 16;
      act(() => frames.at(-1)!(now));
      return (step.mock.lastCall as unknown[])[3];
    };
    act(() => void window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowRight", bubbles: true })));
    expect(frame()).toBe(1);
    act(() => void window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyA", bubbles: true })));
    expect(frame()).toBe(0);
    act(() => void window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowRight", bubbles: true })));
    expect(frame()).toBe(-1);
    act(() => void window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyA", bubbles: true })));
    expect(frame()).toBe(0);
    act(() => left.dispatchEvent(pointer("pointerdown", 4)));
    expect(frame()).toBe(-1);
    // The side button is not a reel.
    expect((step.mock.lastCall as unknown[])[2]).toBe(false);
    act(() => window.dispatchEvent(pointer("pointerup", 4)));
    expect(frame()).toBe(0);
  });

  it("keeps reeling between taps in toggle mode", () => {
    updateSettings({ reelMode: "toggle" });
    try {
      const surface = mount();
      cast(surface);
      act(() => vi.advanceTimersByTime(2_201));
      act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
      act(() => window.dispatchEvent(pointer("pointerup", 2)));
      expect(phase()).toBe("fight:none");
      const frame = () => {
        step.mockReturnValueOnce("fighting");
        now += 16;
        act(() => frames.at(-1)!(now));
        return (step.mock.lastCall as unknown as [number, number, boolean])[2];
      };
      // The strike tap started the reel and letting go did not stop it.
      expect(frame()).toBe(true);
      act(() => surface.dispatchEvent(pointer("pointerdown", 3)));
      act(() => window.dispatchEvent(pointer("pointerup", 3)));
      expect(frame()).toBe(false);
      act(() => surface.dispatchEvent(pointer("pointerdown", 4)));
      expect(frame()).toBe(true);
    } finally {
      updateSettings({ reelMode: "hold" });
    }
  });

  it("rings the rod bell on the nibble and the bite after dark, and only then", () => {
    const surface = mount(DOCK_BUBBLES.at, profile, "night");
    cast(surface);
    for (let ms = 0; ms < 20_000 && !vi.mocked(fx.rodBell).mock.calls.length; ms += 50) act(() => vi.advanceTimersByTime(50));
    expect(fx.rodBell).toHaveBeenCalledWith("jingle");
    expect(hint()).toBe("The rod bell jingles. Just a nibble, not yet…");
    for (let ms = 0; ms < 20_000 && phase() !== "hookset:none"; ms += 50) act(() => vi.advanceTimersByTime(50));
    expect(phase()).toBe("hookset:none");
    expect(fx.rodBell).toHaveBeenLastCalledWith("ring");
    act(() => root!.unmount());
    root = null;
    vi.mocked(fx.rodBell).mockClear();
    cast(mount());
    act(() => vi.advanceTimersByTime(2_201));
    expect(fx.rodBell).not.toHaveBeenCalled();
  });

  it("calls a cast stopped in the middle of the sweet band a perfect cast", () => {
    let surface = mount(DOCK_BUBBLES.at + HOTSPOT_PERIOD_MS);
    act(() => surface.dispatchEvent(pointer("pointerdown")));
    now += 560;
    act(() => window.dispatchEvent(pointer("pointerup")));
    expect(phase()).toBe("waiting:none");
    expect(hint()).toMatch(/^Perfect cast\. /);
    act(() => root!.unmount());
    root = null;
    surface = mount(DOCK_BUBBLES.at + HOTSPOT_PERIOD_MS);
    cast(surface);
    expect(hint()).not.toMatch(/Perfect/);
  });

  it("says a cast landed on a rise only while the evening rise is on", () => {
    cast(mount(DOCK_BUBBLES.at + HOTSPOT_PERIOD_MS, profile, "dusk", true));
    expect(hint()).toMatch(/^Right on a rise\. /);
    act(() => root!.unmount());
    root = null;
    cast(mount(DOCK_BUBBLES.at + HOTSPOT_PERIOD_MS, profile, "dusk", false));
    expect(hint()).not.toMatch(/rise/);
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

  it("keeps the short-cast warning in the bubbles and still draws only common fish", () => {
    const surface = mount();
    surface.dataset.angler = `${DOCK_STAND_X},${DOCK_STAND_Z}`;
    surface.dataset.aim = `${DOCK_BUBBLES.bubbles.x},${DOCK_BUBBLES.bubbles.z}`;
    act(() => surface.dispatchEvent(pointer("pointerdown")));
    now += 300;
    act(() => window.dispatchEvent(pointer("pointerup")));
    expect(hint()).toMatch(/short cast/i);
    expect(hint()).toMatch(/your lure is in the bubbles/i);
    act(() => vi.advanceTimersByTime(sooner()));
    vi.mocked(Math.random).mockReturnValue(0.99);
    act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
    expect(inBubbles()).toBe(true);
    expect(vi.mocked(pickBite).mock.lastCall?.[2]).toBe(true);
    expect(container!.querySelector("[data-testid=rarity]")?.textContent).toBe("common");
  });

  it("keeps a cast's bonus when the bubbles move before the bite", () => {
    const surface = mount(boundary - 1_000);
    surface.dataset.angler = `${DOCK_STAND_X},${DOCK_STAND_Z}`;
    surface.dataset.aim = `${DOCK_BUBBLES.bubbles.x},${DOCK_BUBBLES.bubbles.z}`;
    cast(surface);
    act(() => vi.advanceTimersByTime(sooner()));
    expect(phase()).toBe("hookset:none");
    act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
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
    act(() => (container!.querySelector("button:not([data-thumb-strike]):not([data-steer])") as HTMLButtonElement).click());
    expect(phase()).toBe("idle:none");
    expect(hint()).toBe(movedLine);

    cast(surface);
    act(() => vi.advanceTimersByTime(usual()));
    act(() => vi.advanceTimersByTime(5_000));
    act(() => (container!.querySelector("button:not([data-thumb-strike]):not([data-steer])") as HTMLButtonElement).click());
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

  /** A late roll draws the last fish in the pool, so a full dock pool hooks a catfish. The fish is rolled as the lure sits. */
  function lateRoll() {
    vi.mocked(Math.random).mockReturnValue(0.99);
  }

  function hookOnLateRoll(surface: HTMLDivElement) {
    act(() => vi.advanceTimersByTime(Math.ceil(waitMs(profile.patience, "day"))));
    act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
  }

  it("says a short cast only draws small fish, and only a common bites", () => {
    const surface = mount();
    lateRoll();
    castFor(surface, 300);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toBe("Short cast — only small fish will look.");
    hookOnLateRoll(surface);
    expect(phase()).toBe("fight:none");
    expect(rarity()).toBe("common");
  });

  it("keeps the plain wait hint for a cast in the band, which draws past the commons", () => {
    const surface = mount();
    lateRoll();
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

describe("level unlock integration", () => {
  it("rolls the fish as the lure sits and hooks that same fish", () => {
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 350 });
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(pickBite).toHaveBeenCalledTimes(1);
    const seen = container!.querySelector("[data-testid=bite]")!.textContent;
    expect(seen).toMatch(/.+\|[0-9.]+/);
    // A different roll by the time of the bite must not swap the fish under the bobber.
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    act(() => vi.advanceTimersByTime(2201));
    expect(phase()).toBe("hookset:none");
    expect(container!.querySelector("[data-testid=bite]")!.textContent).toBe(seen);
    act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
    expect(pickBite).toHaveBeenCalledTimes(1);
    expect(container!.querySelector("[data-testid=fight]")!.textContent).toBe(seen);
  });

  it("clears the rolled bite after a missed strike, and the miss keeps the fish that turned away", () => {
    const surface = mount();
    cast(surface);
    const seen = container!.querySelector("[data-testid=bite]")?.textContent;
    expect(seen).not.toBe("");
    act(() => vi.advanceTimersByTime(2201));
    act(() => vi.advanceTimersByTime(1400));
    expect(phase()).toBe("result:miss");
    expect(container!.querySelector("[data-testid=bite]")?.textContent).toBe("");
    expect(container!.querySelector("[data-testid=missed]")?.textContent).toBe(seen);
  });

  it("gives a bottom feeder that dropped the bait one more take before it leaves", () => {
    const surface = mount();
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "carp")!);
    cast(surface);
    act(() => vi.advanceTimersByTime(2201));
    expect(phase()).toBe("hookset:none");
    expect(hint()).toBe("It's taking it — strike!");
    act(() => vi.advanceTimersByTime(1400));
    expect(phase()).toBe("waiting:none");
    expect(hint()).toMatch(/second take/i);
    act(() => vi.advanceTimersByTime(SECOND_TAKE_MS));
    expect(phase()).toBe("hookset:none");
    act(() => vi.advanceTimersByTime(1400));
    expect(phase()).toBe("result:miss");
    expect(container!.querySelector("[data-testid=missed]")?.textContent).toMatch(/^carp\|/);
  });

  it("calls a predator's bite as a hit and a usual fish's as NOW", () => {
    const surface = mount();
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "pike")!);
    cast(surface);
    act(() => vi.advanceTimersByTime(2201));
    expect(hint()).toBe("WHAM — it hit! Strike!");
    act(() => vi.advanceTimersByTime(1400));
    act(() => (container!.querySelector("button:not([data-thumb-strike]):not([data-steer])") as HTMLButtonElement).click());
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "perch")!);
    cast(surface);
    act(() => vi.advanceTimersByTime(2201));
    expect(hint()).toBe("NOW — strike!");
  });

  it.each([[350, "idle:none"], [700, "casting:none"]] as const)("uses the level range at %i lifetime points", (points, expected) => {
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: points });
    surface.dataset.stance = "dropoff";
    surface.dataset.angler = "15.4,7.8";
    surface.dataset.aim = "15.4,-5.4";
    act(() => surface.dispatchEvent(pointer("pointerdown")));
    expect(phase()).toBe(expected);
    if (points === 700) {
      now += 500;
      act(() => window.dispatchEvent(pointer("pointerup")));
      expect(phase()).toBe("waiting:none");
    }
  });
});

describe("useFishingGame tap-to-walk", () => {
  it("leaves a tap the scene turned into a walk alone, and casts on the next tap at the water", () => {
    const surface = mount();
    const before = hint();
    surface.dataset.walk = "1";
    surface.dataset.aim = "none";
    act(() => surface.dispatchEvent(pointer("pointerdown")));
    expect(phase()).toBe("idle:none");
    expect(hint()).toBe(before);
    act(() => window.dispatchEvent(pointer("pointerup")));
    surface.dataset.walk = "0";
    surface.dataset.aim = "0.5,3";
    act(() => surface.dispatchEvent(pointer("pointerdown")));
    expect(phase()).toBe("casting:none");
  });
});

describe("useFishingGame fast recast", () => {
  /** Casts and lets the bite go by, so the round ends on a missed strike. */
  function missABite(surface: HTMLDivElement) {
    cast(surface);
    act(() => vi.advanceTimersByTime(20_000));
    expect(phase()).toBe("result:miss");
  }

  it("casts straight from a missed strike with a click on the water", () => {
    const surface = mount();
    missABite(surface);
    now += RECAST_GUARD_MS;
    act(() => surface.dispatchEvent(pointer("pointerdown", 5)));
    expect(phase()).toBe("casting:none");
    now += 500;
    act(() => window.dispatchEvent(pointer("pointerup", 5)));
    expect(phase()).toBe("waiting:none");
  });

  it("casts straight from a result with Space", () => {
    const surface = mount();
    missABite(surface);
    now += RECAST_GUARD_MS;
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", bubbles: true })));
    expect(phase()).toBe("casting:none");
  });

  it("keeps the result up through a click that lands as it appears", () => {
    const surface = mount();
    missABite(surface);
    now += RECAST_GUARD_MS - 100;
    act(() => surface.dispatchEvent(pointer("pointerdown", 5)));
    expect(phase()).toBe("result:miss");
  });
});

describe("useFishingGame haptics", () => {
  it("buzzes on the bite and again on the strike", () => {
    const surface = mount();
    vi.mocked(fx.haptic).mockClear();
    cast(surface);
    act(() => vi.advanceTimersByTime(Math.ceil(waitMs(profile.patience, "day"))));
    expect(phase()).toBe("hookset:none");
    expect(vi.mocked(fx.haptic).mock.calls.map(([beat]) => beat)).toContain("bite");
    act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
    expect(vi.mocked(fx.haptic)).toHaveBeenLastCalledWith("strike");
  });
});

describe("useFishingGame drag tone", () => {
  it("sings the drag through the fight and stops it when the fight ends", () => {
    const surface = mount();
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 2);
    expect(phase()).toBe("fight:none");
    expect(vi.mocked(fx.drag.set)).toHaveBeenCalled();
    vi.mocked(fx.drag.stop).mockClear();
    act(() => root!.unmount());
    root = null;
    expect(vi.mocked(fx.drag.stop)).toHaveBeenCalled();
  });
});
