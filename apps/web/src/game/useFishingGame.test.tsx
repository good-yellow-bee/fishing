// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DOCK_STAND_X, DOCK_STAND_Z, FISH, SPOT_LABELS, type LakeHour, type LakeSeason, type Profile, type Sky, type Wind } from "@stillwater/shared";
import { floodedInlet, makeFight, springRunTireMul, SPRING_RUN_TIRE, currentTireMul, CURRENT_FIGHTER_TIRE, type FightOutcome, type FightPerformance } from "./fight";
import { HOTSPOT_PERIOD_MS, HOTSPOT_RADIUS, hotspotAt } from "./hotspot";
import { castIntoSpooked, GROUNDBAIT_CASTS, GROUNDBAIT_HANDFULS, pickBite, RAIN_INLET_WAIT, rainInletWaitMul, SPRING_SHALLOWS_WAIT, springShallowsWaitMul, waitMs, SPINNER_REED_WAIT, spinnerReedWaitMul, FLOAT_REED_WAIT, floatReedWaitMul, STREAMER_LEDGE_WAIT, streamerLedgeWaitMul, WORM_INLET_WAIT, wormInletWaitMul, SPINNER_INLET_WAIT, spinnerInletWaitMul, CRANK_PILING_WAIT, crankPilingWaitMul, SPOON_OPEN_WAIT, spoonOpenWaitMul, DARK_NIGHT_WAIT, darkNightWaitMul, OPEN_GLARE_WAIT, openGlareWaitMul, WIND_POINT_WAIT, windPointWaitMul, LANTERN_DOCK_WAIT, lanternDockWaitMul, WINTER_SUN_WAIT, winterSunWaitMul } from "./logic";
import { LIGHT_HOLD, stealsBait } from "./nibblePlan";

const step = vi.fn<() => FightOutcome>(() => {
  throw new Error("simulated fight failure");
});
let fightPerformance: FightPerformance = { peakTension: 0.2, maxLine: 1 };
let fightLine = 1;

vi.mock("./fx", () => ({
  fx: { cast: vi.fn(), splash: vi.fn(), bite: vi.fn(), nibble: vi.fn(), plop: vi.fn(), rodBell: vi.fn(), snap: vi.fn(), land: vi.fn(), surge: vi.fn(), reel: vi.fn(), lift: vi.fn(), haptic: vi.fn(), drag: { set: vi.fn(), stop: vi.fn() } },
}));
// The tests time bites to the usual wait; the day's hot bank is kept off the dock.
vi.mock("@stillwater/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stillwater/shared")>();
  return { ...actual, hotBankForDay: () => "inlet" };
});
vi.mock("./eveningRise", () => ({ isRiseCast: () => true }));
vi.mock("./snag", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./snag")>();
  return { ...actual, castSnags: vi.fn(() => null) };
});
// Bait thieves are random; each test that wants one says so.
vi.mock("./nibblePlan", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./nibblePlan")>();
  return { ...actual, stealsBait: vi.fn(() => false) };
});
// A pike grabs the shiner only when a test says so.
vi.mock("./grab", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./grab")>();
  return { ...actual, grabberFor: vi.fn(() => null), followerFor: vi.fn(() => null) };
});
// The fish that got away comes back only when a test says so.
vi.mock("./gotAway", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./gotAway")>();
  return { ...actual, castForGotAway: vi.fn(() => ({ again: null, next: null })) };
});
vi.mock("./logic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./logic")>();
  // Spooked water is tested on its own; elsewhere a lost fish leaves the next wait as it was.
  return { ...actual, pickBite: vi.fn(actual.pickBite), castIntoSpooked: vi.fn(() => false), springShallowsWaitMul: vi.fn(actual.springShallowsWaitMul), rainInletWaitMul: vi.fn(actual.rainInletWaitMul), winterSunWaitMul: vi.fn(actual.winterSunWaitMul), windPointWaitMul: vi.fn(actual.windPointWaitMul), lanternDockWaitMul: vi.fn(actual.lanternDockWaitMul), openGlareWaitMul: vi.fn(actual.openGlareWaitMul), darkNightWaitMul: vi.fn(actual.darkNightWaitMul), spoonOpenWaitMul: vi.fn(actual.spoonOpenWaitMul), spinnerReedWaitMul: vi.fn(actual.spinnerReedWaitMul), floatReedWaitMul: vi.fn(actual.floatReedWaitMul), streamerLedgeWaitMul: vi.fn(actual.streamerLedgeWaitMul), wormInletWaitMul: vi.fn(actual.wormInletWaitMul), spinnerInletWaitMul: vi.fn(actual.spinnerInletWaitMul), crankPilingWaitMul: vi.fn(actual.crankPilingWaitMul), waitMs: vi.fn(actual.waitMs) };
});
vi.mock("./fight", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./fight")>();
  return {
    ...actual,
    makeFight: vi.fn(() => ({ sim: { line: fightLine, tension: 0.2, surge: 0, stamina: 1, runSide: 1 }, performance: fightPerformance, step })),
    floodedInlet: vi.fn(actual.floodedInlet),
    springRunTireMul: vi.fn(actual.springRunTireMul),
    currentTireMul: vi.fn(actual.currentTireMul),
  };
});

import { updateSettings } from "./settings";
import { carriesBait, FOLLOW_MS, hasTrebles, isLiveBait, RECAST_GUARD_MS, SECOND_TAKE_MS, SECOND_TAKE_NIBBLE_MS, TOPWATER_COMEBACK_MS, TOPWATER_COMEBACK_ODDS, TIRE_REASONS, TOPWATER_POPS, useFishingGame, WAIT_REASONS } from "./useFishingGame";
import { fx } from "./fx";
import { castSnags, SNAG_AT_MS, SNAG_TAPS } from "./snag";
import { followerFor, grabberFor } from "./grab";
import { castForGotAway } from "./gotAway";

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

function Harness({ current = profile, hour = "day", rising = false, lure, wind, sky, season }: { current?: Profile; hour?: LakeHour; rising?: boolean; lure?: string; wind?: Wind; sky?: Sky; season?: LakeSeason }) {
  const game = useFishingGame(current, hour, lure === undefined ? undefined : { current: lure }, sky, false, season, undefined, rising, wind);
  return (
    <>
      <div ref={game.surfaceRef} data-stance="dock" data-aim="0.5,3" data-angler="0.15,7.42">
        <button type="button" data-thumb-strike>Strike</button>
        <button type="button" data-steer="-1">Left</button>
      </div>
      <output data-testid="phase">{game.phase}:{game.outcome?.kind ?? "none"}</output>
      <span data-testid="clean">{game.outcome?.kind === "landed" ? String(game.outcome.clean) : ""}</span>
      <i data-testid="broke">{game.outcome?.kind === "broke" ? game.outcome.message : ""}</i>
      <i data-testid="second-take">{game.outcome?.kind === "landed" ? String(game.outcome.notes?.secondTake) : ""}</i>
      <i data-testid="grabbed">{game.outcome?.kind === "landed" ? String(game.outcome.notes?.grabbed) : ""}</i>
      <i data-testid="landed-note">{game.outcome?.kind === "landed" ? (game.outcome.note ?? "") : ""}</i>
      <i data-testid="got-away">{game.outcome?.kind === "landed" ? String(game.outcome.notes?.gotAway) : ""}</i>
      <i data-testid="lurking">{String(game.lurking)}</i>
      <i data-testid="closing">{String(game.lurkerCloseInMs > 0)}</i>
      <i data-testid="strike-window">{game.strikeWindowMs}</i>
      <i data-testid="clean-run">{game.outcome?.kind === "landed" ? String(game.outcome.notes?.cleanRun) : ""}</i>
      <button type="button" onClick={game.dismissResult}>dismiss</button>
      <button type="button" onClick={game.throwGroundbait}>groundbait</button>
      <i data-testid="groundbait">{game.handfuls}|{game.groundbait ? `${game.groundbait.spot}:${game.groundbait.casts}` : ""}</i>
      <p data-testid="hint">{game.hint}</p>
      <b data-testid="bite">{game.bite ? `${game.bite.species.id}|${game.bite.weight}` : ""}</b>
      <b data-testid="fight">{game.fight ? `${game.fight.species.id}|${game.fight.weight}` : ""}</b>
      <i data-testid="miss-message">{game.outcome?.kind === "miss" ? game.outcome.message : ""}</i>
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
function mount(at = DOCK_BUBBLES.at, current = profile, hour: LakeHour = "day", rising = false, lure?: string, wind?: Wind, sky?: Sky, season?: LakeSeason) {
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
  act(() => root!.render(<Harness current={current} hour={hour} rising={rising} lure={lure} wind={wind} sky={sky} season={season} />));
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

  it.each([
    ["winter", true],
    ["summer", false],
  ] as const)("says a perch landed in %s leaves a big winter school: %s", (season, big) => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, undefined, undefined, undefined, season);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "perch")!);
    step.mockReturnValueOnce("landed");
    castAndFight(surface, 1);
    expect(phase()).toBe("result:landed");
    expect(hint()?.includes("there's a big winter school here")).toBe(big);
    expect(hint()?.includes("there's a school here")).toBe(!big);
    // The landed card covers the hint, so the school rides on the outcome for the card too.
    expect(container!.querySelector("[data-testid=landed-note]")?.textContent).toBe(
      big ? "Yellow perch: there's a big winter school here, and it stays a while. Cast again quickly!" : "Yellow perch: there's a school here, cast again quickly!",
    );
  });

  it("leaves the landed note empty when the bank holds nothing new", () => {
    const surface = mount();
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "pike")!);
    step.mockReturnValueOnce("landed");
    castAndFight(surface, 1);
    expect(phase()).toBe("result:landed");
    expect(container!.querySelector("[data-testid=landed-note]")?.textContent).toBe("");
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

  it("lets a pike take the hooked fish halfway in, and fights the pike from there", () => {
    const surface = mount();
    const pike = FISH.find((fish) => fish.id === "pike")!;
    vi.mocked(grabberFor).mockReturnValueOnce(pike);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "golden-shiner")!);
    fightLine = 0.4;
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 1);
    expect(container!.querySelector("[data-testid=fight]")?.textContent).toMatch(/^pike\|/);
    expect(hint()).toContain("A pike grabbed your shiner!");
    expect(phase()).toBe("fight:none");
    step.mockReturnValueOnce("landed");
    now += 16;
    act(() => frames.at(-1)!(now));
    expect(phase()).toBe("result:landed");
    expect(container!.querySelector("[data-testid=grabbed]")?.textContent).toBe("golden-shiner");
  });

  it("keeps a pike that followed a shiner in about the bank, and says so when it bites", () => {
    const surface = mount();
    const pike = FISH.find((fish) => fish.id === "pike")!;
    vi.mocked(followerFor).mockReturnValueOnce(pike);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "golden-shiner")!);
    step.mockReturnValueOnce("landed");
    castAndFight(surface, 1);
    expect(phase()).toBe("result:landed");
    expect(hint()).toMatch(/A pike followed it in to the bank! It's still about: cast here again\.$/);
    expect(container!.querySelector("[data-testid=landed-note]")?.textContent).toMatch(/A pike followed it in to the bank! It's still about: cast here again\.$/);
    const waiting = vi.mocked(castForGotAway).mock.calls.length;
    act(() => (container!.querySelector("button:not([data-thumb-strike]):not([data-steer])") as HTMLButtonElement).click());
    vi.mocked(castForGotAway).mockImplementationOnce((lost) => ({ again: lost, next: null }));
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 2);
    expect(vi.mocked(castForGotAway).mock.calls[waiting]?.[0]).toMatchObject({ spot: "dock", species: { id: "pike" }, follow: true });
    expect(hint()).toContain("It's the one that followed your fish in!");
    step.mockReturnValueOnce("landed");
    now += 16;
    act(() => frames.at(-1)!(now));
    expect(container!.querySelector("[data-testid=got-away]")?.textContent).toBe("false");
  });

  it("brings a fish that broke off back at the same weight, and says so", () => {
    const surface = mount();
    const pike = FISH.find((fish) => fish.id === "pike")!;
    vi.mocked(pickBite).mockReturnValueOnce(pike);
    step.mockReturnValueOnce("snapped");
    castAndFight(surface, 1);
    expect(phase()).toBe("idle:broke");
    expect(hint()).toContain("It's still about: cast here again.");
    const lost = vi.mocked(castForGotAway).mock.calls.length;
    expect(container!.querySelector("[data-testid=lurking]")?.textContent).toBe("false");
    expect(container!.querySelector("[data-testid=closing]")?.textContent).toBe("false");
    act(() => (container!.querySelector("button:not([data-thumb-strike]):not([data-steer])") as HTMLButtonElement).click());
    vi.mocked(castForGotAway).mockImplementationOnce((waiting) => ({ again: waiting, next: null }));
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 2);
    const waiting = vi.mocked(castForGotAway).mock.calls[lost]?.[0];
    expect(container!.querySelector("[data-testid=lurking]")?.textContent).toBe("true");
    expect(container!.querySelector("[data-testid=closing]")?.textContent).toBe("true");
    expect(waiting).toMatchObject({ spot: "dock", species: { id: "pike" } });
    expect(container!.querySelector("[data-testid=fight]")?.textContent).toBe(`pike|${waiting!.weight}`);
    expect(hint()).toContain("It's the one that got away!");
    step.mockReturnValueOnce("landed");
    now += 16;
    act(() => frames.at(-1)!(now));
    expect(container!.querySelector("[data-testid=got-away]")?.textContent).toBe("true");
  });

  it("calls a trophy-sized fish heavy on the hook, with a thud on the rod", () => {
    const surface = mount();
    const pike = FISH.find((fish) => fish.id === "pike")!;
    vi.mocked(castForGotAway).mockReturnValueOnce({ again: { spot: "dock", species: pike, weight: pike.maxWeight, casts: 1 }, next: null });
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 1);
    expect(hint()).toMatch(/^It's the one that got away! It feels heavy — could be a trophy! A fish this big makes a long first run\. /);
    expect(fx.lift).toHaveBeenCalled();
  });

  it.each([
    ["winter", true],
    ["summer", false],
  ] as const)("says a fish hooked in %s is sluggish in the cold: %s", (season, cold) => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, undefined, undefined, undefined, season);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "perch")!);
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 1);
    expect(phase()).toBe("fight:none");
    expect(hint()?.includes("The cold water has it sluggish, so it tires sooner.")).toBe(cold);
  });

  it.each([true, false])("says a swollen inlet pulls harder on a slack line: %s", (flood) => {
    vi.mocked(floodedInlet).mockReturnValueOnce(flood).mockReturnValueOnce(flood);
    const surface = mount();
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 1);
    expect(phase()).toBe("fight:none");
    expect(hint()?.includes("The swollen inlet pulls harder on a slack line.")).toBe(flood);
    expect(vi.mocked(makeFight).mock.calls.at(-1)?.[11]).toBe(flood);
  });

  it.each([
    ["spring", "pike", true],
    ["summer", "pike", false],
    ["spring", "largemouth-bass", false],
  ] as const)("says a fish hooked in %s (%s) is worn from spawning: %s", (season, id, spent) => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, undefined, undefined, undefined, season);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === id)!);
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 1);
    expect(phase()).toBe("fight:none");
    expect(hint()?.includes("It's worn from spawning, so it tires sooner.")).toBe(spent);
  });

  it.each([
    ["dusk", "walleye", true],
    ["day", "walleye", false],
    ["dusk", "pike", false],
  ] as const)("says a fish hooked at %s (%s) hunts hardest in the low light: %s", (hour, id, dim) => {
    const surface = mount(DOCK_BUBBLES.at, profile, hour);
    vi.mocked(waitMs).mockReturnValueOnce(2_000);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === id)!);
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 1);
    expect(phase()).toBe("fight:none");
    expect(hint()?.includes("It hunts hardest in the low light, so it tires slower.")).toBe(dim);
  });

  it.each([true, false])("says a fish on its spring run up the inlet tires slower: %s", (running) => {
    if (running) vi.mocked(springRunTireMul).mockReturnValueOnce(SPRING_RUN_TIRE).mockReturnValueOnce(SPRING_RUN_TIRE);
    const surface = mount();
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 1);
    expect(phase()).toBe("fight:none");
    expect(hint()?.includes("It's on its spring run up the inlet, so it tires slower.")).toBe(running);
  });

  it.each([true, false])("says a fish fighting the inlet's current tires slower: %s", (fighting) => {
    if (fighting) vi.mocked(currentTireMul).mockReturnValueOnce(CURRENT_FIGHTER_TIRE).mockReturnValueOnce(CURRENT_FIGHTER_TIRE);
    const surface = mount();
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 1);
    expect(phase()).toBe("fight:none");
    expect(hint()?.includes("It turns its side to the current and fights it, so it tires slower.")).toBe(fighting);
  });

  it.each([
    ["summer", "carp", true],
    ["summer", "largemouth-bass", true],
    ["spring", "carp", false],
    ["summer", "pike", false],
  ] as const)("says a fish hooked in %s (%s) thrives in the warm water: %s", (season, id, said) => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, undefined, undefined, undefined, season);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === id)!);
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 1);
    expect(phase()).toBe("fight:none");
    expect(hint()?.includes("It thrives in the warm summer water and is at its strongest, so it tires slower.")).toBe(said);
  });

  it.each([
    ["fall", "tiger-muskie", true],
    ["summer", "tiger-muskie", false],
    ["fall", "pike", true],
    ["fall", "walleye", false],
  ] as const)("says a fish hooked in %s (%s) has fed hard for winter: %s", (season, id, fed) => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, undefined, undefined, undefined, season);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === id)!);
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 1);
    expect(phase()).toBe("fight:none");
    expect(hint()?.includes("It has fed hard for winter and is at full strength, so it tires slower.")).toBe(fed);
  });

  it.each([
    ["rain", "catfish", true],
    [undefined, "catfish", false],
    ["rain", "pike", false],
  ] as const)("says a fish hooked in %s (%s) hunts by smell in the murky water: %s", (sky, id, murky) => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, undefined, undefined, sky);
    vi.mocked(waitMs).mockReturnValueOnce(2_000);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === id)!);
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 1);
    expect(phase()).toBe("fight:none");
    expect(hint()?.includes("It hunts by smell in the murky rain water and fights at full strength, so it tires slower.")).toBe(murky);
  });

  it.each(["burbot", "pike"])("says a %s hooked in winter thrives in the cold", (id) => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, undefined, undefined, undefined, "winter");
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === id)!);
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 1);
    expect(phase()).toBe("fight:none");
    expect(hint()).toContain("It thrives in the cold, so it keeps its strength.");
    expect(hint()).not.toContain("sluggish");
  });

  it("says a jumper hooked in winter won't jump", () => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, undefined, undefined, undefined, "winter");
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "largemouth-bass")!);
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 1);
    expect(phase()).toBe("fight:none");
    expect(hint()).toContain("The cold water has it sluggish: it tires sooner and won't jump.");
  });

  it.each([
    ["summer", "brook-trout", true],
    ["winter", "brook-trout", false],
    ["summer", "largemouth-bass", false],
  ] as const)("says a fish hooked in %s (%s) is short of air in the warm water: %s", (season, id, warm) => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, undefined, undefined, undefined, season);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === id)!);
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 1);
    expect(phase()).toBe("fight:none");
    expect(hint()?.includes("The warm water leaves it short of air, so it tires sooner.")).toBe(warm);
  });

  it.each([
    ["rain", true],
    [undefined, false],
  ] as const)("says a summer rain has cooled the water for a cold-water fish (%s): %s", (sky, cooled) => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, undefined, undefined, sky, "summer");
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "brook-trout")!);
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 1);
    expect(phase()).toBe("fight:none");
    expect(hint()?.includes("The rain has cooled the water, so it keeps its strength.")).toBe(cooled);
    expect(hint()?.includes("The warm water leaves it short of air, so it tires sooner.")).toBe(!cooled);
  });

  it.each([
    ["dropoff", true],
    ["dock", false],
  ] as const)("says a cold-water fish hooked in summer at the %s has found cool water down deep: %s", (stance, cooled) => {
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 }, "day", false, undefined, undefined, undefined, "summer");
    if (stance === "dropoff") {
      surface.dataset.stance = "dropoff";
      surface.dataset.angler = "15.4,7.8";
      surface.dataset.aim = "15.4,-5.4";
    }
    vi.mocked(waitMs).mockReturnValueOnce(2_000);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "salmon")!);
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 1);
    expect(phase()).toBe("fight:none");
    expect(hint()?.includes("It has found cool water down deep, so it keeps its strength.")).toBe(cooled);
    expect(hint()?.includes("The warm water leaves it short of air, so it tires sooner.")).toBe(!cooled);
  });

  it.each([
    ["fall", "salmon", true],
    ["fall", "brook-trout", true],
    ["summer", "salmon", false],
    ["fall", "pike", false],
  ] as const)("says a fish hooked in %s (%s) is on its fall run: %s", (season, id, run) => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, undefined, undefined, undefined, season);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === id)!);
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 1);
    expect(phase()).toBe("fight:none");
    expect(hint()?.includes("It's on its fall run and full of fight, so it tires slower.")).toBe(run);
  });

  it.each([
    ["spring", "largemouth-bass", true],
    ["summer", "largemouth-bass", false],
    ["spring", "pike", false],
  ] as const)("says a fish hooked at the dock in %s (%s) is guarding its nest: %s", (season, id, nest) => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, undefined, undefined, undefined, season);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === id)!);
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 1);
    expect(phase()).toBe("fight:none");
    expect(hint()?.includes("It's guarding its nest, so it fights harder and tires slower.")).toBe(nest);
  });

  it.each([
    ["night", "catfish", true],
    ["day", "catfish", false],
    ["night", "pike", false],
  ] as const)("says a fish hooked at %s (%s) is out hunting: %s", (hour, id, hunter) => {
    const surface = mount(DOCK_BUBBLES.at, profile, hour);
    vi.mocked(waitMs).mockReturnValueOnce(2_000);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === id)!);
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 1);
    expect(phase()).toBe("fight:none");
    expect(hint()?.includes("It's out hunting after dark and fights at full strength, so it tires slower.")).toBe(hunter);
  });

  it("tells only the first two reasons a hooked fish tires slower, so the hookset hint stays short", () => {
    const surface = mount(DOCK_BUBBLES.at, profile, "night", false, undefined, undefined, "rain", "winter");
    vi.mocked(waitMs).mockReturnValueOnce(2_000);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "burbot")!);
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 1);
    expect(phase()).toBe("fight:none");
    expect(TIRE_REASONS).toBe(2);
    expect(hint()).toMatch(/^It thrives in the cold, so it keeps its strength\. It's out hunting after dark and fights at full strength, so it tires slower\. /);
    expect(hint()).not.toContain("It hunts by smell in the murky rain water");
  });

  it("says a lost trophy-sized fish looked like a trophy", () => {
    const surface = mount();
    const message = () => container!.querySelector("[data-testid=broke]")?.textContent;
    const pike = FISH.find((fish) => fish.id === "pike")!;
    vi.mocked(castForGotAway).mockReturnValueOnce({ again: { spot: "dock", species: pike, weight: pike.maxWeight, casts: 1 }, next: null });
    step.mockReturnValueOnce("escaped");
    castAndFight(surface, 1);
    expect(message()).toMatch(/threw the hook\. It looked like a trophy\.$/);
  });

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

  it("spooks the bank after a lost fish, so the next cast there says the bite is slower", () => {
    const surface = mount();
    step.mockReturnValueOnce("snapped");
    castAndFight(surface, 1);
    expect(vi.mocked(castIntoSpooked)).toHaveBeenLastCalledWith(null, "dock");
    act(() => (container!.querySelector("button:not([data-thumb-strike]):not([data-steer])") as HTMLButtonElement).click());
    vi.mocked(castIntoSpooked).mockReturnValueOnce(true);
    cast(surface);
    expect(vi.mocked(castIntoSpooked)).toHaveBeenLastCalledWith("dock", "dock");
    act(() => vi.advanceTimersByTime(1400));
    expect(hint()).toMatch(/^The lost fish spooked this water, so the next bite is slower\. /);
  });

  it("lets the rain cover a lost fish's splash, so the bank isn't spooked", () => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, undefined, undefined, "rain");
    step.mockReturnValueOnce("snapped");
    castAndFight(surface, 1);
    act(() => (container!.querySelector("button:not([data-thumb-strike]):not([data-steer])") as HTMLButtonElement).click());
    vi.mocked(castIntoSpooked).mockReturnValueOnce(true);
    cast(surface);
    act(() => vi.advanceTimersByTime(1400));
    expect(hint()).toMatch(/^The rain on the water covered the lost fish's splash, so this water isn't spooked\. /);
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
    expect(hint()).toMatch(/too early|only a nibble|yanked/i);
    expect(phase()).toBe("waiting:none");
    act(() => window.dispatchEvent(pointer("pointerup", 2)));
    for (let waited = 0; phase() !== "hookset:none" && waited < 20_000; waited += 10) act(() => vi.advanceTimersByTime(10));
    expect(phase()).toBe("hookset:none");
    act(() => surface.dispatchEvent(pointer("pointerdown", 3)));
    expect(phase()).toBe("fight:none");
  });

  it("puts the bite off once when a strike at a nibble yanks the bait away", () => {
    const untilBite = (yanks: number) => {
      const surface = mount();
      vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "perch")!);
      cast(surface);
      let waited = 0;
      for (let yank = 0; yank < yanks; yank++) {
        for (; surface.dataset.nibble !== "1" && phase() === "waiting:none" && waited < 20_000; waited += 10) act(() => vi.advanceTimersByTime(10));
        if (phase() !== "waiting:none") break;
        act(() => surface.dispatchEvent(pointer("pointerdown", 2 + yank)));
        if (yank === 0) expect(hint()).toBe("You yanked the bait away from it, so the fish backed off. Let it settle and wait for the real dip.");
        else expect(hint()).toBe("That was only a nibble. Wait for the bobber to go under, then strike.");
        act(() => window.dispatchEvent(pointer("pointerup", 2 + yank)));
        for (; surface.dataset.nibble === "1" && waited < 20_000; waited += 10) act(() => vi.advanceTimersByTime(10));
      }
      for (; phase() !== "hookset:none" && waited < 20_000; waited += 10) act(() => vi.advanceTimersByTime(10));
      act(() => root!.unmount());
      root = null;
      container!.remove();
      return waited;
    };
    const sat = untilBite(0);
    expect(untilBite(1)).toBeGreaterThan(sat);
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

  it("says the hook went in light on a strike late in the window", () => {
    const surface = mount();
    cast(surface);
    act(() => vi.advanceTimersByTime(2_201));
    now += 1_100;
    act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
    expect(phase()).toBe("fight:none");
    expect(hint()).toMatch(/^Hooked light in 1\.10 s, it only just caught\. Keep it out of the red\. /);    expect(vi.mocked(makeFight).mock.calls.at(-1)![8]).toBe(false);
  });

  it("hooks deep, not light, on a late strike when live bait was swallowed", () => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Nightcrawler");
    cast(surface);
    act(() => vi.advanceTimersByTime(2_201));
    now += 1_100;
    act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
    expect(phase()).toBe("fight:none");
    expect(hint()).toMatch(/^It swallowed the bait: hooked deep in 1\.10 s\. .*Ease off when it runs\.$/);
    // A swallowed hook holds like a treble: it takes longer in the red to tear free.
    expect(vi.mocked(makeFight).mock.calls.at(-1)![8]).toBe(true);
  });

  it.each([
    ["Nightcrawler", true],
    ["Leech", true],
    ["Bobber rig", false],
    ["Inline spinner", false],
    [undefined, false],
  ] as const)("says whether %s is live bait", (lure, live) => {
    expect(isLiveBait(lure)).toBe(live);
  });

  it.each([
    ["Inline spinner", true],
    ["Kastmaster spoon", true],
    ["Shallow crankbait", true],
    ["Green pumpkin tube", false],
    ["Nightcrawler", false],
    [undefined, false],
  ] as const)("says whether %s hangs treble hooks", (lure, trebles) => {
    expect(hasTrebles(lure)).toBe(trebles);
  });

  it("tells the snag roll which lure was cast", () => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Topwater frog");
    cast(surface);
    expect(vi.mocked(castSnags).mock.lastCall?.[5]).toBe("Topwater frog");
  });

  it("holds the bite while the lure is snagged, and lets it come once tapped free", () => {
    vi.mocked(castSnags).mockReturnValueOnce("weed");
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

  it("names the rocks when the lure snags on the point", () => {
    vi.mocked(castSnags).mockReturnValueOnce("rocks");
    const surface = mount();
    cast(surface);
    act(() => vi.advanceTimersByTime(SNAG_AT_MS + 1));
    expect(hint()).toBe(`Snagged on the rocks. Tap ${SNAG_TAPS} times to work it free.`);
    for (let tap = 1; tap <= SNAG_TAPS; tap += 1) {
      act(() => surface.dispatchEvent(pointer("pointerdown", 30 + tap)));
      act(() => window.dispatchEvent(pointer("pointerup", 30 + tap)));
    }
    expect(hint()).toBe("Off the rocks. Let it settle.");
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
    expect(hint()).toMatch(/too early|only a nibble|yanked/i);
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
    expect(hint()).toMatch(/too early|only a nibble|yanked/i);
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

  it("lets a short cast in fog draw past the commons, since the shy fish come in close", () => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, undefined, undefined, "fog");
    lateRoll();
    castFor(surface, 300);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toBe("Short cast, but in the fog the shy fish come in close.");
    hookOnLateRoll(surface);
    expect(phase()).toBe("fight:none");
    expect(rarity()).toBe("uncommon");
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
    expect(hint()).toMatch(/too early|only a nibble|yanked/i);
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
    const nibbles = vi.mocked(fx.nibble).mock.calls.length;
    act(() => vi.advanceTimersByTime(SECOND_TAKE_MS * 0.5));
    expect(vi.mocked(fx.nibble).mock.calls.length).toBe(nibbles + 1);
    act(() => vi.advanceTimersByTime(SECOND_TAKE_MS * 0.5));
    expect(phase()).toBe("hookset:none");
    act(() => vi.advanceTimersByTime(1400));
    expect(phase()).toBe("result:miss");
    expect(container!.querySelector("[data-testid=missed]")?.textContent).toMatch(/^carp\|/);
    expect(container!.querySelector("[data-testid=miss-message]")?.textContent).toMatch(/^Too slow\. The fish dropped the bait after \d\.\d\d s\.$/);
  });

  it("lets a tiger muskie that missed follow the bait and hit once more, with no nibble", () => {
    const surface = mount();
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "tiger-muskie")!);
    cast(surface);
    for (let waited = 0; phase() !== "hookset:none" && waited < 20_000; waited += 10) act(() => vi.advanceTimersByTime(10));
    expect(phase()).toBe("hookset:none");
    for (let waited = 0; phase() === "hookset:none" && waited < 5_000; waited += 10) act(() => vi.advanceTimersByTime(10));
    expect(phase()).toBe("waiting:none");
    expect(hint()).toBe("It swirled away, but a muskie follows. Watch for it to hit again…");
    const nibbles = vi.mocked(fx.nibble).mock.calls.length;
    act(() => vi.advanceTimersByTime(FOLLOW_MS));
    expect(vi.mocked(fx.nibble).mock.calls.length).toBe(nibbles);
    expect(phase()).toBe("hookset:none");
    for (let waited = 0; phase() === "hookset:none" && waited < 5_000; waited += 10) act(() => vi.advanceTimersByTime(10));
    expect(phase()).toBe("result:miss");
    expect(container!.querySelector("[data-testid=missed]")?.textContent).toMatch(/^tiger-muskie\|/);
  });

  it.each([
    ["Woolly bugger", true],
    ["Nightcrawler", false],
  ] as const)("lets a pike that missed a %s chase it for one more hit: %s", (lure, chases) => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, lure);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "pike")!);
    cast(surface);
    for (let waited = 0; phase() !== "hookset:none" && waited < 20_000; waited += 10) act(() => vi.advanceTimersByTime(10));
    expect(phase()).toBe("hookset:none");
    for (let waited = 0; phase() === "hookset:none" && waited < 5_000; waited += 10) act(() => vi.advanceTimersByTime(10));
    if (!chases) {
      expect(phase()).toBe("result:miss");
      return;
    }
    expect(phase()).toBe("waiting:none");
    expect(hint()).toBe("It missed, but the streamer keeps it chasing. Watch for it to hit again…");
    act(() => vi.advanceTimersByTime(FOLLOW_MS));
    expect(phase()).toBe("hookset:none");
    for (let waited = 0; phase() === "hookset:none" && waited < 5_000; waited += 10) act(() => vi.advanceTimersByTime(10));
    expect(phase()).toBe("result:miss");
  });

  it("brings a fish up sooner when a sitting topwater lure is popped, for the first two pops", () => {
    const untilBite = (pops: number) => {
      const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Topwater frog");
      vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "largemouth-bass")!);
      cast(surface);
      act(() => vi.advanceTimersByTime(300));
      for (let pop = 0; pop < pops; pop++) {
        act(() => surface.dispatchEvent(pointer("pointerdown", 2 + pop)));
        expect(hint()).toBe(pop < TOPWATER_POPS ? "Pop! The lure spits and gurgles. Let it sit…" : "Let it sit between pops.");
        act(() => window.dispatchEvent(pointer("pointerup", 2 + pop)));
      }
      let waited = 300;
      for (; phase() !== "hookset:none" && waited < 20_000; waited += 10) act(() => vi.advanceTimersByTime(10));
      act(() => root!.unmount());
      root = null;
      container!.remove();
      return waited;
    };
    const sat = untilBite(0);
    const popped = untilBite(TOPWATER_POPS);
    expect(popped).toBeLessThan(sat * 0.6);
    // A third pop does nothing more.
    expect(untilBite(TOPWATER_POPS + 1)).toBe(popped);
  });

  it("brings a fish up sooner when a jig on the bottom is hopped, for the first two hops", () => {
    const untilBite = (hops: number) => {
      const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Green pumpkin tube");
      vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "largemouth-bass")!);
      cast(surface);
      act(() => vi.advanceTimersByTime(300));
      for (let hop = 0; hop < hops; hop++) {
        act(() => surface.dispatchEvent(pointer("pointerdown", 2 + hop)));
        expect(hint()).toBe(hop < TOPWATER_POPS ? "Hop! The jig lifts off the bottom and flutters down. Let it fall…" : "Let it fall between hops.");
        act(() => window.dispatchEvent(pointer("pointerup", 2 + hop)));
      }
      let waited = 300;
      for (; phase() !== "hookset:none" && waited < 20_000; waited += 10) act(() => vi.advanceTimersByTime(10));
      act(() => root!.unmount());
      root = null;
      container!.remove();
      return waited;
    };
    const sat = untilBite(0);
    const hopped = untilBite(TOPWATER_POPS);
    expect(hopped).toBeLessThan(sat * 0.6);
    expect(untilBite(TOPWATER_POPS + 1)).toBe(hopped);
  });

  it("brings a fish up sooner when a streamer is stripped, for the first two strips", () => {
    const untilBite = (strips: number) => {
      const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Woolly bugger");
      vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "rainbow-trout")!);
      cast(surface);
      act(() => vi.advanceTimersByTime(300));
      for (let strip = 0; strip < strips; strip++) {
        act(() => surface.dispatchEvent(pointer("pointerdown", 2 + strip)));
        expect(hint()).toBe(strip < TOPWATER_POPS ? "Strip! The streamer darts off like a fleeing fish. Let it hang…" : "Let it hang between strips.");
        act(() => window.dispatchEvent(pointer("pointerup", 2 + strip)));
      }
      let waited = 300;
      for (; phase() !== "hookset:none" && waited < 20_000; waited += 10) act(() => vi.advanceTimersByTime(10));
      act(() => root!.unmount());
      root = null;
      container!.remove();
      return waited;
    };
    const sat = untilBite(0);
    const stripped = untilBite(TOPWATER_POPS);
    expect(stripped).toBeLessThan(sat * 0.6);
    expect(untilBite(TOPWATER_POPS + 1)).toBe(stripped);
  });

  it("lets a level 13 angler lift a spoon a third time to bring the fish sooner", () => {
    const untilBite = (lifts: number, lifetimePoints: number) => {
      const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints }, "day", false, "Kastmaster spoon");
      vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "largemouth-bass")!);
      cast(surface);
      act(() => vi.advanceTimersByTime(300));
      for (let lift = 0; lift < lifts; lift++) {
        act(() => surface.dispatchEvent(pointer("pointerdown", 2 + lift)));
        act(() => window.dispatchEvent(pointer("pointerup", 2 + lift)));
      }
      const said = hint();
      let waited = 300;
      for (; phase() !== "hookset:none" && waited < 20_000; waited += 10) act(() => vi.advanceTimersByTime(10));
      act(() => root!.unmount());
      root = null;
      container!.remove();
      return { waited, said };
    };
    expect(untilBite(3, 17000).said).toBe("Let it fall between lifts.");
    expect(untilBite(3, 23000).said).toBe("Lift! The spoon flashes and flutters back down. Let it fall…");
    expect(untilBite(3, 23000).waited).toBeLessThan(untilBite(2, 23000).waited);
  });

  it("brings a fish up sooner when a spoon is lifted, for the first two lifts", () => {
    const untilBite = (hops: number) => {
      const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Kastmaster spoon");
      vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "largemouth-bass")!);
      cast(surface);
      act(() => vi.advanceTimersByTime(300));
      for (let hop = 0; hop < hops; hop++) {
        act(() => surface.dispatchEvent(pointer("pointerdown", 2 + hop)));
        expect(hint()).toBe(hop < TOPWATER_POPS ? "Lift! The spoon flashes and flutters back down. Let it fall…" : "Let it fall between lifts.");
        act(() => window.dispatchEvent(pointer("pointerup", 2 + hop)));
      }
      let waited = 300;
      for (; phase() !== "hookset:none" && waited < 20_000; waited += 10) act(() => vi.advanceTimersByTime(10));
      act(() => root!.unmount());
      root = null;
      container!.remove();
      return waited;
    };
    const sat = untilBite(0);
    const hopped = untilBite(TOPWATER_POPS);
    expect(hopped).toBeLessThan(sat * 0.6);
    expect(untilBite(TOPWATER_POPS + 1)).toBe(hopped);
  });

  it("leaves a sinking lure's early strike as too early", () => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Nightcrawler");
    cast(surface);
    act(() => vi.advanceTimersByTime(300));
    act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
    expect(hint()).toMatch(/too early|only a nibble|yanked/i);
  });

  it("lets a fish that missed a topwater lure come back up for it once", () => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Topwater frog");
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "largemouth-bass")!);
    cast(surface);
    for (let waited = 0; phase() !== "hookset:none" && waited < 20_000; waited += 10) act(() => vi.advanceTimersByTime(10));
    expect(phase()).toBe("hookset:none");
    for (let waited = 0; phase() === "hookset:none" && waited < 5_000; waited += 10) act(() => vi.advanceTimersByTime(10));
    expect(phase()).toBe("waiting:none");
    expect(hint()).toBe("It missed the topwater. Let it sit, it may come back…");
    act(() => vi.advanceTimersByTime(TOPWATER_COMEBACK_MS));
    expect(phase()).toBe("hookset:none");
    expect(hint()).toBe("It blew up on the topwater — strike!");
    for (let waited = 0; phase() === "hookset:none" && waited < 5_000; waited += 10) act(() => vi.advanceTimersByTime(10));
    expect(phase()).toBe("result:miss");
  });

  it("has a fish that missed a topwater lure leave when the odds say so", () => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Topwater frog");
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "largemouth-bass")!);
    cast(surface);
    for (let waited = 0; phase() !== "hookset:none" && waited < 20_000; waited += 10) act(() => vi.advanceTimersByTime(10));
    vi.mocked(Math.random).mockReturnValue(TOPWATER_COMEBACK_ODDS);
    for (let waited = 0; phase() === "hookset:none" && waited < 5_000; waited += 10) act(() => vi.advanceTimersByTime(10));
    expect(phase()).toBe("result:miss");
  });

  it("notes a bottom feeder hooked on its second take, and not the next fish hooked at once", () => {
    const surface = mount();
    const secondTake = () => container!.querySelector("[data-testid=second-take]")?.textContent;
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "carp")!);
    cast(surface);
    act(() => vi.advanceTimersByTime(2201));
    act(() => vi.advanceTimersByTime(1400));
    expect(phase()).toBe("waiting:none");
    act(() => vi.advanceTimersByTime(SECOND_TAKE_MS));
    expect(phase()).toBe("hookset:none");
    step.mockReturnValueOnce("landed");
    act(() => surface.dispatchEvent(pointer("pointerdown", 9)));
    act(() => frames.at(-1)!(now));
    expect(secondTake()).toBe("true");
    act(() => (container!.querySelector("button:not([data-thumb-strike]):not([data-steer])") as HTMLButtonElement).click());
    step.mockReturnValueOnce("landed");
    castAndFight(surface, 10);
    expect(secondTake()).toBe("false");
  });

  it("says a strike at a nibble was only a nibble, and a strike at a still float was too early", () => {
    const surface = mount();
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "carp")!);
    cast(surface);
    act(() => vi.advanceTimersByTime(2201));
    act(() => vi.advanceTimersByTime(1400));
    expect(phase()).toBe("waiting:none");
    for (let waited = 0; surface.dataset.nibble !== "1" && waited < SECOND_TAKE_MS; waited += 10) act(() => vi.advanceTimersByTime(10));
    expect(surface.dataset.nibble).toBe("1");
    act(() => surface.dispatchEvent(pointer("pointerdown", 7)));
    expect(hint()).toBe("That was only a nibble. Wait for the bobber to go under, then strike.");
    act(() => window.dispatchEvent(pointer("pointerup", 7)));
    act(() => vi.advanceTimersByTime(SECOND_TAKE_NIBBLE_MS));
    act(() => surface.dispatchEvent(pointer("pointerdown", 8)));
    expect(hint()).toBe("Too early. Wait for the bobber to go under, then strike.");
  });

  it("never lets a golden shiner strip a hard lure, which carries no bait", () => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Inline spinner");
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "golden-shiner")!);
    vi.mocked(stealsBait).mockReturnValueOnce(true);
    cast(surface);
    for (let waited = 0; phase() !== "hookset:none" && waited < 20_000; waited += 100) act(() => vi.advanceTimersByTime(100));
    expect(phase()).toBe("hookset:none");
  });

  it.each([
    [undefined, true],
    ["", true],
    ["Nightcrawler", true],
    ["Bobber rig", true],
    ["Lucky charm", true],
    ["Inline spinner", false],
    ["Topwater frog", false],
    ["Silver spoon", false],
  ] as const)("says whether %s carries bait", (lure, baited) => {
    expect(carriesBait(lure)).toBe(baited);
  });

  it("lets a golden shiner nibble the bait off the hook now and then", () => {
    const surface = mount();
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "golden-shiner")!);
    vi.mocked(stealsBait).mockReturnValueOnce(true);
    cast(surface);
    for (let waited = 0; phase() !== "result:miss" && waited < 20_000; waited += 100) act(() => vi.advanceTimersByTime(100));
    expect(phase()).toBe("result:miss");
    expect(container!.querySelector("[data-testid=miss-message]")?.textContent).toBe("Golden shiner nibbled the bait clean off the hook.");
    expect(hint()).toBe("Little fish steal bait. Cast again.");
  });

  it("calls a bluegill's pull after its pecks", () => {
    const surface = mount();
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "bluegill")!);
    cast(surface);
    for (let waited = 0; !phase()?.startsWith("hookset") && waited < 20_000; waited += 100) act(() => vi.advanceTimersByTime(100));
    expect(phase()).toBe("hookset:none");
    expect(hint()).toBe("The pecking turns into a pull — strike!");
  });

  it("calls a smallmouth running off with the bait", () => {
    const surface = mount();
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "smallmouth-bass")!);
    cast(surface);
    for (let waited = 0; !phase()?.startsWith("hookset") && waited < 20_000; waited += 100) act(() => vi.advanceTimersByTime(100));
    expect(phase()).toBe("hookset:none");
    expect(hint()).toBe("It's running off with it — strike!");
  });

  it("calls a perch gulping the bait and gives it longer before it lets go", () => {
    const surface = mount();
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "perch")!);
    cast(surface);
    for (let waited = 0; !phase()?.startsWith("hookset") && waited < 20_000; waited += 100) act(() => vi.advanceTimersByTime(100));
    expect(hint()).toBe("It's gulping it down — strike!");
    const strikeWindow = Number(container!.querySelector("[data-testid=strike-window]")?.textContent);
    for (let waited = 0; phase() !== "result:miss" && waited < 5_000; waited += 100) act(() => vi.advanceTimersByTime(100));
    const held = Number(container!.querySelector("[data-testid=miss-message]")?.textContent?.match(/(\d\.\d\d) s/)?.[1]);
    expect(held).toBeGreaterThan(1.5);
    // The strike cue runs for the perch's own, longer hold.
    expect(strikeWindow / 1000).toBeCloseTo(held, 2);
  });

  it("calls a trout snatching the bait and gives it less time before it lets go", () => {
    const surface = mount();
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "rainbow-trout")!);
    cast(surface);
    for (let waited = 0; !phase()?.startsWith("hookset") && waited < 20_000; waited += 100) act(() => vi.advanceTimersByTime(100));
    expect(hint()).toBe("It snatched it — strike fast!");
    for (let waited = 0; phase() !== "result:miss" && waited < 5_000; waited += 100) act(() => vi.advanceTimersByTime(100));
    const held = Number(container!.querySelector("[data-testid=miss-message]")?.textContent?.match(/(\d\.\d\d) s/)?.[1]);
    expect(held).toBeLessThan(1.2);
  });

  it("calls a salmon rolling on the bait", () => {
    const surface = mount();
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "salmon")!);
    cast(surface);
    for (let waited = 0; !phase()?.startsWith("hookset") && waited < 20_000; waited += 100) act(() => vi.advanceTimersByTime(100));
    expect(hint()).toBe("It rolled on the bait — strike!");
  });

  it("calls a crappie's lift bite", () => {
    const surface = mount();
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "crappie")!);
    cast(surface);
    for (let waited = 0; !phase()?.startsWith("hookset") && waited < 20_000; waited += 100) act(() => vi.advanceTimersByTime(100));
    expect(phase()).toBe("hookset:none");
    expect(hint()).toBe("The float lifts and lies flat — strike!");
    for (let waited = 0; phase() !== "result:miss" && waited < 5_000; waited += 100) act(() => vi.advanceTimersByTime(100));
    expect(phase()).toBe("result:miss");
    expect(hint()).toBe("Strike the moment the float lifts.");
  });

  it("calls a walleye's light take and gives it longer before it drops the bait", () => {
    const surface = mount();
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "carp")!);
    cast(surface);
    act(() => vi.advanceTimersByTime(2201));
    act(() => vi.advanceTimersByTime(1400));
    act(() => vi.advanceTimersByTime(SECOND_TAKE_MS));
    act(() => vi.advanceTimersByTime(1400));
    expect(phase()).toBe("result:miss");
    const usual = Number(container!.querySelector("[data-testid=miss-message]")?.textContent?.match(/(\d\.\d\d) s/)?.[1]);
    act(() => (container!.querySelector("button:not([data-thumb-strike]):not([data-steer])") as HTMLButtonElement).click());
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "walleye")!);
    cast(surface);
    act(() => vi.advanceTimersByTime(2201));
    expect(phase()).toBe("hookset:none");
    expect(hint()).toBe("A light take, the float just slides under — strike!");
    act(() => vi.advanceTimersByTime(1400));
    expect(phase()).toBe("hookset:none");
    act(() => vi.advanceTimersByTime(1000));
    expect(phase()).toBe("result:miss");
    const light = Number(container!.querySelector("[data-testid=miss-message]")?.textContent?.match(/(\d\.\d\d) s/)?.[1]);
    expect(light).toBeCloseTo(usual * LIGHT_HOLD, 1);
  });

  it("has every fish hit a topwater lure at the top, with no nibble first", () => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Topwater frog");
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "carp")!);
    cast(surface);
    const nibbles = vi.mocked(fx.nibble).mock.calls.length;
    for (let waited = 0; !phase()?.startsWith("hookset") && waited < 20_000; waited += 100) act(() => vi.advanceTimersByTime(100));
    expect(hint()).toBe("It blew up on the topwater — strike!");
    // A carp mouths a bait two to four times, but on a topwater lure it just hits.
    expect(vi.mocked(fx.nibble).mock.calls.length).toBe(nibbles);
  });

  it.each([
    ["calm", /^Glassy water, made for a topwater\. /],
    ["strong", /^The chop hides the topwater, so the bites come slow\. /],
  ] as const)("says how a %s day suits a topwater lure as it lands", (wind, said) => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Topwater frog", wind);
    cast(surface);
    act(() => vi.advanceTimersByTime(1400));
    expect(hint()).toMatch(said);
  });

  it.each([
    ["Inline spinner", "clear", "day", true],
    ["Silver spoon", "clear", "dusk", true],
    ["Inline spinner", "overcast", "day", false],
    ["Inline spinner", "clear", "night", false],
    ["Nightcrawler", "clear", "day", false],
  ] as const)("says the sun catches the flash of a %s under a %s sky by %s: %s", (lure, sky, hour, flash) => {
    const surface = mount(DOCK_BUBBLES.at, profile, hour, false, lure, undefined, sky);
    cast(surface);
    act(() => vi.advanceTimersByTime(1400));
    expect((hint() ?? "").startsWith("The sun catches the lure's flash. ")).toBe(flash);
  });

  it("says nothing of the wind for a lure that sinks", () => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Nightcrawler", "strong");
    cast(surface);
    act(() => vi.advanceTimersByTime(1400));
    expect(hint()).not.toMatch(/topwater/);
  });

  it("calls a predator's bite as a hit and a usual fish's as NOW", () => {
    const surface = mount();
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "pike")!);
    cast(surface);
    act(() => vi.advanceTimersByTime(2201));
    expect(hint()).toBe("WHAM — it hit! Strike!");
    act(() => vi.advanceTimersByTime(1400));
    act(() => (container!.querySelector("button:not([data-thumb-strike]):not([data-steer])") as HTMLButtonElement).click());
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "golden-shiner")!);
    cast(surface);
    act(() => vi.advanceTimersByTime(2201));
    expect(hint()).toBe("NOW — strike!");
  });

  it.each([
    ["Green pumpkin tube", "The jig hops down the ledge. "],
    ["Nightcrawler", null],
  ] as const)("says a %s hops down the drop-off's ledge: %s", (lure, said) => {
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 }, "day", false, lure);
    surface.dataset.stance = "dropoff";
    surface.dataset.angler = "15.4,7.8";
    surface.dataset.aim = "15.4,-5.4";
    cast(surface);
    expect(phase()).toBe("waiting:none");
    if (said) expect(hint()).toContain(said);
    else expect(hint()).not.toContain("jig");
  });

  it("says the rain washes food into the inlet when the cast's wait comes sooner for it", () => {
    vi.mocked(rainInletWaitMul).mockReturnValueOnce(RAIN_INLET_WAIT);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 });
    surface.dataset.stance = "dropoff";
    surface.dataset.angler = "15.4,7.8";
    surface.dataset.aim = "15.4,-5.4";
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toContain("The rain swells the inlet and washes food in, and the fish gather to feed.");
  });

  it.each([
    ["clear", true],
    ["fog", false],
  ] as const)("says the bright summer sun drives the fish under the dock (%s sky): %s", (sky, said) => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, undefined, undefined, sky, "summer");
    cast(surface);
    expect(phase()).toBe("waiting:none");
    if (said) expect(hint()).toContain("The bright summer sun drives the fish into the shade under the dock.");
    else expect(hint()).not.toContain("shade under the dock");
  });

  it("says the winter sun warms the reeds' shallows when the cast's wait comes sooner for it", () => {
    vi.mocked(winterSunWaitMul).mockReturnValueOnce(WINTER_SUN_WAIT);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 }, "day", false, undefined, undefined, "clear", "winter");
    surface.dataset.stance = "dropoff";
    surface.dataset.angler = "15.4,7.8";
    surface.dataset.aim = "15.4,-5.4";
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toContain("The winter sun warms the shallows by the reeds a little, and the cold fish drift in.");
  });

  it("says the wind drives the baitfish onto the point when the cast's wait comes sooner for it", () => {
    vi.mocked(windPointWaitMul).mockReturnValueOnce(WIND_POINT_WAIT);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 });
    surface.dataset.stance = "dropoff";
    surface.dataset.angler = "15.4,7.8";
    surface.dataset.aim = "15.4,-5.4";
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toContain("The wind drives the baitfish onto the point, and the hunters follow them in.");
  });

  it("says the dock lanterns draw minnows when the cast's wait comes sooner for them", () => {
    vi.mocked(lanternDockWaitMul).mockReturnValueOnce(LANTERN_DOCK_WAIT);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 });
    surface.dataset.stance = "dropoff";
    surface.dataset.angler = "15.4,7.8";
    surface.dataset.aim = "15.4,-5.4";
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toContain("The dock lanterns draw minnows into their light, and the fish follow them in.");
  });

  it("says the midday glare drives the fish from the open water when the cast's wait comes slower for it", () => {
    vi.mocked(openGlareWaitMul).mockReturnValueOnce(OPEN_GLARE_WAIT);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 });
    surface.dataset.stance = "dropoff";
    surface.dataset.angler = "15.4,7.8";
    surface.dataset.aim = "15.4,-5.4";
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toContain("The midday glare drives the fish from the open water, so the bites come slow.");
  });

  it("says there's no moon tonight when the cast's wait comes slower for it", () => {
    vi.mocked(darkNightWaitMul).mockReturnValueOnce(DARK_NIGHT_WAIT);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 });
    surface.dataset.stance = "dropoff";
    surface.dataset.angler = "15.4,7.8";
    surface.dataset.aim = "15.4,-5.4";
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toContain("There's no moon tonight and the fish can barely see to feed, so the bites come slow.");
  });

  it.each([
    ["Nightcrawler", true],
    ["Green pumpkin tube", false],
  ] as const)("says a %s sinks down beside the dock's pilings: %s", (lure, said) => {
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 }, "day", false, lure);
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()?.includes("The worm sinks down beside the pilings, where the fish hide.")).toBe(said);
  });

  it("says the spoon flutters through the open water when the cast's wait comes sooner for it", () => {
    vi.mocked(spoonOpenWaitMul).mockReturnValueOnce(SPOON_OPEN_WAIT);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 });
    surface.dataset.stance = "dropoff";
    surface.dataset.angler = "15.4,7.8";
    surface.dataset.aim = "15.4,-5.4";
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toContain("The spoon flutters down through the open water, where the hunters roam.");
  });

  it("says the spinner flickers along the reed edge when the cast's wait comes sooner for it", () => {
    vi.mocked(spinnerReedWaitMul).mockReturnValueOnce(SPINNER_REED_WAIT);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 });
    surface.dataset.stance = "dropoff";
    surface.dataset.angler = "15.4,7.8";
    surface.dataset.aim = "15.4,-5.4";
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toContain("The spinner's blade flickers along the reed edge, past the hunters lying in ambush.");
  });

  it("says the float holds the bait still at the reed edge when the cast's wait comes sooner for it", () => {
    vi.mocked(floatReedWaitMul).mockReturnValueOnce(FLOAT_REED_WAIT);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 });
    surface.dataset.stance = "dropoff";
    surface.dataset.angler = "15.4,7.8";
    surface.dataset.aim = "15.4,-5.4";
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toContain("The float holds the bait still at the reed edge, right over the panfish hiding in the stems.");
  });

  it("says the streamer darts up the ledge when the cast's wait comes sooner for it", () => {
    vi.mocked(streamerLedgeWaitMul).mockReturnValueOnce(STREAMER_LEDGE_WAIT);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 });
    surface.dataset.stance = "dropoff";
    surface.dataset.angler = "15.4,7.8";
    surface.dataset.aim = "15.4,-5.4";
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toContain("The streamer darts up the ledge like a fleeing baitfish, right past the trout holding deep.");
  });

  it("says the current tumbles the worm downstream when the cast's wait comes sooner for it", () => {
    vi.mocked(wormInletWaitMul).mockReturnValueOnce(WORM_INLET_WAIT);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 });
    surface.dataset.stance = "dropoff";
    surface.dataset.angler = "15.4,7.8";
    surface.dataset.aim = "15.4,-5.4";
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toContain("The current tumbles the worm downstream like food washed in from the stream.");
  });

  it("says the current spins the spinner's blade when the cast's wait comes sooner for it", () => {
    vi.mocked(spinnerInletWaitMul).mockReturnValueOnce(SPINNER_INLET_WAIT);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 });
    surface.dataset.stance = "dropoff";
    surface.dataset.angler = "15.4,7.8";
    surface.dataset.aim = "15.4,-5.4";
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toContain("The current spins the blade hard even on a slow retrieve, and the fish in the flow come to it.");
  });

  it("says the crankbait knocks off the pilings when the cast's wait comes sooner for it", () => {
    vi.mocked(crankPilingWaitMul).mockReturnValueOnce(CRANK_PILING_WAIT);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 });
    surface.dataset.stance = "dropoff";
    surface.dataset.angler = "15.4,7.8";
    surface.dataset.aim = "15.4,-5.4";
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toContain("The crankbait knocks off the pilings and darts aside, and the fish underneath strike at it.");
  });

  it("tells only the two latest reasons a bite comes sooner, so the hint stays short", () => {
    vi.mocked(springShallowsWaitMul).mockReturnValueOnce(SPRING_SHALLOWS_WAIT);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 }, "day", false, "Green pumpkin tube", undefined, undefined, "winter");
    surface.dataset.stance = "dropoff";
    surface.dataset.angler = "15.4,7.8";
    surface.dataset.aim = "15.4,-5.4";
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(WAIT_REASONS).toBe(2);
    expect(hint()).toMatch(/^The cold water slows the fish, but they still chase a slow jig\. The shallows by the reeds warm first in spring, and the fish crowd in\. /);
    expect(hint()).not.toContain("The jig hops down the ledge.");
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

describe("useFishingGame groundbait", () => {
  const groundbait = () => container!.querySelector("[data-testid=groundbait]")?.textContent;
  const toss = () => act(() => [...container!.querySelectorAll("button")].find((button) => button.textContent === "groundbait")!.click());

  it("tosses the one handful off the bank, and the next casts there are over it", () => {
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 });
    expect(groundbait()).toBe(`${GROUNDBAIT_HANDFULS}|`);
    toss();
    expect(groundbait()).toBe(`0|dock:${GROUNDBAIT_CASTS}`);
    expect(hint()).toContain("You toss a handful of groundbait.");
    surface.dataset.stance = "dropoff";
    surface.dataset.angler = "15.4,7.8";
    surface.dataset.aim = "15.4,-5.4";
    cast(surface);
    expect(phase()).toBe("waiting:none");
    // Cast from another bank: the groundbait at the dock keeps.
    expect(groundbait()).toBe(`0|dock:${GROUNDBAIT_CASTS}`);
    expect(hint()).not.toContain("Over the groundbait.");
  });

  it("says a cast over the groundbait is over it, counts it down, and leaves no second handful", () => {
    const surface = mount();
    toss();
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toContain("Over the groundbait.");
    expect(groundbait()).toBe(`0|dock:${GROUNDBAIT_CASTS - 1}`);
  });

  it("says a school landed over the groundbait stays to feed on it", () => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, undefined, undefined, undefined, "summer");
    toss();
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "perch")!);
    step.mockReturnValueOnce("landed");
    castAndFight(surface, 1);
    expect(phase()).toBe("result:landed");
    expect(container!.querySelector("[data-testid=landed-note]")?.textContent).toBe(
      "Yellow perch: there's a school here, feeding on the groundbait. It stays a while, so cast again quickly!",
    );
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
