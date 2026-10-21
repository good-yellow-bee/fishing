// @vitest-environment jsdom
import { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { canLand, localDate, DOCK_STAND_X, DOCK_STAND_Z, FISH, type Giant, type LodgeLost, SPOT_LABELS, type LakeHour, type LakeSeason, type Profile, type Sky, type Wind, type SpotId } from "@stillwater/shared";
import { floodedInlet, makeFight, springRunTireMul, SPRING_RUN_TIRE, currentTireMul, CURRENT_FIGHTER_TIRE, type FightOutcome, type FightPerformance, type FightSim } from "./fight";
import { FRENZY_SLOT_MS, HOTSPOT_PERIOD_MS, HOTSPOT_RADIUS, hotspotAt, slotFrenzy } from "./hotspot";
import { bedRaider, CHOPPED_WORMS, COLD_WORK_GAP_MS, LONG_CAST_SOLID, crayfishHunter, tadpoleEater, fryHunter, logHolder, bugSipper, lightHunter, midgeRiser, castIntoSpooked, isSkipCast, castOnFreshWater, TWIST_CASTS, twistAfterCast, WORM_SOAK_CASTS, WASHED_WAIT, soakAfterCast, PRESSURE_CASTS, GROUNDBAIT_CASTS, OVERFED_CASTS, SPOOKED_SWIM_CASTS, TOPUP_MAX, groundbaitFeeder, GROUNDBAIT_HANDFULS, pickBite, RAIN_INLET_WAIT, rainInletWaitMul, SPRING_SHALLOWS_WAIT, springShallowsWaitMul, waitMs, SPINNER_REED_WAIT, spinnerReedWaitMul, FLOAT_REED_WAIT, floatReedWaitMul, STREAMER_LEDGE_WAIT, streamerLedgeWaitMul, WORM_INLET_WAIT, wormInletWaitMul, SPINNER_INLET_WAIT, spinnerInletWaitMul, CRANK_PILING_WAIT, crankPilingWaitMul, SPOON_OPEN_WAIT, spoonOpenWaitMul, DARK_NIGHT_WAIT, darkNightWaitMul, OPEN_GLARE_WAIT, openGlareWaitMul, LONG_SHADOW_WAIT, longShadowWaitMul, WIND_POINT_WAIT, windPointWaitMul, LANTERN_DOCK_WAIT, lanternDockWaitMul, WINTER_SUN_WAIT, winterSunWaitMul, WARMING_WAIT, COOLING_WAIT, waterSwingWaitMul, anchorSplashWaitMul, ANCHOR_SPLASH_WAIT, LAMP_WINDOW } from "./logic";
import { LIGHT_HOLD, stealsBait } from "./nibblePlan";
import { castForReleased } from "./releasedFish";

const step = vi.fn<() => FightOutcome>(() => {
  throw new Error("simulated fight failure");
});
let fightPerformance: FightPerformance = { peakTension: 0.2, maxLine: 1 };
let fightLine = 1;

vi.mock("./fx", () => ({
  fx: { cast: vi.fn(), splash: vi.fn(), bite: vi.fn(), nibble: vi.fn(), plop: vi.fn(), rodBell: vi.fn(), snap: vi.fn(), land: vi.fn(), surge: vi.fn(), reel: vi.fn(), lift: vi.fn(), scrape: vi.fn(), haptic: vi.fn(), drag: { set: vi.fn(), stop: vi.fn() } },
}));
// The tests time bites to the usual wait; the day's hot bank is kept off the dock.
vi.mock("@stillwater/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stillwater/shared")>();
  return { ...actual, hotBankForDay: () => "inlet" };
});
vi.mock("./eveningRise", () => ({ isRiseCast: () => true }));
// A cloud over the sun comes and goes with the clock; each test that wants one says so.
vi.mock("./sunCover", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./sunCover")>();
  return { ...actual, cloudShadeWaitMul: vi.fn(() => 1) };
});
vi.mock("./solunar", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./solunar")>();
  return { ...actual, moonPassing: vi.fn(() => null) };
});
vi.mock("./foamFeed", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./foamFeed")>();
  return { ...actual, onFoamLane: vi.fn(() => false) };
});
vi.mock("./sunfishBeds", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./sunfishBeds")>();
  return { ...actual, onSunfishBed: vi.fn(() => false) };
});
vi.mock("./duckweedCast", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./duckweedCast")>();
  return { ...actual, inDuckweed: vi.fn(() => false) };
});
vi.mock("./crayfishJig", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./crayfishJig")>();
  return { ...actual, onCrayfishBed: vi.fn(() => false) };
});
vi.mock("./midgeClouds", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./midgeClouds")>();
  return { ...actual, underMidges: vi.fn(() => false) };
});
vi.mock("./lanternMinnows", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./lanternMinnows")>();
  return { ...actual, amongLanternMinnows: vi.fn(() => false) };
});
vi.mock("./surfaceBugs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./surfaceBugs")>();
  return { ...actual, amongSurfaceBugs: vi.fn(() => false) };
});
vi.mock("./sunkenLog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./sunkenLog")>();
  return { ...actual, tightToLog: vi.fn(() => false) };
});
vi.mock("./kingfisherFry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./kingfisherFry")>();
  return { ...actual, overKingfisherFry: vi.fn(() => false) };
});
vi.mock("./tadpoleShallows", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./tadpoleShallows")>();
  return { ...actual, amongTadpoles: vi.fn(() => false) };
});
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
  return { ...actual, grabberFor: vi.fn(() => null), followerFor: vi.fn(() => null), flutterGrabberFor: vi.fn(() => null), flutterTip: vi.fn(() => "") };
});
// A fish let go on an earlier day comes back only when a test says so.
vi.mock("./releasedFish", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./releasedFish")>();
  return { ...actual, castForReleased: vi.fn(() => ({ fish: null, next: [] })) };
});
// The fish that got away comes back only when a test says so.
vi.mock("./gotAway", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./gotAway")>();
  return { ...actual, castForGotAway: vi.fn(() => ({ again: null, next: null })) };
});
vi.mock("./logic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./logic")>();
  // Spooked water is tested on its own; elsewhere a lost fish leaves the next wait as it was.
  // Feeders over the groundbait and fresh water are tested on their own; elsewhere they leave the drawn fish and the wait as they were.
  // Skip casts off the dock are tested on their own; elsewhere a cast in the band's low end lands as it always did.
  // The day's water warming or cooling is tested on its own; elsewhere the water holds steady whatever the test's date.
  return { ...actual, isSkipCast: vi.fn(() => false), pickBite: vi.fn(actual.pickBite), groundbaitFeeder: vi.fn(() => null), bedRaider: vi.fn(() => null), crayfishHunter: vi.fn(() => null), tadpoleEater: vi.fn(() => null), fryHunter: vi.fn(() => null), logHolder: vi.fn(() => null), bugSipper: vi.fn(() => null), lightHunter: vi.fn(() => null), midgeRiser: vi.fn(() => null), castOnFreshWater: vi.fn((fished: ReadonlySet<string>) => ({ fresh: false, next: fished })), twistAfterCast: vi.fn(actual.twistAfterCast), soakAfterCast: vi.fn(actual.soakAfterCast), castIntoSpooked: vi.fn(() => false), springShallowsWaitMul: vi.fn(actual.springShallowsWaitMul), rainInletWaitMul: vi.fn(actual.rainInletWaitMul), winterSunWaitMul: vi.fn(actual.winterSunWaitMul), windPointWaitMul: vi.fn(actual.windPointWaitMul), lanternDockWaitMul: vi.fn(actual.lanternDockWaitMul), openGlareWaitMul: vi.fn(actual.openGlareWaitMul), anchorSplashWaitMul: vi.fn(actual.anchorSplashWaitMul), longShadowWaitMul: vi.fn(actual.longShadowWaitMul), darkNightWaitMul: vi.fn(actual.darkNightWaitMul), spoonOpenWaitMul: vi.fn(actual.spoonOpenWaitMul), spinnerReedWaitMul: vi.fn(actual.spinnerReedWaitMul), floatReedWaitMul: vi.fn(actual.floatReedWaitMul), streamerLedgeWaitMul: vi.fn(actual.streamerLedgeWaitMul), wormInletWaitMul: vi.fn(actual.wormInletWaitMul), spinnerInletWaitMul: vi.fn(actual.spinnerInletWaitMul), crankPilingWaitMul: vi.fn(actual.crankPilingWaitMul), waitMs: vi.fn(actual.waitMs), waterSwingWaitMul: vi.fn(() => 1) };
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
import { giantShyKey } from "./giantShy";
import { NIGHT_LINE_STALE_MS, nightLineKey, nightLineReadyAt, nightLineState } from "./nightLine";
import { WORM_TIN_WET, wormsDug, wormTinKey } from "./wormTin";
import { BUCKET_COLD_LIFE_MS, BUCKET_HOT_LIFE_MS, BUCKET_LIFE_MS, baitBucketKey } from "./baitBucket";
import { TRAP_COLD_SOAK_MS, TRAP_SOAK_MS, TRAP_STALE_MS, trapKey, trapState } from "./minnowTrap";
import { bagKey, shinerKey } from "./groundbaitBag";
import { PREBAIT_DAYS, prebaitKey } from "./prebait";
import { oldFoeKey } from "./oldFoe";
import { BREAD_SWIM_CASTS, SWIM_COLD_GONE_MS, SWIM_COLD_PRIMED_MS, SWIM_HOT_GONE_MS, SWIM_HOT_PRIMED_MS, SWIM_PRIMED_MS, swimKey } from "./swim";
import { carriesBait, FALSE_STRIKE_MS, FIGURE_EIGHT_ODDS, FIGURE_TURN_MS, FIGURE_WINDOW_MS, FOLLOW_MS, hasTrebles, isLiveBait, RECAST_GUARD_MS, SECOND_TAKE_MS, SECOND_TAKE_NIBBLE_MS, TOPWATER_COMEBACK_MS, TOPWATER_COMEBACK_ODDS, TIRE_REASONS, TOPWATER_POPS, useFishingGame, WAIT_REASONS } from "./useFishingGame";
import { fx } from "./fx";
import { castSnags, SNAG_AT_MS, SNAG_TAPS } from "./snag";
import { CLOUD_SHADE_WAIT, cloudShadeWaitMul } from "./sunCover";
import { moonPassing } from "./solunar";
import { onFoamLane } from "./foamFeed";
import { onSunfishBed } from "./sunfishBeds";
import { inDuckweed } from "./duckweedCast";
import { onCrayfishBed } from "./crayfishJig";
import { amongTadpoles } from "./tadpoleShallows";
import { overKingfisherFry } from "./kingfisherFry";
import { tightToLog } from "./sunkenLog";
import { amongSurfaceBugs } from "./surfaceBugs";
import { amongLanternMinnows } from "./lanternMinnows";
import { underMidges } from "./midgeClouds";
import { flutterGrabberFor, flutterTip, followerFor, grabberFor } from "./grab";
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

/** The solved legend hunt the harness hands the hook, if a test sets one. */
const harnessLegend: { current: { legendId: string; spot: SpotId } | null } = { current: null };
const harnessGiants: { current: Giant[] } = { current: [] };
const harnessLost: { current: LodgeLost[] } = { current: [] };

function Harness({ current = profile, hour = "day", rising = false, lure, wind, sky, season }: { current?: Profile; hour?: LakeHour; rising?: boolean; lure?: string; wind?: Wind; sky?: Sky; season?: LakeSeason }) {
  // A stable ref, as Dock's tied lure is, so a re-render with another lure reaches callbacks made earlier.
  const lureRef = useRef(lure ?? "");
  lureRef.current = lure ?? "";
  const game = useFishingGame(current, hour, lure === undefined ? undefined : lureRef, sky, false, season, undefined, rising, wind, undefined, harnessLegend.current, undefined, undefined, undefined, harnessGiants.current, harnessLost.current);
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
      <button type="button" onClick={game.throwChoppedWorm}>chopped worm</button>
      <button type="button" onClick={game.retie}>retie</button>
      <button type="button" onClick={game.toggleLamp}>lamp</button>
      <button type="button" onClick={game.baitShiner}>bait shiner</button>
      <button type="button" onClick={game.addShiner}>buy shiner</button>
      <button type="button" onClick={game.addWorm}>buy worm</button>
      <button type="button" onClick={game.setNightLine}>set night line</button>
      <button type="button" onClick={game.hookFromBucket}>hook from bucket</button>
      <button type="button" onClick={game.setTrap}>set trap</button>
      <button type="button" onClick={game.liftTrap}>lift trap</button>
      <i data-testid="bucket">{game.bucket}</i>
      <i data-testid="trap">{game.trap ? trapState(game.trap, Date.now()) : "none"}</i>
      <button type="button" onClick={game.checkNightLine}>check night line</button>
      <i data-testid="caught-hour">{game.outcome?.kind === "landed" ? (game.outcome.hour ?? "") : ""}</i>
      <i data-testid="lost-from">{game.outcome?.kind === "landed" ? (game.outcome.lostFrom?.by ?? "") : ""}</i>
      <i data-testid="lost-report">{game.lostReport ? `${game.lostReport.speciesId}|${game.lostReport.weight}|${game.lostReport.spot}|${game.lostReport.id}` : ""}</i>
      <i data-testid="night-line">{game.nightLine ? game.nightLine.spot : ""}</i>
      <i data-testid="line-state">{game.nightLine ? nightLineState(game.nightLine, Date.now()) : "none"}</i>
      <i data-testid="live-shiner">{String(game.liveShiner)}</i>
      <i data-testid="frayed">{String(game.frayed)}</i>
      <i data-testid="twisted">{String(game.twisted)}</i>
      <i data-testid="dulled">{String(game.dulled)}</i>
      <i data-testid="washed">{String(game.washed)}</i>
      <i data-testid="worms">{game.worms}</i>
      <i data-testid="fished-hard">{game.fishedHard.join(",")}</i>
      <i data-testid="groundbait">{game.handfuls}|{game.groundbait ? `${game.groundbait.spot}:${game.groundbait.casts}` : ""}</i>
      <p data-testid="hint">{game.hint}</p>
      <p data-testid="more-reasons">{game.moreReasons.join(" | ")}</p>
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

describe("useFishingGame live shiner", () => {
  const liveShiner = () => container!.querySelector("[data-testid=live-shiner]")?.textContent;
  const baitShiner = () => act(() => ([...container!.querySelectorAll("button")].find((button) => button.textContent === "bait shiner") as HTMLButtonElement).click());
  const shiner = FISH.find((fish) => fish.id === "golden-shiner")!;

  it("hooks a landed shiner on as bait, and the next cast draws the bank's hunter to it once", () => {
    const surface = mount();
    // A fight that went into the red leaves the shiner worn, not lively.
    fightPerformance = { peakTension: 0.9, maxLine: 1 };
    vi.mocked(pickBite).mockReturnValueOnce(shiner);
    step.mockReturnValueOnce("landed");
    castAndFight(surface, 1);
    expect(phase()).toBe("result:landed");
    baitShiner();
    expect(phase()).toBe("idle:none");
    expect(liveShiner()).toBe("true");
    expect(hint()).toBe("You hook the shiner on as live bait. Cast it out to the hunters.");
    cast(surface);
    expect(liveShiner()).toBe("false");
    expect(hint()).toMatch(/^The live shiner swims down off the hook, and the hunters here come to it\./);
    // The dock's hunter is the smallmouth bass.
    expect(container!.querySelector("[data-testid=bite]")?.textContent).toMatch(/^smallmouth-bass\|/);
    act(() => vi.advanceTimersByTime(2_201));
    act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
    expect(hint()).toMatch(/^It took the live shiner! /);
  });

  it("leaves a bought shiner out on a night line, and a later visit brings in a night feeder of the bank, landed but not clean", () => {
    const strong = { ...profile, strength: 10, accuracy: 10 };
    mount(DOCK_BUBBLES.at, strong);
    const press = (name: string) => act(() => ([...container!.querySelectorAll("button")].find((button) => button.textContent === name) as HTMLButtonElement).click());
    const line = () => container!.querySelector("[data-testid=night-line]")?.textContent;
    try {
      // A frame reads where the angler stands.
      act(() => frames.at(-1)!(now));
      press("buy shiner");
      press("set night line");
      expect(line()).toBe("dock");
      expect(liveShiner()).toBe("false");
      expect(hint()).toMatch(/^You leave the shiner out on a night line here\. Come back to check it once the night is out, and within two days\./);
      // Before the night is out, the line stays out.
      vi.setSystemTime(nightLineReadyAt(DOCK_BUBBLES.at) - 60_000);
      press("check night line");
      expect(line()).toBe("dock");
      vi.setSystemTime(nightLineReadyAt(DOCK_BUBBLES.at) + 60_000);
      press("check night line");
      expect(line()).toBe("");
      expect(phase()).toBe("result:landed");
      expect(container!.querySelector("[data-testid=clean]")?.textContent).toBe("false");
      expect(container!.querySelector("[data-testid=caught-hour]")?.textContent).toBe("night");
      expect(container!.querySelector("[data-testid=landed-note]")?.textContent).toMatch(/^(Common carp|Channel catfish) took the shiner on your night line\.$/);
    } finally {
      try {
        localStorage.removeItem(nightLineKey(strong.userId));
      } catch {
        // No store in this run, so nothing was kept.
      }
    }
  });

  it.each([
    ["summer", "Check it once the night is out, and before that evening: in the summer heat crayfish strip the bait fast."],
    ["winter", "In the winter cold the fish are slow: check it once the night is out and it has soaked twelve hours, and within four days."],
  ] as const)("keeps the season a night line goes out in and says its timing: %s", (season, said) => {
    const strong = { ...profile, strength: 10, accuracy: 10 };
    const kept = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    mount(DOCK_BUBBLES.at, strong, "day", false, undefined, undefined, undefined, season);
    act(() => frames.at(-1)!(now));
    const press = (name: string) => act(() => ([...container!.querySelectorAll("button")].find((button) => button.textContent === name) as HTMLButtonElement).click());
    press("buy shiner");
    press("set night line");
    expect(hint()).toMatch(new RegExp(`^You leave the shiner out on a night line here\\. ${said.replace(/\./g, "\\.")}`));
    expect(JSON.parse(kept.get(nightLineKey(strong.userId))!).season).toBe(season);
  });

  it("shows the night line turn ready, then stale, while the angler waits on the bank", () => {
    // Set in the small hours, off the lake's three-minute marks, so nothing else re-renders at its turns.
    const setAt = new Date(2026, 9, 21, 1, 0, 7).getTime();
    const kept = new Map([[nightLineKey(profile.userId), JSON.stringify({ spot: "dock", setAt })]]);
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    mount(setAt);
    const state = () => container!.querySelector("[data-testid=line-state]")?.textContent;
    expect(state()).toBe("soaking");
    act(() => vi.advanceTimersByTime(nightLineReadyAt(setAt) - setAt - 1));
    expect(state()).toBe("soaking");
    act(() => vi.advanceTimersByTime(1));
    expect(state()).toBe("ready");
    act(() => vi.advanceTimersByTime(setAt + NIGHT_LINE_STALE_MS - nightLineReadyAt(setAt)));
    expect(state()).toBe("ready");
    act(() => vi.advanceTimersByTime(1));
    expect(state()).toBe("stale");
  });

  it("leaves a worm from the tin out on a night line when there is no shiner to spare", () => {
    const kept = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    const strong = { ...profile, strength: 10, accuracy: 10 };
    mount(DOCK_BUBBLES.at, strong, "dusk", false, "Nightcrawler");
    const press = (name: string) => act(() => ([...container!.querySelectorAll("button")].find((button) => button.textContent === name) as HTMLButtonElement).click());
    act(() => frames.at(-1)!(now));
    press("set night line");
    expect(container!.querySelector("[data-testid=night-line]")?.textContent).toBe("dock");
    const left = wormsDug(new Date(DOCK_BUBBLES.at)) - 1;
    expect(hint()).toMatch(new RegExp(`^You leave a worm out on a night line here\\..* Worms left in your tin: ${left}\\.$`));
    expect(container!.querySelector("[data-testid=worms]")?.textContent).toBe(String(left));
  });

  it("sets no worm night line with the worm tin empty", () => {
    const kept = new Map<string, string>([[wormTinKey("test"), JSON.stringify({ worms: 0, day: localDate(new Date(DOCK_BUBBLES.at)) })]]);
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    mount(DOCK_BUBBLES.at, { ...profile, strength: 10, accuracy: 10 }, "dusk", false, "Nightcrawler");
    act(() => frames.at(-1)!(now));
    act(() => ([...container!.querySelectorAll("button")].find((button) => button.textContent === "set night line") as HTMLButtonElement).click());
    expect(container!.querySelector("[data-testid=night-line]")?.textContent).toBe("");
  });

  it("baits the shiner trap with a handful, and lifted later its shiners go in the bucket", () => {
    const kept = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    mount();
    const press = (name: string) => act(() => ([...container!.querySelectorAll("button")].find((button) => button.textContent === name) as HTMLButtonElement).click());
    const bag = () => container!.querySelector("[data-testid=groundbait]")?.textContent?.split("|")[0];
    const before = Number(bag());
    press("set trap");
    expect(Number(bag())).toBe(before - 1);
    expect(hint()).toMatch(/^You bait the shiner trap/);
    // Too soon, it stays down.
    press("lift trap");
    expect(container!.querySelector("[data-testid=bucket]")?.textContent).toBe("0");
    vi.setSystemTime(DOCK_BUBBLES.at + TRAP_SOAK_MS);
    press("lift trap");
    // Math.random is pinned to 0 here, so the trap holds one.
    expect(container!.querySelector("[data-testid=bucket]")?.textContent).toBe("1");
    expect(hint()).toBe("Shiners in the trap: 1, all into your bait bucket.");
  });

  it("shows the trap turn ready, then stale, while the angler waits at the shack", () => {
    const kept = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    mount();
    const trap = () => container!.querySelector("[data-testid=trap]")?.textContent;
    act(() => ([...container!.querySelectorAll("button")].find((button) => button.textContent === "set trap") as HTMLButtonElement).click());
    expect(trap()).toBe("soaking");
    act(() => vi.advanceTimersByTime(TRAP_SOAK_MS - 1));
    expect(trap()).toBe("soaking");
    act(() => vi.advanceTimersByTime(1));
    expect(trap()).toBe("ready");
    act(() => vi.advanceTimersByTime(TRAP_STALE_MS - TRAP_SOAK_MS + 1));
    expect(trap()).toBe("stale");
  });

  it("baits the shiner trap in winter's cold water: it soaks twelve hours, and the hint says so", () => {
    const kept = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    mount(DOCK_BUBBLES.at, profile, "day", false, undefined, undefined, undefined, "winter");
    const press = (name: string) => act(() => ([...container!.querySelectorAll("button")].find((button) => button.textContent === name) as HTMLButtonElement).click());
    press("set trap");
    expect(hint()).toMatch(/The water is cold and the shiners slow: lift it after twelve hours/);
    expect(JSON.parse(kept.get(trapKey(profile.userId))!)).toEqual({ setAt: DOCK_BUBBLES.at, cold: true });
    vi.setSystemTime(DOCK_BUBBLES.at + TRAP_SOAK_MS);
    press("lift trap");
    expect(container!.querySelector("[data-testid=bucket]")?.textContent).toBe("0");
    vi.setSystemTime(DOCK_BUBBLES.at + TRAP_COLD_SOAK_MS);
    press("lift trap");
    expect(container!.querySelector("[data-testid=bucket]")?.textContent).toBe("1");
  });

  it("lets a spare shiner die after three days in the bucket, and says so on the next visit", () => {
    const kept = new Map<string, string>([[baitBucketKey(profile.userId), JSON.stringify([DOCK_BUBBLES.at - BUCKET_LIFE_MS - 1, DOCK_BUBBLES.at - 1000])]]);
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    mount();
    expect(container!.querySelector("[data-testid=bucket]")?.textContent).toBe("1");
    expect(hint()).toBe("1 of the shiners in your bait bucket died while you were away: they keep three days.");
    expect(JSON.parse(kept.get(baitBucketKey(profile.userId))!)).toHaveLength(1);
  });

  it.each([
    ["summer", BUCKET_HOT_LIFE_MS, "1 of the shiners in your bait bucket died while you were away: in the summer heat they keep two days."],
    ["winter", BUCKET_COLD_LIFE_MS, "1 of the shiners in your bait bucket died while you were away: in the cold winter water they keep five days."],
  ] as const)("lets a spare shiner die sooner or later with the season: %s", (season, life, said) => {
    const kept = new Map<string, string>([[baitBucketKey(profile.userId), JSON.stringify([DOCK_BUBBLES.at - life - 1, DOCK_BUBBLES.at - BUCKET_LIFE_MS - 1])]]);
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    mount(DOCK_BUBBLES.at, profile, "day", false, undefined, undefined, undefined, season);
    expect(container!.querySelector("[data-testid=bucket]")?.textContent).toBe(season === "winter" ? "1" : "0");
    expect(hint()).toBe(season === "winter" ? said : said.replace("1 of", "2 of"));
    if (season === "winter") {
      // Through the visit too: the four-day-old spare is still alive to hook in winter.
      act(() => ([...container!.querySelectorAll("button")].find((button) => button.textContent === "hook from bucket") as HTMLButtonElement).click());
      expect(container!.querySelector("[data-testid=bucket]")?.textContent).toBe("0");
      expect(hint()).toBe("You hook a shiner from your bucket on as live bait. Cast it out to the hunters.");
    }
  });

  it("keeps spare shiners in a bait bucket: a night line takes one from it first, and one can be hooked from it later", () => {
    const strong = { ...profile, strength: 10, accuracy: 10 };
    mount(DOCK_BUBBLES.at, strong);
    const press = (name: string) => act(() => ([...container!.querySelectorAll("button")].find((button) => button.textContent === name) as HTMLButtonElement).click());
    const bucket = () => container!.querySelector("[data-testid=bucket]")?.textContent;
    try {
      act(() => frames.at(-1)!(now));
      press("buy shiner");
      press("buy shiner");
      expect(liveShiner()).toBe("true");
      expect(bucket()).toBe("1");
      expect(hint()).toBe("The shiner goes in your bait bucket: 1 of 3.");
      press("buy shiner");
      press("buy shiner");
      press("buy shiner");
      expect(bucket()).toBe("3");
      press("set night line");
      expect(bucket()).toBe("2");
      expect(liveShiner()).toBe("true");
      // Nothing to hook while one is on.
      press("hook from bucket");
      expect(bucket()).toBe("2");
    } finally {
      for (const key of [baitBucketKey(strong.userId), nightLineKey(strong.userId)]) {
        try {
          localStorage.removeItem(key);
        } catch {
          // No store in this run, so nothing was kept.
        }
      }
    }
  });

  it("sends a shiner landed clean out lively, drawing more of the hunters", () => {
    const surface = mount();
    vi.mocked(pickBite).mockReturnValueOnce(shiner);
    step.mockReturnValueOnce("landed");
    castAndFight(surface, 1);
    expect(container!.querySelector("[data-testid=clean]")?.textContent).toBe("true");
    baitShiner();
    expect(hint()).toBe("You hook the lively shiner on as live bait: landed clean, it swims hard and draws more of the hunters. Cast it out.");
    const random = vi.spyOn(Math, "random").mockReturnValue(0.7);
    cast(surface);
    expect(hint()).toMatch(/^The lively shiner swims hard on the hook, and more of the hunters here come to it\./);
    // A roll of 0.7 misses a plain live shiner's 60% but lands in a lively one's 80%.
    expect(container!.querySelector("[data-testid=bite]")?.textContent).toMatch(/^smallmouth-bass\|/);
    random.mockRestore();
  });

  it("keeps a shiner on the hook across a reload, sends it out on the next cast, and hooks on a bought one", () => {
    // CI's Node has no localStorage of its own, so the test brings one.
    const kept = new Map<string, string>([["stillwater.shiner.v1", "live"]]);
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    const surface = mount();
    expect(liveShiner()).toBe("true");
    cast(surface);
    expect(liveShiner()).toBe("false");
    expect(hint()).toMatch(/^The live shiner swims down off the hook/);
    // The browser-wide shiner from before anglers had their own hook went to this angler, and out on the cast.
    expect(kept.has("stillwater.shiner.v1")).toBe(false);
    expect(kept.has(shinerKey(profile.userId))).toBe(false);
    act(() => vi.advanceTimersByTime(60_000));
    const buy = () => act(() => ([...container!.querySelectorAll("button")].find((button) => button.textContent === "buy shiner") as HTMLButtonElement).click());
    buy();
    expect(liveShiner()).toBe("true");
    expect(kept.get(shinerKey(profile.userId))).toBe("live");
  });

  it("keeps each angler's own shiner on the hook and handfuls in the bag", () => {
    const kept = new Map<string, string>([[shinerKey(profile.userId), "lively"], [bagKey(profile.userId), JSON.stringify({ handfuls: 3, day: "2000-01-01" })]]);
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    mount();
    const bag = () => container!.querySelector("[data-testid=groundbait]")?.textContent?.split("|")[0];
    expect(liveShiner()).toBe("true");
    expect(bag()).toBe("3");
    act(() => root!.render(<Harness current={{ ...profile, userId: "other" }} />));
    expect(liveShiner()).toBe("false");
    expect(bag()).toBe(String(GROUNDBAIT_HANDFULS));
    act(() => root!.render(<Harness />));
    expect(liveShiner()).toBe("true");
    expect(bag()).toBe("3");
  });

  it.each([
    ["summer", SWIM_HOT_PRIMED_MS, SWIM_HOT_GONE_MS, "You toss a handful of groundbait. The fish will gather to feed here for the next 5 casts. Top it up as it fades, with 2 casts or fewer left, and more feeders come in. In the summer heat, any left draws them back after three hours but is eaten within a day."],
    ["winter", SWIM_COLD_PRIMED_MS, SWIM_COLD_GONE_MS, "You toss a handful of groundbait. The fish will gather to feed here for the next 5 casts. Top it up as it fades, with 2 casts or fewer left, and more feeders come in. In the winter cold, any left takes twelve hours to draw them back but keeps four days."],
  ] as const)("times a swim left behind by the season: %s", (season, primed, gone, said) => {
    const kept = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    const visit = (age: number) => {
      kept.set(swimKey(profile.userId), JSON.stringify({ spot: "dock", casts: 1, at: DOCK_BUBBLES.at - age }));
      if (root) act(() => root!.unmount());
      container?.remove();
      mount(DOCK_BUBBLES.at, profile, "day", false, undefined, undefined, undefined, season);
      return container!.querySelector("[data-testid=groundbait]")?.textContent?.split("|")[1];
    };
    expect(visit(primed - 60_000)).toBe("dock:1");
    expect(visit(primed + 60_000)).toBe(`dock:${GROUNDBAIT_CASTS}`);
    expect(visit(gone + 60_000)).toBe("");
    expect(kept.has(swimKey(profile.userId))).toBe(false);
    act(() => ([...container!.querySelectorAll("button")].find((button) => button.textContent === "groundbait") as HTMLButtonElement).click());
    expect(hint()).toBe(said.replace("5 casts", `${GROUNDBAIT_CASTS} casts`));
  });

  it("keeps a groundbaited swim for the next visit, primed once the feeders have gathered overnight", () => {
    const kept = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    mount();
    const bait = () => container!.querySelector("[data-testid=groundbait]")?.textContent?.split("|")[1];
    act(() => ([...container!.querySelectorAll("button")].find((button) => button.textContent === "groundbait") as HTMLButtonElement).click());
    expect(bait()).toBe(`dock:${GROUNDBAIT_CASTS}`);
    const thrown = JSON.parse(kept.get(swimKey(profile.userId))!);
    expect(thrown).toMatchObject({ spot: "dock", casts: GROUNDBAIT_CASTS });
    // A cast there uses one, and the swim keeps what is left and when it went in.
    cast(container!.querySelector<HTMLDivElement>("[data-stance]")!);
    const swim = JSON.parse(kept.get(swimKey(profile.userId))!);
    expect(swim).toEqual({ ...thrown, casts: GROUNDBAIT_CASTS - 1 });
    kept.set(swimKey(profile.userId), JSON.stringify({ ...swim, casts: 1, at: Date.now() - SWIM_PRIMED_MS - 60_000 }));
    act(() => root!.unmount());
    root = null;
    container!.remove();
    mount();
    expect(bait()).toBe(`dock:${GROUNDBAIT_CASTS}`);
    expect(hint()).toMatch(/^The groundbait you left at the Dock has the feeders gathered there/);
  });

  it("holds the feeders gathered over a swim baited with bread crumb and left behind longer, and keeps that through a reload", () => {
    const kept = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    const crumb = { ...profile, breadCrumb: true };
    const remount = () => {
      act(() => root!.unmount());
      root = null;
      container!.remove();
      mount(DOCK_BUBBLES.at, crumb);
    };
    // A swim baited before the sack was bought has no bread crumb in it.
    kept.set(swimKey(profile.userId), JSON.stringify({ spot: "reeds", casts: 1, at: DOCK_BUBBLES.at - SWIM_PRIMED_MS - 60_000 }));
    mount(DOCK_BUBBLES.at, crumb);
    const bait = () => container!.querySelector("[data-testid=groundbait]")?.textContent?.split("|")[1];
    expect(bait()).toBe(`reeds:${GROUNDBAIT_CASTS}`);
    act(() => ([...container!.querySelectorAll("button")].find((button) => button.textContent === "groundbait") as HTMLButtonElement).click());
    const thrown = JSON.parse(kept.get(swimKey(profile.userId))!);
    expect(thrown).toMatchObject({ spot: "dock", casts: GROUNDBAIT_CASTS, bread: true });
    kept.set(swimKey(profile.userId), JSON.stringify({ ...thrown, casts: 1, at: DOCK_BUBBLES.at - SWIM_PRIMED_MS - 60_000 }));
    remount();
    expect(bait()).toBe(`dock:${BREAD_SWIM_CASTS}`);
    expect(hint()).toBe(`The groundbait and bread crumb you left at the Dock have the feeders gathered there: ${BREAD_SWIM_CASTS} casts of it.`);
    expect(JSON.parse(kept.get(swimKey(profile.userId))!)).toMatchObject({ casts: BREAD_SWIM_CASTS, primed: true, bread: true });
    remount();
    expect(bait()).toBe(`dock:${BREAD_SWIM_CASTS}`);
  });

  it("chops two worms from the tin into a handful, and the swim keeps its chopped worm through a cast and a reload", () => {
    const kept = new Map<string, string>([[wormTinKey(profile.userId), JSON.stringify({ worms: CHOPPED_WORMS - 1, day: localDate(new Date(DOCK_BUBBLES.at)) })]]);
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    mount();
    const chop = () => act(() => ([...container!.querySelectorAll("button")].find((button) => button.textContent === "chopped worm") as HTMLButtonElement).click());
    const worms = () => container!.querySelector("[data-testid=worms]")?.textContent;
    // One worm short, nothing goes in.
    chop();
    expect(worms()).toBe(String(CHOPPED_WORMS - 1));
    expect(kept.has(swimKey(profile.userId))).toBe(false);
    expect(container!.querySelector("[data-testid=groundbait]")?.textContent).toBe("1|");
    act(() => root!.unmount());
    root = null;
    container!.remove();
    kept.set(wormTinKey(profile.userId), JSON.stringify({ worms: 3, day: localDate(new Date(DOCK_BUBBLES.at)) }));
    mount();
    chop();
    expect(worms()).toBe(String(3 - CHOPPED_WORMS));
    expect(JSON.parse(kept.get(swimKey(profile.userId))!)).toMatchObject({ spot: "dock", casts: GROUNDBAIT_CASTS, worm: true });
    expect(hint()).toContain(`${CHOPPED_WORMS} chopped worms went in with it: the perch here come in to feed with the feeders while the swim lasts. Worms left in your tin: ${3 - CHOPPED_WORMS}.`);
    act(() => root!.unmount());
    root = null;
    container!.remove();
    mount();
    cast(container!.querySelector<HTMLDivElement>("[data-stance]")!);
    expect(JSON.parse(kept.get(swimKey(profile.userId))!)).toMatchObject({ spot: "dock", casts: GROUNDBAIT_CASTS - 1, worm: true });
  });

  it("leaves any other landed fish on the card", () => {
    const surface = mount();
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "pike")!);
    step.mockReturnValueOnce("landed");
    castAndFight(surface, 1);
    baitShiner();
    expect(phase()).toBe("result:landed");
    expect(liveShiner()).toBe("false");
  });
});

describe("useFishingGame frayed line", () => {
  const frayed = () => container!.querySelector("[data-testid=frayed]")?.textContent;
  const dismiss = () => act(() => (container!.querySelector("button:not([data-thumb-strike]):not([data-steer])") as HTMLButtonElement).click());
  const retie = () => act(() => ([...container!.querySelectorAll("button")].find((button) => button.textContent === "retie") as HTMLButtonElement).click());
  const frayedArg = () => vi.mocked(makeFight).mock.calls.at(-1)?.[12];

  it("frays the line on a fight that rubbed the piling, says so once, and fights the next fish on it until retied", () => {
    const surface = mount();
    fightPerformance = { peakTension: 0.5, maxLine: 1, scuffed: true };
    step.mockReturnValueOnce("landed");
    castAndFight(surface, 1);
    expect(frayedArg()).toBe(false);
    expect(frayed()).toBe("true");
    expect(container!.querySelector("[data-testid=landed-note]")?.textContent).toContain("Rubbing round the piling frayed your line: it snaps sooner until you retie it.");
    dismiss();
    step.mockReturnValueOnce("landed");
    castAndFight(surface, 2);
    expect(frayedArg()).toBe(true);
    // Already frayed: the card doesn't say it again.
    expect(container!.querySelector("[data-testid=landed-note]")?.textContent).not.toContain("frayed");
    dismiss();
    retie();
    expect(frayed()).toBe("false");
    expect(hint()).toBe("You cut off the frayed line and tie the lure on again. The line holds full strain.");
    fightPerformance = { peakTension: 0.5, maxLine: 1 };
    step.mockReturnValueOnce("landed");
    castAndFight(surface, 3);
    expect(frayedArg()).toBe(false);
  });

  it("twists the line after many spinner casts, kinks a cast on it, and casts clean once retied", () => {
    const surface = mount();
    const twisted = () => container!.querySelector("[data-testid=twisted]")?.textContent;
    expect(twisted()).toBe("false");
    vi.mocked(twistAfterCast).mockReturnValueOnce(TWIST_CASTS);
    step.mockReturnValueOnce("landed");
    castAndFight(surface, 1);
    expect(twisted()).toBe("true");
    dismiss();
    // The test's rolls are all 0, so a cast on the twisted line kinks.
    cast(surface);
    expect(phase()).toBe("idle:miss");
    expect(hint()).toBe("A spinner's turns and a bluegill's circles twist the line. Retie to take the twist out.");
    retie();
    expect(twisted()).toBe("false");
    expect(hint()).toBe("You cut off the twisted line and tie the lure on again. It casts clean.");
    cast(surface);
    expect(phase()).toBe("waiting:none");
  });

  it("washes a worm out after many casts without a fish, slows the bite on it, and draws again once rebaited from the tin", () => {
    const kept = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Nightcrawler");
    const washed = () => container!.querySelector("[data-testid=washed]")?.textContent;
    expect(washed()).toBe("false");
    vi.mocked(soakAfterCast).mockReturnValueOnce(WORM_SOAK_CASTS);
    step.mockReturnValueOnce("escaped");
    castAndFight(surface, 1);
    expect(washed()).toBe("true");
    dismiss();
    cast(surface);
    expect(hint()).toContain("The worm has soaked pale and lost its scent, so the bites come slow. Put a fresh one on.");
    act(() => vi.advanceTimersByTime(2_201 * WASHED_WAIT));
    act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
    step.mockReturnValueOnce("escaped");
    act(() => frames.at(-1)!(now));
    dismiss();
    retie();
    expect(washed()).toBe("false");
    const left = wormsDug(new Date(DOCK_BUBBLES.at)) - 1;
    expect(hint()).toBe(`You thread a fresh worm on the hook. Its scent draws the fish again. Worms left in your tin: ${left}.`);
    expect(container!.querySelector("[data-testid=worms]")?.textContent).toBe(String(left));
    cast(surface);
    expect(hint()).not.toContain("lost its scent");
  });

  it.each([
    ["the tin is empty", 0, "Nightcrawler", "true", `You cut off the frayed line and tie the lure on again. The line holds full strain. Your worm tin is empty, so the washed-out worm stays on. More worms are dug each day, or the shack sells one.`],
    ["a spinner is tied on instead", 2, "Inline spinner", "false", "You cut off the frayed line and tie the lure on again. The line holds full strain."],
  ] as const)("retying a frayed line over a washed-out worm spends no worm when %s", (_, worms, lure, washed, said) => {
    const kept = new Map<string, string>([[wormTinKey("test"), JSON.stringify({ worms, day: localDate(new Date(DOCK_BUBBLES.at)) })]]);
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Nightcrawler");
    fightPerformance = { peakTension: 0.5, maxLine: 1, scuffed: true };
    step.mockReturnValueOnce("landed");
    castAndFight(surface, 1);
    dismiss();
    fightPerformance = { peakTension: 0.5, maxLine: 1 };
    vi.mocked(soakAfterCast).mockReturnValueOnce(WORM_SOAK_CASTS);
    step.mockReturnValueOnce("escaped");
    castAndFight(surface, 2);
    dismiss();
    expect(container!.querySelector("[data-testid=frayed]")?.textContent).toBe("true");
    expect(container!.querySelector("[data-testid=washed]")?.textContent).toBe("true");
    act(() => root!.render(<Harness current={profile} lure={lure} />));
    retie();
    expect(container!.querySelector("[data-testid=frayed]")?.textContent).toBe("false");
    expect(container!.querySelector("[data-testid=washed]")?.textContent).toBe(washed);
    expect(container!.querySelector("[data-testid=worms]")?.textContent).toBe(String(worms));
    expect(hint()).toBe(said);
  });

  it("keeps the washed-out worm on when the tin is empty", () => {
    const kept = new Map<string, string>([[wormTinKey("test"), JSON.stringify({ worms: 0, day: localDate(new Date(DOCK_BUBBLES.at)) })]]);
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Nightcrawler");
    vi.mocked(soakAfterCast).mockReturnValueOnce(WORM_SOAK_CASTS);
    step.mockReturnValueOnce("escaped");
    castAndFight(surface, 1);
    dismiss();
    retie();
    expect(container!.querySelector("[data-testid=washed]")?.textContent).toBe("true");
    expect(hint()).toBe("Your worm tin is empty, so the washed-out worm stays on. More worms are dug each day, or the shack sells one.");
  });

  it("puts a worm bought at the shack in the tin, up to a wet morning's dig", () => {
    const kept = new Map<string, string>([[wormTinKey("test"), JSON.stringify({ worms: WORM_TIN_WET - 1, day: localDate(new Date(DOCK_BUBBLES.at)) })]]);
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    mount(DOCK_BUBBLES.at, profile, "day", false, "Nightcrawler");
    const buy = [...container!.querySelectorAll("button")].find((button) => button.textContent === "buy worm")!;
    act(() => buy.click());
    expect(hint()).toBe(`The worm goes in your tin: ${WORM_TIN_WET} of ${WORM_TIN_WET}.`);
    expect(JSON.parse(kept.get(wormTinKey("test"))!).worms).toBe(WORM_TIN_WET);
    act(() => buy.click());
    expect(container!.querySelector("[data-testid=worms]")?.textContent).toBe(String(WORM_TIN_WET));
  });

  it.each([
    ["spring", false, false],
    ["summer", false, false],
    ["summer", true, false],
    ["summer", true, true],
  ] as const)("loses yesterday's spare worms in the summer heat and says so on the next visit: %s, a shiner died too %s, a swim primed too %s", (season, shinerDied, swimPrimed) => {
    const yesterday = localDate(new Date(DOCK_BUBBLES.at - 86_400_000));
    const kept = new Map<string, string>([[wormTinKey(profile.userId), JSON.stringify({ worms: WORM_TIN_WET, day: yesterday })]]);
    if (shinerDied) kept.set(baitBucketKey(profile.userId), JSON.stringify([DOCK_BUBBLES.at - BUCKET_HOT_LIFE_MS - 1]));
    if (swimPrimed) kept.set(swimKey(profile.userId), JSON.stringify({ spot: "dock", casts: 1, at: DOCK_BUBBLES.at - SWIM_HOT_PRIMED_MS - 60_000 }));
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    mount(DOCK_BUBBLES.at, profile, "day", false, undefined, undefined, undefined, season);
    const dug = wormsDug(new Date(DOCK_BUBBLES.at));
    // A dry morning's dig, so the summer tin ends lower than it was.
    expect(dug).toBeLessThan(WORM_TIN_WET);
    const worms = season === "summer" ? dug : WORM_TIN_WET;
    expect(container!.querySelector("[data-testid=worms]")?.textContent).toBe(String(worms));
    expect(JSON.parse(kept.get(wormTinKey(profile.userId))!).worms).toBe(worms);
    const wormsSaid = `${WORM_TIN_WET - dug} of the worms left in your tin died in the summer heat while you were away: they keep only the day they are dug or bought.`;
    const shinerSaid = "1 of the shiners in your bait bucket died while you were away: in the summer heat they keep two days.";
    if (season === "spring") expect(hint()).not.toContain("worms left in your tin");
    else expect(hint()).toBe([shinerDied ? shinerSaid : "", wormsSaid, swimPrimed ? `The groundbait you left at the Dock has the feeders gathered there: ${GROUNDBAIT_CASTS} casts of it.` : ""].filter(Boolean).join(" "));
  });

  it.each([
    [1, WORM_TIN_WET, ""],
    [2, null, "even in the worm bin they keep only to the next day."],
  ] as const)("keeps the summer tin's worms a day longer with a place in the worm bin: left %i days ago", (daysAgo, worms, said) => {
    const left = new Date(DOCK_BUBBLES.at - daysAgo * 86_400_000);
    const kept = new Map<string, string>([[wormTinKey(profile.userId), JSON.stringify({ worms: WORM_TIN_WET, day: localDate(left) })]]);
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    mount(DOCK_BUBBLES.at, { ...profile, wormBin: true }, "day", false, undefined, undefined, undefined, "summer");
    const dug = wormsDug(new Date(DOCK_BUBBLES.at));
    expect(container!.querySelector("[data-testid=worms]")?.textContent).toBe(String(worms ?? dug));
    if (said) expect(hint()).toBe(`${WORM_TIN_WET - dug} of the worms left in your tin died in the summer heat while you were away: ${said}`);
    else expect(hint()).not.toContain("worms left in your tin");
  });

  it("puts a fresh worm on after a landed fish", () => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Nightcrawler");
    vi.mocked(soakAfterCast).mockReturnValueOnce(WORM_SOAK_CASTS);
    step.mockReturnValueOnce("landed");
    castAndFight(surface, 1);
    expect(container!.querySelector("[data-testid=washed]")?.textContent).toBe("false");
  });

  it("holds the line a moment past the red from level 14", () => {
    const strain = () => vi.mocked(makeFight).mock.calls.at(-1)?.[14];
    let surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 23000 });
    step.mockReturnValueOnce("landed");
    castAndFight(surface, 1);
    expect(strain()).toBe(1);
    act(() => root!.unmount());
    container!.remove();
    surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 30000 });
    step.mockReturnValueOnce("landed");
    castAndFight(surface, 2);
    expect(strain()).toBe(1.05);
  });

  it("ties on a fresh line after a break", () => {
    const surface = mount();
    fightPerformance = { peakTension: 0.5, maxLine: 1, scuffed: true };
    step.mockReturnValueOnce("landed");
    castAndFight(surface, 1);
    dismiss();
    step.mockReturnValueOnce("snapped");
    castAndFight(surface, 2);
    expect(frayed()).toBe("false");
  });
});

describe("useFishingGame lost fight", () => {
  const hint = () => container!.querySelector("[data-testid=hint]")?.textContent;

  it("names the pike when it takes a perch, not the walleye that takes them out in the open", () => {
    const surface = mount();
    vi.mocked(grabberFor).mockReturnValueOnce(FISH.find((fish) => fish.id === "pike")!);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "perch")!);
    fightLine = 0.4;
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 1);
    expect(container!.querySelector("[data-testid=fight]")?.textContent).toMatch(/^pike\|/);
    expect(hint()).toContain("A pike grabbed your perch!");
  });

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

  it("tells the hunter's tip at the hookset", () => {
    const surface = mount();
    vi.mocked(flutterTip).mockReturnValue("A pike hunts them here.");
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "golden-shiner")!);
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 1);
    expect(hint()).toMatch(/Ease off when it runs\. A pike hunts them here\.$/);
    vi.mocked(flutterTip).mockReturnValue("");
  });

  it("sends the pike for a shiner left to flutter out past halfway, not one reeled straight in", () => {
    const pike = FISH.find((fish) => fish.id === "pike")!;
    const shiner = FISH.find((fish) => fish.id === "golden-shiner")!;
    const fightFrames = (count: number) => {
      for (let i = 0; i < count; i++) {
        step.mockReturnValueOnce("fighting");
        now += 50;
        act(() => frames.at(-1)!(now));
      }
    };
    // Reeled the whole way, or pumped with short pauses, the shiner never flutters.
    const surface = mount();
    vi.mocked(flutterGrabberFor).mockReturnValueOnce(pike);
    vi.mocked(pickBite).mockReturnValueOnce(shiner);
    fightLine = 0.8;
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 1);
    fightFrames(30);
    for (let pump = 0; pump < 3; pump++) {
      act(() => window.dispatchEvent(pointer("pointerup", 1)));
      fightFrames(20);
      act(() => surface.dispatchEvent(pointer("pointerdown", 1)));
      fightFrames(1);
    }
    const reeled = vi.mocked(makeFight).mock.results.at(-1)!.value;
    reeled.sim.line = 0.4;
    fightFrames(1);
    expect(container!.querySelector("[data-testid=fight]")?.textContent).toMatch(/^golden-shiner\|/);
    // Let off only through its runs, and reeled between them, it doesn't flutter either.
    step.mockReturnValueOnce("landed");
    now += 50;
    act(() => frames.at(-1)!(now));
    act(() => (container!.querySelector("button:not([data-thumb-strike]):not([data-steer])") as HTMLButtonElement).click());
    vi.mocked(flutterGrabberFor).mockReturnValueOnce(pike);
    vi.mocked(pickBite).mockReturnValueOnce(shiner);
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 3);
    act(() => window.dispatchEvent(pointer("pointerup", 3)));
    const running = vi.mocked(makeFight).mock.results.at(-1)!.value;
    for (let run = 0; run < 3; run++) {
      running.sim.surge = 2;
      act(() => window.dispatchEvent(pointer("pointerup", 3)));
      fightFrames(30);
      running.sim.surge = 0;
      act(() => surface.dispatchEvent(pointer("pointerdown", 3)));
      fightFrames(10);
    }
    running.sim.line = 0.4;
    fightFrames(1);
    expect(container!.querySelector("[data-testid=fight]")?.textContent).toMatch(/^golden-shiner\|/);
    // Let off past halfway between runs, it flutters and the pike comes for it at halfway.
    step.mockReturnValueOnce("landed");
    now += 50;
    act(() => frames.at(-1)!(now));
    act(() => (container!.querySelector("button:not([data-thumb-strike]):not([data-steer])") as HTMLButtonElement).click());
    vi.mocked(flutterGrabberFor).mockReturnValueOnce(pike);
    vi.mocked(pickBite).mockReturnValueOnce(shiner);
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 2);
    act(() => window.dispatchEvent(pointer("pointerup", 2)));
    fightFrames(30);
    expect(container!.querySelector("[data-testid=fight]")?.textContent).toMatch(/^golden-shiner\|/);
    vi.mocked(makeFight).mock.results.at(-1)!.value.sim.line = 0.4;
    fightFrames(1);
    expect(container!.querySelector("[data-testid=fight]")?.textContent).toMatch(/^pike\|/);
    expect(hint()).toContain("A pike grabbed your shiner!");
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

  it("keeps a fish that dropped the bait about for the next cast, and names it when it takes again", () => {
    const surface = mount();
    const crappie = FISH.find((fish) => fish.id === "crappie")!;
    vi.mocked(pickBite).mockReturnValueOnce(crappie);
    cast(surface);
    for (let waited = 0; phase() !== "result:miss" && waited < 25_000; waited += 100) act(() => vi.advanceTimersByTime(100));
    expect(phase()).toBe("result:miss");
    expect(hint()).toMatch(/It wasn't hooked, so it may take again: cast straight back here\.$/);
    const missed = vi.mocked(castForGotAway).mock.calls.length;
    act(() => (container!.querySelector("button:not([data-thumb-strike]):not([data-steer])") as HTMLButtonElement).click());
    vi.mocked(castForGotAway).mockImplementationOnce((waiting) => ({ again: waiting, next: null }));
    step.mockReturnValueOnce("fighting");
    castAndFight(surface, 2);
    const waiting = vi.mocked(castForGotAway).mock.calls[missed]?.[0];
    expect(waiting).toMatchObject({ spot: "dock", species: { id: "crappie" }, casts: 1, dropped: true });
    expect(container!.querySelector("[data-testid=fight]")?.textContent).toBe(`crappie|${waiting!.weight}`);
    expect(hint()).toMatch(/^It's the one that dropped your bait! /);
    step.mockReturnValueOnce("landed");
    now += 16;
    act(() => frames.at(-1)!(now));
    // It didn't get away from a fight, so the landed card doesn't call it that.
    expect(container!.querySelector("[data-testid=got-away]")?.textContent).toBe("false");
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

  it("says a lost trophy-sized fish looked like a trophy, and keeps it about the bank for the days to come", () => {
    const kept = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Pheasant tails");
    const message = () => container!.querySelector("[data-testid=broke]")?.textContent;
    const pike = FISH.find((fish) => fish.id === "pike")!;
    vi.mocked(castForGotAway).mockReturnValueOnce({ again: { spot: "dock", species: pike, weight: pike.maxWeight, casts: 1 }, next: null });
    step.mockReturnValueOnce("escaped");
    castAndFight(surface, 1);
    expect(message()).toMatch(/threw the hook\. It looked like a trophy\. It will be about this bank in the days to come\.$/);
    expect(JSON.parse(kept.get(oldFoeKey(profile.userId))!)).toMatchObject({ species: "pike", weight: pike.maxWeight, spot: "dock", lure: "Pheasant tails" });
    // And it goes to the lodge, for other anglers to meet.
    const report = container!.querySelector("[data-testid=lost-report]")?.textContent ?? "";
    expect(report).toMatch(new RegExp(`^pike\\|${pike.maxWeight}\\|dock\\|`));
    // The foe keeps the report's id from the moment it broke off, so landing it oneself closes the report.
    expect(JSON.parse(kept.get(oldFoeKey(profile.userId))!).reportId).toBe(report.split("|")[3]);
  });

  it("says a light hook dropped out of the slack line when a charge was left slack", () => {
    const surface = mount();
    const message = () => container!.querySelector("[data-testid=broke]")?.textContent;
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "smallmouth-bass")!);
    vi.mocked(makeFight).mockImplementationOnce(() => ({ sim: { line: 0.5, tension: 0.2, surge: 2, stamina: 1, runSide: 1, lightHook: true, thrown: true }, performance: { peakTension: 0.3, maxLine: 0.5 }, step }));
    step.mockReturnValueOnce("escaped");
    castAndFight(surface, 1);
    expect(message()).toMatch(/charged straight at you and the light hook dropped out of the slack line\./);
    expect(hint()).toMatch(/^Hooked light — when it charges, reel fast to keep the line tight\./);
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

  it("needs a quicker strike for a solid hook on a long cast, where the line stretches", () => {
    const limitAt = (aim: string) => {
      const surface = mount();
      surface.dataset.aim = aim;
      cast(surface);
      act(() => vi.advanceTimersByTime(2_201));
      now += 900;
      act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
      expect(phase()).toBe("fight:none");
      const said = hint() ?? "";
      act(() => root!.unmount());
      root = null;
      container!.remove();
      return said;
    };
    // The harness angler stands at 0.15,7.42: 0.5,3 is under half the reach, 0.86,-1.55 is about 9 m out in the dock's water.
    const near = limitAt("0.5,3").match(/^Hooked in 0\.90 s \(solid under (\d\.\d\d) s\)\. /);
    const far = limitAt("0.86,-1.55").match(/^Hooked in 0\.90 s \(solid under (\d\.\d\d) s this far out, where the line stretches\)\. /);
    expect(near).not.toBeNull();
    expect(far).not.toBeNull();
    expect(Number(far![1])).toBeCloseTo(Number(near![1]) * LONG_CAST_SOLID, 1);
  });

  it("sets a solid hook over more of the bite from level 15", () => {
    const limitAt = (lifetimePoints: number) => {
      const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints });
      cast(surface);
      act(() => vi.advanceTimersByTime(2_201));
      now += 900;
      act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
      const limit = (hint() ?? "").match(/^Hooked in 0\.90 s \(solid under (\d\.\d\d) s\)\. /);
      act(() => root!.unmount());
      root = null;
      container!.remove();
      return Number(limit?.[1]);
    };
    expect(limitAt(38000)).toBeCloseTo(limitAt(30000) * 1.2, 1);
  });

  it("says a low cast off the dock skipped under the planks, and tells the skip roll the bank and lure", () => {
    vi.mocked(isSkipCast).mockReturnValueOnce(true);
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Nightcrawler");
    cast(surface);
    expect(hint()).toContain("Skipped it under the dock, into the shade. ");
    expect(vi.mocked(isSkipCast).mock.lastCall?.slice(2)).toEqual(["dock", "Nightcrawler"]);
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

  it("warns that a pike which swallowed the bait has its teeth on the line, and says so when they fray it", () => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Nightcrawler");
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "pike")!);
    cast(surface);
    act(() => vi.advanceTimersByTime(2_201));
    now += 1_100;
    act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
    expect(hint()).toMatch(/^It swallowed the bait: hooked deep in 1\.10 s, with its teeth on the line\. Land it quick\. .*Ease off when it runs\.$/);
    // The swallowed hook goes to the fight, so the teeth can fray the line.
    expect(vi.mocked(makeFight).mock.calls.at(-1)![13]).toBe(true);
    const sim = vi.mocked(makeFight).mock.results.at(-1)!.value.sim as FightSim;
    sim.bitten = true;
    sim.frayed = true;
    step.mockReturnValueOnce("fighting");
    act(() => frames.at(-1)!(now));
    expect(hint()).toBe("Its teeth have frayed the line! It snaps sooner now, so land it quick.");
    vi.mocked(makeFight).mock.results.at(-1)!.value.performance.bitten = true;
    step.mockReturnValueOnce("landed");
    act(() => frames.at(-1)!(now));
    expect(container!.querySelector("[data-testid=landed-note]")?.textContent).toContain("Its teeth frayed your line: it snaps sooner until you retie it.");
    expect(container!.querySelector("[data-testid=frayed]")?.textContent).toBe("true");
  });

  it("blames the teeth when a pike snaps the line they frayed", () => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Nightcrawler");
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "pike")!);
    cast(surface);
    act(() => vi.advanceTimersByTime(2_201));
    now += 1_100;
    act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
    const sim = vi.mocked(makeFight).mock.results.at(-1)!.value.sim as FightSim;
    sim.bitten = true;
    sim.frayed = true;
    step.mockReturnValueOnce("snapped");
    act(() => frames.at(-1)!(now));
    expect(container!.querySelector("[data-testid=broke]")?.textContent).toContain("The Northern pike's teeth wore through the line before you could land it.");
    expect(hint()).toContain("Given time, a pike or muskie swallows the bait: strike sooner, or land it quick.");
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

  it("tells the snag roll which lure was cast, and the angler's Accuracy", () => {
    const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Topwater frog");
    cast(surface);
    expect(vi.mocked(castSnags).mock.lastCall?.[5]).toBe(profile.accuracy);
    expect(vi.mocked(castSnags).mock.lastCall?.[6]).toBe("Topwater frog");
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
    expect(hint()).toBe("Off the rocks, but they blunted the hook point. Let it settle.");
    expect(container!.querySelector("[data-testid=dulled]")?.textContent).toBe("true");
  });

  it("halves the solid strike on a hook blunted on the rocks, until it is touched up", () => {
    const dulled = () => container!.querySelector("[data-testid=dulled]")?.textContent;
    const freeOfRocks = (surface: HTMLDivElement, base: number) => {
      vi.mocked(castSnags).mockReturnValueOnce("rocks");
      cast(surface);
      act(() => vi.advanceTimersByTime(SNAG_AT_MS + 1));
      for (let tap = 1; tap <= SNAG_TAPS; tap += 1) {
        act(() => surface.dispatchEvent(pointer("pointerdown", base + tap)));
        act(() => window.dispatchEvent(pointer("pointerup", base + tap)));
      }
    };
    let surface = mount();
    freeOfRocks(surface, 40);
    expect(dulled()).toBe("true");
    act(() => vi.advanceTimersByTime(2_201));
    now += 900;
    act(() => surface.dispatchEvent(pointer("pointerdown", 60)));
    expect(phase()).toBe("fight:none");
    expect(hint()).toMatch(/^Hooked in 0\.90 s \(solid under 0\.\d\d s on the dull hook\)\. /);
    act(() => root!.unmount());
    container!.remove();

    surface = mount();
    freeOfRocks(surface, 70);
    // Let the bite go by unstruck, back to idle, and touch the hook up.
    act(() => vi.advanceTimersByTime(30_000));
    expect(phase()).toBe("result:miss");
    act(() => ([...container!.querySelectorAll("button")].find((button) => button.textContent === "dismiss") as HTMLButtonElement).click());
    act(() => ([...container!.querySelectorAll("button")].find((button) => button.textContent === "retie") as HTMLButtonElement).click());
    expect(dulled()).toBe("false");
    expect(hint()).toBe("You touch up the dull hook point and tie the lure on again. It sets solid again.");
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
    expect(step).toHaveBeenLastCalledWith(expect.any(Number), expect.any(Number), true, 0, "normal");
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

  it("boils the bubbles in a feeding frenzy: the hint says so and the bite comes sooner still", () => {
    // A frenzy whose bubbles sit on the dock, clear of the harness's default aim.
    let at = 0;
    let bubbles = DOCK_BUBBLES.bubbles;
    for (let slot = Math.floor(Date.UTC(2026, 9, 8, 12) / FRENZY_SLOT_MS); !at; slot += 1) {
      const frenzy = slotFrenzy(slot * FRENZY_SLOT_MS);
      const spot = hotspotAt(frenzy.from + 1_000, 1);
      if (spot.spot === "dock" && Math.hypot(spot.x - 0.5, spot.z - 3) > HOTSPOT_RADIUS * 2) {
        at = frenzy.from + 1_000;
        bubbles = spot;
      }
    }
    const surface = mount(at);
    surface.dataset.angler = `${DOCK_STAND_X},${DOCK_STAND_Z}`;
    surface.dataset.aim = `${bubbles.x},${bubbles.z}`;
    cast(surface);
    expect(hint()).toMatch(/^Into the frenzy!/);
    // Sooner than the bubbles alone bring it, down to the wait's floor.
    for (let waited = 0; phase() === "waiting:none" && waited < sooner() - 60; waited += 10) act(() => vi.advanceTimersByTime(10));
    expect(phase()).toBe("hookset:none");
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

  it("leaves out the short-cast line when a short cast lands among the tadpoles, since the fish come in to them", () => {
    vi.mocked(amongTadpoles).mockReturnValueOnce(true);
    const surface = mount();
    lateRoll();
    castFor(surface, 300);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toMatch(/^Among the tadpoles in the warm shallows/);
    expect(hint()).not.toMatch(/Short cast/);
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
    // It takes rather than following to the bank.
    vi.mocked(Math.random).mockReturnValue(FIGURE_EIGHT_ODDS);
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

  describe("a pike following a flashing lure to the bank", () => {
    const follow = () => {
      const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "#5 Mepps");
      vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "pike")!);
      cast(surface);
      for (let waited = 0; !/followed it to the bank/.test(hint() ?? "") && waited < 20_000; waited += 10) act(() => vi.advanceTimersByTime(10));
      expect(phase()).toBe("waiting:none");
    };
    const tap = () => act(() => window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", bubbles: true })));

    it("strikes on a figure-eight as it turns", () => {
      follow();
      act(() => vi.advanceTimersByTime(FIGURE_TURN_MS + 10));
      expect(hint()).toBe("NOW — it's turning!");
      now += 100;
      tap();
      expect(phase()).toBe("hookset:none");
      expect(hint()).toBe("It turned on the figure-eight and hit! Strike!");
    });

    it("sinks away on a tap before it turns, or when it is left to turn", () => {
      follow();
      tap();
      expect(phase()).toBe("result:miss");
      follow();
      act(() => vi.advanceTimersByTime(FIGURE_TURN_MS + FIGURE_WINDOW_MS + 50));
      expect(phase()).toBe("result:miss");
      // Untouched, it stays about the bank like a fish that dropped the bait.
      expect(container!.querySelector("[data-testid=missed]")?.textContent).toMatch(/^pike\|/);
    });
  });

  it("brings a fish up sooner when a sitting topwater lure is popped, for the first two pops", () => {
    const untilBite = (pops: number) => {
      const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Topwater frog");
      vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "largemouth-bass")!);
      cast(surface);
      act(() => vi.advanceTimersByTime(300));
      for (let pop = 0; pop < pops; pop++) {
        act(() => surface.dispatchEvent(pointer("pointerdown", 2 + pop)));
        expect(hint()).toBe(pop < TOPWATER_POPS ? "Pop! The lure spits and gurgles. Let it sit…" : "Let it sit between pops. Worked again so soon, it puts the fish off a moment.");
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
    // A third pop only puts the fish off a moment.
    expect(untilBite(TOPWATER_POPS + 1)).toBe(popped + FALSE_STRIKE_MS);
  });

  it("brings a fish up sooner when a jig on the bottom is hopped, for the first two hops", () => {
    const untilBite = (hops: number) => {
      const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Green pumpkin tube");
      vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "largemouth-bass")!);
      cast(surface);
      act(() => vi.advanceTimersByTime(300));
      for (let hop = 0; hop < hops; hop++) {
        act(() => surface.dispatchEvent(pointer("pointerdown", 2 + hop)));
        expect(hint()).toBe(hop < TOPWATER_POPS ? "Hop! The jig lifts off the bottom and flutters down. Let it fall…" : "Let it fall between hops. Worked again so soon, it puts the fish off a moment.");
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
    expect(untilBite(TOPWATER_POPS + 1)).toBe(hopped + FALSE_STRIKE_MS);
  });

  it("puts the slow winter fish off when the jig is hopped too quick, but not when each hop gets a slow count", () => {
    const untilBite = (hops: number, gap: number) => {
      const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Green pumpkin tube", undefined, undefined, "winter");
      vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "perch")!);
      // A long wait, so two slow hops fit before the bite.
      const random = vi.spyOn(Math, "random").mockReturnValue(0.99);
      cast(surface);
      act(() => vi.advanceTimersByTime(300));
      now += 300;
      let waited = 300;
      for (let hop = 0; hop < hops; hop++) {
        // The gap between hops is timed by the page clock.
        act(() => vi.advanceTimersByTime(gap));
        now += gap;
        waited += gap;
        expect(phase()).toBe("waiting:none");
        act(() => surface.dispatchEvent(pointer("pointerdown", 2 + hop)));
        expect(hint()).toBe(
          gap < COLD_WORK_GAP_MS
            ? "Too quick for the cold water: the slow fish turn from it. Give it a slow count before the next one."
            : "Hop! The jig lifts off the bottom and flutters down. Let it fall…",
        );
        act(() => window.dispatchEvent(pointer("pointerup", 2 + hop)));
      }
      for (; phase() !== "hookset:none" && waited < 30_000; waited += 10) act(() => vi.advanceTimersByTime(10));
      random.mockRestore();
      act(() => root!.unmount());
      root = null;
      container!.remove();
      return waited;
    };
    const sat = untilBite(0, 0);
    expect(untilBite(TOPWATER_POPS, 0)).toBeGreaterThan(sat * 1.2);
    expect(untilBite(TOPWATER_POPS, COLD_WORK_GAP_MS + 500)).toBeLessThan(sat * 0.8);
  });

  it("brings a fish up sooner when a streamer is stripped, for the first two strips", () => {
    const untilBite = (strips: number) => {
      const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Woolly bugger");
      vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "rainbow-trout")!);
      cast(surface);
      act(() => vi.advanceTimersByTime(300));
      for (let strip = 0; strip < strips; strip++) {
        act(() => surface.dispatchEvent(pointer("pointerdown", 2 + strip)));
        expect(hint()).toBe(strip < TOPWATER_POPS ? "Strip! The streamer darts off like a fleeing fish. Let it hang…" : "Let it hang between strips. Worked again so soon, it puts the fish off a moment.");
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
    expect(untilBite(TOPWATER_POPS + 1)).toBe(stripped + FALSE_STRIKE_MS);
  });

  it("brings a fish up sooner when a crankbait is paused, for the first two pauses", () => {
    const untilBite = (pauses: number) => {
      const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Shallow crankbait");
      vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "smallmouth-bass")!);
      cast(surface);
      act(() => vi.advanceTimersByTime(300));
      for (let pause = 0; pause < pauses; pause++) {
        act(() => surface.dispatchEvent(pointer("pointerdown", 2 + pause)));
        expect(hint()).toBe(pause < TOPWATER_POPS ? "Pause! The crankbait stops and floats up, and a following fish turns on it. Reel on…" : "Keep it coming between pauses. Worked again so soon, it puts the fish off a moment.");
        act(() => window.dispatchEvent(pointer("pointerup", 2 + pause)));
      }
      let waited = 300;
      for (; phase() !== "hookset:none" && waited < 20_000; waited += 10) act(() => vi.advanceTimersByTime(10));
      act(() => root!.unmount());
      root = null;
      container!.remove();
      return waited;
    };
    const sat = untilBite(0);
    const paused = untilBite(TOPWATER_POPS);
    expect(paused).toBeLessThan(sat * 0.6);
    expect(untilBite(TOPWATER_POPS + 1)).toBe(paused + FALSE_STRIKE_MS);
  });

  it("brings a fish up sooner when a fly is twitched, for the first two twitches", () => {
    const untilBite = (twitches: number) => {
      const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Pheasant tail nymph");
      vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "brook-trout")!);
      cast(surface);
      act(() => vi.advanceTimersByTime(300));
      for (let twitch = 0; twitch < twitches; twitch++) {
        act(() => surface.dispatchEvent(pointer("pointerdown", 2 + twitch)));
        expect(hint()).toBe(twitch < TOPWATER_POPS ? "Twitch! The fly darts like a live insect. Let it drift…" : "Let it drift between twitches. Worked again so soon, it puts the fish off a moment.");
        act(() => window.dispatchEvent(pointer("pointerup", 2 + twitch)));
      }
      let waited = 300;
      for (; phase() !== "hookset:none" && waited < 20_000; waited += 10) act(() => vi.advanceTimersByTime(10));
      act(() => root!.unmount());
      root = null;
      container!.remove();
      return waited;
    };
    const sat = untilBite(0);
    const twitched = untilBite(TOPWATER_POPS);
    expect(twitched).toBeLessThan(sat * 0.6);
    expect(untilBite(TOPWATER_POPS + 1)).toBe(twitched + FALSE_STRIKE_MS);
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
    expect(untilBite(3, 17000).said).toBe("Let it fall between lifts. Worked again so soon, it puts the fish off a moment.");
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
        expect(hint()).toBe(hop < TOPWATER_POPS ? "Lift! The spoon flashes and flutters back down. Let it fall…" : "Let it fall between lifts. Worked again so soon, it puts the fish off a moment.");
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
    expect(untilBite(TOPWATER_POPS + 1)).toBe(hopped + FALSE_STRIKE_MS);
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

  it("puts the fish off a moment with each strike at nothing, so mashing the strike never finds the bite", () => {
    const untilBite = (strikes: number, every = 100) => {
      const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Inline spinner");
      vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "perch")!);
      cast(surface);
      let waited = 0;
      for (let strike = 0; strike < strikes; strike++) {
        act(() => vi.advanceTimersByTime(every));
        now += every;
        waited += every;
        expect(phase()).toBe("waiting:none");
        act(() => surface.dispatchEvent(pointer("pointerdown", 2 + strike)));
        expect(hint()).toMatch(/the fish (backs off|off) a moment/);
        act(() => window.dispatchEvent(pointer("pointerup", 2 + strike)));
      }
      for (; phase() !== "hookset:none" && waited < 60_000; waited += 10) act(() => vi.advanceTimersByTime(10));
      act(() => root!.unmount());
      root = null;
      container!.remove();
      return waited;
    };
    const sat = untilBite(0);
    expect(untilBite(1)).toBe(sat + FALSE_STRIKE_MS);
    // Mashing for twice as long as the wait never meets the bite; it comes once the strikes stop.
    const strikes = Math.ceil((2 * sat) / 100);
    expect(untilBite(strikes)).toBe(sat + strikes * FALSE_STRIKE_MS);
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
    expect(hint()).toBe("That was only a nibble, and the tug puts the fish off a moment. Wait for the bobber to go under, then strike.");
    act(() => window.dispatchEvent(pointer("pointerup", 7)));
    act(() => vi.advanceTimersByTime(SECOND_TAKE_NIBBLE_MS));
    act(() => surface.dispatchEvent(pointer("pointerdown", 8)));
    expect(hint()).toBe("Too early: the tug moved the bait, and the fish backs off a moment. Wait for the bobber to go under, then strike.");
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

  it("lets a headlamp at night show the float, holding the strike longer, while its light slows the bite", () => {
    const windowWith = (lamp: boolean) => {
      const surface = mount(DOCK_BUBBLES.at, profile, "night");
      vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "bluegill")!);
      if (lamp) act(() => ([...container!.querySelectorAll("button")].find((button) => button.textContent === "lamp") as HTMLButtonElement).click());
      cast(surface);
      const told = hint();
      for (let waited = 0; !phase()?.startsWith("hookset") && waited < 20_000; waited += 100) act(() => vi.advanceTimersByTime(100));
      const ms = Number(container!.querySelector("[data-testid=strike-window]")?.textContent);
      act(() => root!.unmount());
      root = null;
      container!.remove();
      return { told, ms };
    };
    const dark = windowWith(false);
    const lit = windowWith(true);
    expect(lit.told).toContain("Your headlamp shows the float plainly, but its light on the water puts the fish off.");
    expect(dark.told).not.toContain("headlamp");
    expect(lit.ms).toBe(Math.round(dark.ms * LAMP_WINDOW));
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
    expect(hint()).toBe("Strike the moment the float lifts. It wasn't hooked, so it may take again: cast straight back here.");
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

  it.each([
    ["Chartreuse jig", "rain", "day", "The bright lure shows up in the murk. "],
    ["Chartreuse jig", "clear", "dawn", "The bright lure shows up in the low light. "],
    ["Green pumpkin tube", "clear", "day", "In the clear daylight the natural colours look like the real thing. "],
    ["Black jig", "clear", "night", "The dark lure stands out against the night sky above it. "],
    ["Chartreuse jig", "clear", "day", null],
    ["Black jig", "rain", "day", null],
  ] as const)("says a %s suits the light under a %s sky by %s", (lure, sky, hour, said) => {
    const surface = mount(DOCK_BUBBLES.at, profile, hour, false, lure, undefined, sky);
    cast(surface);
    // The wait hint shows as the lure lands, before a quick night nibble can ring the bell.
    let told = "";
    for (let waited = 0; waited < 1400 && !told; waited += 50) {
      act(() => vi.advanceTimersByTime(50));
      if (phase()?.startsWith("waiting")) told = hint() ?? "";
    }
    if (said) expect(told).toContain(said);
    else expect(told).not.toMatch(/bright lure|natural colours|dark lure/);
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

  it("says a cloud over the sun brings the fish up into the shallows when the cast's wait comes sooner for it", () => {
    vi.mocked(cloudShadeWaitMul).mockReturnValueOnce(CLOUD_SHADE_WAIT);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 });
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toContain("A cloud slides over the sun, and the fish move up into the shallows to feed.");
    expect(vi.mocked(cloudShadeWaitMul).mock.lastCall?.[0]).toBe("dock");
  });

  it.each([
    ["overhead", "The moon is passing overhead, and the fish come on the feed for an hour either side."],
    ["underfoot", "The moon is passing underfoot, on the far side of the earth, and the fish come on the feed for an hour either side."],
  ] as const)("says the moon is passing %s when the fish come on the feed for it", (pass, reason) => {
    vi.mocked(moonPassing).mockReturnValueOnce(pass);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 });
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toContain(reason);
  });

  it.each([
    [WARMING_WAIT, "The water has warmed since yesterday, and the fish wake up to feed."],
    [COOLING_WAIT, "The water has cooled since yesterday, and the sluggish fish bite slow."],
  ])("says the water warmed or cooled since yesterday when the wait is %s times as long", (mul, reason) => {
    vi.mocked(waterSwingWaitMul).mockReturnValueOnce(mul);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 });
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toContain(reason);
  });

  it("says a cast landing in a foam lane draws the fish feeding along it", () => {
    vi.mocked(onFoamLane).mockReturnValueOnce(true);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 });
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toMatch(/^Right in a foam lane, where the wind gathers drowned insects and the fish feed along it\. /);
  });

  it.each([
    ["Popper", /^Over the duckweed, where the bass lurk in its shade for a lure on top\. /],
    ["Spinner", /^Into the duckweed: the lure comes through bearded with weed, and the fish turn from it\. /],
  ])("says how a %s cast into the duckweed fishes", (lure, line) => {
    vi.mocked(inDuckweed).mockReturnValueOnce(true);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 }, "day", false, lure);
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toMatch(line);
  });

  it("says a cast among the spring tadpoles draws the fish gorging on them, and lets one take the bite", () => {
    vi.mocked(amongTadpoles).mockReturnValueOnce(true);
    vi.mocked(tadpoleEater).mockReturnValueOnce(FISH.find((fish) => fish.id === "perch")!);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "golden-shiner")!);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 });
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toMatch(/^Among the tadpoles in the warm shallows, where the fish come to gorge on them\. /);
    expect(tadpoleEater).toHaveBeenCalledWith("dock", undefined, expect.objectContaining({ lifetimePoints: 700 }), "day");
    expect(container!.querySelector("[data-testid=bite]")?.textContent).toMatch(/^perch\|/);
  });

  it("says a popper among the surface bugs draws the fish looking up for them, and lets one take the bite", () => {
    vi.mocked(amongSurfaceBugs).mockReturnValueOnce(true);
    vi.mocked(bugSipper).mockReturnValueOnce(FISH.find((fish) => fish.id === "crappie")!);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "golden-shiner")!);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 }, "day", false, "Popper");
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toMatch(/^Among the bugs skating on the surface, where the fish are looking up for them\. /);
    expect(bugSipper).toHaveBeenCalledWith("dock", "Popper", expect.objectContaining({ lifetimePoints: 700 }), "day");
    expect(container!.querySelector("[data-testid=bite]")?.textContent).toMatch(/^crappie\|/);
  });

  it("says a fly under the dusk midges draws the fish rising to them, and lets one take the bite", () => {
    vi.mocked(underMidges).mockReturnValueOnce(true);
    vi.mocked(midgeRiser).mockReturnValueOnce(FISH.find((fish) => fish.id === "bluegill")!);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "golden-shiner")!);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 }, "dusk", false, "Elk hair caddis");
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toContain("Under a cloud of dancing midges, where the fish rise to the ones that fall to the water. ");
    expect(vi.mocked(underMidges).mock.lastCall?.[0]).toBe("dusk");
    expect(midgeRiser).toHaveBeenCalledWith("dock", "Elk hair caddis", expect.objectContaining({ lifetimePoints: 700 }), "dusk");
    expect(container!.querySelector("[data-testid=bite]")?.textContent).toMatch(/^bluegill\|/);
  });

  it("tells a fly among the surface bugs under a midge cloud as the bugs, once", () => {
    vi.mocked(underMidges).mockReturnValue(true);
    vi.mocked(amongSurfaceBugs).mockReturnValue(true);
    try {
      const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 }, "dusk", false, "Elk hair caddis");
      cast(surface);
      expect(hint()).toContain("Among the bugs skating on the surface");
      expect(hint()).not.toMatch(/dancing midges/);
      expect(midgeRiser).not.toHaveBeenCalled();
    } finally {
      vi.mocked(underMidges).mockReturnValue(false);
      vi.mocked(amongSurfaceBugs).mockReturnValue(false);
    }
  });

  it("keeps the midges' line off a lure that isn't a fly", () => {
    vi.mocked(underMidges).mockReturnValue(true);
    try {
      const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 }, "dusk", false, "Popper");
      cast(surface);
      expect(hint()).not.toMatch(/dancing midges/);
      expect(midgeRiser).not.toHaveBeenCalled();
    } finally {
      vi.mocked(underMidges).mockReturnValue(false);
    }
  });

  it("says a jig among the lanterns' minnows draws the fish hunting them, and lets one take the bite", () => {
    vi.mocked(amongLanternMinnows).mockReturnValueOnce(true);
    vi.mocked(lightHunter).mockReturnValueOnce(FISH.find((fish) => fish.id === "walleye")!);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "golden-shiner")!);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 }, "night", false, "Marabou jig");
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toMatch(/^Among the minnows in the lanterns' light, where the crappie, walleye and bass hunt them\. /);
    expect(vi.mocked(amongLanternMinnows).mock.lastCall?.[0]).toBe("night");
    expect(lightHunter).toHaveBeenCalledWith("dock", "Marabou jig", expect.objectContaining({ lifetimePoints: 700 }), "night");
    expect(container!.querySelector("[data-testid=bite]")?.textContent).toMatch(/^walleye\|/);
  });

  it("keeps the minnows' line off bait cast into the light", () => {
    vi.mocked(amongLanternMinnows).mockReturnValue(true);
    try {
      const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 }, "night", false, "Nightcrawlers");
      cast(surface);
      expect(hint()).not.toMatch(/Among the minnows/);
      expect(lightHunter).not.toHaveBeenCalled();
    } finally {
      vi.mocked(amongLanternMinnows).mockReturnValue(false);
    }
  });

  it("keeps the bugs' line off a sinking lure cast among them", () => {
    vi.mocked(amongSurfaceBugs).mockReturnValue(true);
    try {
      const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 }, "day", false, "#5 Mepps");
      cast(surface);
      expect(hint()).not.toMatch(/Among the bugs/);
      expect(bugSipper).not.toHaveBeenCalled();
    } finally {
      vi.mocked(amongSurfaceBugs).mockReturnValue(false);
    }
  });

  it("says a cast tight to the sunken log draws the fish holding under it, and lets one take the bite", () => {
    vi.mocked(tightToLog).mockReturnValueOnce(true);
    vi.mocked(logHolder).mockReturnValueOnce(FISH.find((fish) => fish.id === "crappie")!);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "golden-shiner")!);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 });
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toMatch(/^Tight to the sunken log, where the fish hold in its shade\. /);
    expect(logHolder).toHaveBeenCalledWith("dock", undefined, expect.objectContaining({ lifetimePoints: 700 }), "day");
    expect(container!.querySelector("[data-testid=bite]")?.textContent).toMatch(/^crappie\|/);
  });

  it("says a cast over the kingfisher's fry draws the fish hunting them, and lets one take the bite", () => {
    vi.mocked(overKingfisherFry).mockReturnValueOnce(true);
    vi.mocked(fryHunter).mockReturnValueOnce(FISH.find((fish) => fish.id === "smallmouth-bass")!);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "golden-shiner")!);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 });
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toMatch(/^Over the fry the kingfisher dives on, where the perch and bass hunt them too\. /);
    expect(fryHunter).toHaveBeenCalledWith("dock", undefined, expect.objectContaining({ lifetimePoints: 700 }), "day");
    expect(container!.querySelector("[data-testid=bite]")?.textContent).toMatch(/^smallmouth-bass\|/);
  });

  it("says a jig hopped over the crayfish by the pilings draws their hunters, and lets one take the bite", () => {
    vi.mocked(onCrayfishBed).mockReturnValueOnce(true);
    vi.mocked(crayfishHunter).mockReturnValueOnce(FISH.find((fish) => fish.id === "catfish")!);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "golden-shiner")!);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 }, "day", false, "Green pumpkin tube");
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toMatch(/^Hopped over the crayfish by the pilings, where the smallmouth and catfish hunt them\. /);
    expect(crayfishHunter).toHaveBeenCalledWith("dock", "Green pumpkin tube", expect.objectContaining({ lifetimePoints: 700 }), "day");
    expect(container!.querySelector("[data-testid=bite]")?.textContent).toMatch(/^catfish\|/);
  });

  it("draws no crayfish hunter to a lure that isn't a jig", () => {
    vi.mocked(onCrayfishBed).mockReturnValueOnce(true);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 }, "day", false, "Nightcrawler");
    cast(surface);
    expect(hint()).not.toContain("crayfish");
    expect(crayfishHunter).not.toHaveBeenCalled();
  });

  it("says a cast onto the sunfish beds draws the raiders, and lets one take the bite", () => {
    vi.mocked(onSunfishBed).mockReturnValueOnce(true);
    vi.mocked(bedRaider).mockReturnValueOnce(FISH.find((fish) => fish.id === "smallmouth-bass")!);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "golden-shiner")!);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 });
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toMatch(/^On the sunfish beds, where the perch and smallmouth come to raid the eggs\. /);
    expect(bedRaider).toHaveBeenCalledWith("dock", undefined, expect.objectContaining({ lifetimePoints: 700 }), "day");
    expect(container!.querySelector("[data-testid=bite]")?.textContent).toMatch(/^smallmouth-bass\|/);
  });

  it("draws no raider off the beds", () => {
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 });
    cast(surface);
    expect(bedRaider).not.toHaveBeenCalled();
  });

  it("says a cast tight to the lily pads lands where the bass and pike wait, but not once the pads die back in winter", () => {
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 }, "day", false, "Popper", undefined, undefined, "summer");
    surface.dataset.stance = "point";
    surface.dataset.angler = "-5.6,12.2";
    surface.dataset.aim = "-6.8,4.8";
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toMatch(/^Tight to the lily pads, where the bass and pike wait in ambush\. /);
    // The fish it hooks dives for the pad stems, so the fight off the Point's rocks is a weed fight.
    act(() => vi.advanceTimersByTime(2_201));
    act(() => surface.dispatchEvent(pointer("pointerdown")));
    expect(phase()).toBe("fight:none");
    expect(vi.mocked(makeFight).mock.calls.at(-1)?.[5]).toBe("weeds");
    act(() => root!.unmount());
    container!.remove();
    const winter = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 }, "day", false, "Popper", undefined, undefined, "winter");
    winter.dataset.stance = "point";
    winter.dataset.angler = "-5.6,12.2";
    winter.dataset.aim = "-6.8,4.8";
    cast(winter);
    expect(hint()).not.toContain("lily pads");
  });

  it("says the breeze pushes the food onto a bank it blows onto", () => {
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 }, "day", false, undefined, "light-north");
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toContain("The breeze blows onto this bank and pushes the food in, and the fish follow it.");
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

  it("tells the anchor's splash first, ahead of the other slow reasons, so the two-reason cap keeps it", () => {
    vi.mocked(openGlareWaitMul).mockReturnValueOnce(OPEN_GLARE_WAIT);
    vi.mocked(springShallowsWaitMul).mockReturnValueOnce(SPRING_SHALLOWS_WAIT);
    vi.mocked(anchorSplashWaitMul).mockReturnValueOnce(ANCHOR_SPLASH_WAIT);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 });
    surface.dataset.stance = "dropoff";
    surface.dataset.angler = "15.4,7.8";
    surface.dataset.aim = "15.4,-5.4";
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toMatch(/^The anchor's splash put the fish down, so the bites come slow: give it a few seconds before you cast\. /);
  });

  it("has a giant that broke free learn the lure, and not take it again this week", () => {
    const kind = FISH.find((fish) => fish.spots.includes("dock") && fish.rarity !== "common" && fish.rarity !== "legendary" && canLand(profile, fish))!;
    harnessGiants.current = [{ spot: "dock", name: "Tarnish", speciesId: kind.id, weight: kind.maxWeight }];
    const message = () => container!.querySelector("[data-testid=broke]")?.textContent;
    try {
      const surface = mount(DOCK_BUBBLES.at, profile, "day", false, "Mepps spinner");
      vi.spyOn(Math, "random").mockReturnValue(0);
      step.mockReturnValueOnce("snapped");
      castAndFight(surface, 1);
      expect(message()).toContain("Tarnish knows the Mepps spinner now, and won't take one again this week.");
      act(() => (container!.querySelector("button:not([data-thumb-strike]):not([data-steer])") as HTMLButtonElement).click());
      // Still about, and the cast's every roll a sure one, yet the giant will not take the same lure, fresh or again.
      step.mockReturnValueOnce("snapped");
      castAndFight(surface, 2);
      expect(message()).not.toContain("Tarnish");
    } finally {
      harnessGiants.current = [];
      vi.mocked(Math.random).mockRestore();
      try {
        localStorage.removeItem(giantShyKey(profile.userId));
      } catch {
        // No store in this run, so nothing was kept.
      }
    }
  });

  it("brings up a trophy another angler lost here, names them, and lands it for the lodge to pay", () => {
    harnessLost.current = [{ id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", speciesId: "pike", weight: 14.5, spot: "dock", at: "2026-10-19T10:00:00.000Z", by: "Mara" }];
    const strong = { ...profile, strength: 10, accuracy: 10 };
    try {
      const surface = mount(DOCK_BUBBLES.at, strong, "day", false, "Pheasant tails");
      step.mockReturnValueOnce("landed");
      castAndFight(surface, 1);
      expect(phase()).toBe("result:landed");
      expect(container!.querySelector("[data-testid=lost-from]")?.textContent).toBe("Mara");
      // It has felt the hook before, so its first run doesn't tire it.
      expect(vi.mocked(makeFight).mock.lastCall?.at(-1)).toMatchObject({ fired: true });
      expect(container!.querySelector("[data-testid=landed-note]")?.textContent).toMatch(/^Northern pike: the trophy Mara lost here\./);
    } finally {
      harnessLost.current = [];
    }
  });

  it("draws a hunted legend at its bank, and says so only when the angler could land it", () => {
    harnessLegend.current = { legendId: "sturgeon", spot: "dropoff" };
    const castAtDropoff = (current: Profile) => {
      const surface = mount(DOCK_BUBBLES.at, current);
      surface.dataset.stance = "dropoff";
      surface.dataset.angler = "15.4,7.8";
      surface.dataset.aim = "15.4,-5.4";
      cast(surface);
      const told = hint();
      act(() => root!.unmount());
      root = null;
      container!.remove();
      return told;
    };
    try {
      expect(castAtDropoff({ ...profile, lifetimePoints: 700, strength: 8, accuracy: 8 })).toContain("The Lake sturgeon your hunt tracked down haunts this water.");
      expect(vi.mocked(pickBite).mock.lastCall?.[11]).toBe("sturgeon");
      expect(castAtDropoff({ ...profile, lifetimePoints: 700, strength: 1, accuracy: 1 })).not.toContain("your hunt tracked down");
    } finally {
      harnessLegend.current = null;
    }
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

  it("says the low sun throws the angler's shadow on the water when the cast's wait comes slower for it", () => {
    vi.mocked(longShadowWaitMul).mockReturnValueOnce(LONG_SHADOW_WAIT);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 });
    surface.dataset.stance = "dropoff";
    surface.dataset.angler = "15.4,7.8";
    surface.dataset.aim = "15.4,-5.4";
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).toContain("The low sun behind you throws your shadow across the water, and the fish shy from it.");
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
    // The reasons left out wait behind the hint's "more reasons" button.
    expect(container!.querySelector("[data-testid=more-reasons]")?.textContent).toContain("The jig hops down the ledge.");
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

  it("tops up a fading swim so more feeders come in, and overfeeds one still well fed", () => {
    const kept = new Map<string, string>([[bagKey(profile.userId), JSON.stringify({ handfuls: 3, day: "2000-01-01" })]]);
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    const at = DOCK_BUBBLES.at - 60_000;
    kept.set(swimKey(profile.userId), JSON.stringify({ spot: "dock", casts: 2, at }));
    let surface = mount();
    toss();
    expect(groundbait()).toBe(`2|dock:${2 + GROUNDBAIT_CASTS}`);
    expect(hint()).toBe(`You top up the swim as it fades: the feeders stay, and more come in. ${2 + GROUNDBAIT_CASTS} casts of it now.`);
    // The fresh handful restarts how long the swim lasts.
    const topped = JSON.parse(kept.get(swimKey(profile.userId))!);
    expect(topped).toMatchObject({ spot: "dock", casts: 2 + GROUNDBAIT_CASTS, built: 1 });
    expect(topped.at).toBeGreaterThan(at);
    cast(surface);
    expect(groundbaitFeeder).toHaveBeenLastCalledWith("dock", undefined, false, "day", Math.random, 1, false);
    expect(hint()).toContain("Over the groundbait.");

    act(() => root!.unmount());
    root = null;
    container!.remove();
    vi.mocked(groundbaitFeeder).mockClear();
    surface = mount();
    toss();
    expect(groundbait()).toBe(`1|dock:${2 * GROUNDBAIT_CASTS}`);
    expect(hint()).toBe(`Too much too soon: the fish fill up on it, so the next ${OVERFED_CASTS} casts bite slower and no feeders take. ${2 * GROUNDBAIT_CASTS} casts of it now.`);
    cast(surface);
    expect(hint()).toContain("Over the groundbait, but the fish are still full from it.");
    expect(groundbaitFeeder).not.toHaveBeenCalled();
    expect(JSON.parse(kept.get(swimKey(profile.userId))!)).toMatchObject({ casts: 2 * GROUNDBAIT_CASTS - 1, built: 1, full: OVERFED_CASTS - 1 });
  });

  it("lets a feeder gathered on the groundbait take the bite", () => {
    const surface = mount();
    vi.mocked(groundbaitFeeder).mockReturnValueOnce(FISH.find((fish) => fish.id === "carp")!);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "perch")!);
    toss();
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(groundbaitFeeder).toHaveBeenCalledWith("dock", undefined, false, "day", Math.random, 0, false);
    expect(container!.querySelector("[data-testid=bite]")?.textContent).toMatch(/^carp\|/);
    // Landed, the card says the groundbait drew it in.
    step.mockReturnValueOnce("landed");
    act(() => vi.advanceTimersByTime(2_201));
    act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
    act(() => frames.at(-1)!(now));
    expect(phase()).toBe("result:landed");
    expect(container!.querySelector("[data-testid=landed-note]")?.textContent).toBe("Common carp: it came in to feed on the groundbait.");
  });

  it("lands the day's first handful on a bank baited days running as built once, and says how many days it has been", () => {
    const kept = new Map<string, string>([[bagKey(profile.userId), JSON.stringify({ handfuls: 3, day: "2000-01-01" })]]);
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    const daysAgo = (n: number) => {
      const day = new Date(DOCK_BUBBLES.at);
      day.setDate(day.getDate() - n);
      return localDate(day);
    };
    kept.set(prebaitKey(profile.userId), JSON.stringify({ spot: "dock", day: daysAgo(1), days: 1 }));
    mount();
    toss();
    expect(hint()).toContain(`Day 2 running you bait this bank: from day ${PREBAIT_DAYS} its feeders start to expect it.`);
    expect(JSON.parse(kept.get(swimKey(profile.userId))!).built).toBeUndefined();
    expect(JSON.parse(kept.get(prebaitKey(profile.userId))!)).toEqual({ spot: "dock", day: daysAgo(0), days: 2 });

    act(() => root!.unmount());
    root = null;
    container!.remove();
    kept.delete(swimKey(profile.userId));
    kept.set(prebaitKey(profile.userId), JSON.stringify({ spot: "dock", day: daysAgo(1), days: PREBAIT_DAYS - 1 }));
    const surface = mount();
    toss();
    expect(hint()).toContain(`Day ${PREBAIT_DAYS} running you bait this bank: its feeders expect it now and come straight in, as after a top-up.`);
    expect(JSON.parse(kept.get(swimKey(profile.userId))!)).toMatchObject({ spot: "dock", casts: GROUNDBAIT_CASTS, built: 1 });
    cast(surface);
    expect(groundbaitFeeder).toHaveBeenLastCalledWith("dock", undefined, false, "day", Math.random, 1, false);
    // A second fresh handful the same day is not the day's first: it lands as any other.
    kept.delete(swimKey(profile.userId));
    act(() => root!.unmount());
    root = null;
    container!.remove();
    mount();
    toss();
    expect(hint()).not.toContain("running you bait this bank");
    expect(JSON.parse(kept.get(swimKey(profile.userId))!).built).toBeUndefined();

    // A day's first handful that tops up a swim left from yesterday leaves the build for the day's first fresh one.
    act(() => root!.unmount());
    root = null;
    container!.remove();
    kept.set(bagKey(profile.userId), JSON.stringify({ handfuls: 3, day: daysAgo(0) }));
    kept.set(prebaitKey(profile.userId), JSON.stringify({ spot: "dock", day: daysAgo(1), days: PREBAIT_DAYS - 1 }));
    kept.set(swimKey(profile.userId), JSON.stringify({ spot: "dock", casts: 1, at: DOCK_BUBBLES.at - 60_000 }));
    mount();
    toss();
    expect(JSON.parse(kept.get(swimKey(profile.userId))!).built).toBe(1);
    kept.delete(swimKey(profile.userId));
    act(() => root!.unmount());
    root = null;
    container!.remove();
    mount();
    toss();
    expect(hint()).toContain(`Day ${PREBAIT_DAYS} running you bait this bank: its feeders expect it now`);
    expect(JSON.parse(kept.get(swimKey(profile.userId))!)).toMatchObject({ casts: GROUNDBAIT_CASTS, built: 1 });
  });

  it("draws the big feeders in on the swim's last top-up, and says so on the card", () => {
    const kept = new Map<string, string>([[bagKey(profile.userId), JSON.stringify({ handfuls: 3, day: "2000-01-01" })]]);
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    kept.set(swimKey(profile.userId), JSON.stringify({ spot: "dock", casts: 2, built: TOPUP_MAX - 1, at: DOCK_BUBBLES.at - 60_000 }));
    const surface = mount();
    toss();
    expect(hint()).toBe(`You top up the swim again as it fades: the feeders stay, and the big ones move in. ${2 + GROUNDBAIT_CASTS} casts of it now.`);
    vi.mocked(groundbaitFeeder).mockReturnValueOnce(FISH.find((fish) => fish.id === "carp")!);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "perch")!);
    cast(surface);
    expect(groundbaitFeeder).toHaveBeenLastCalledWith("dock", undefined, false, "day", Math.random, TOPUP_MAX, false);
    step.mockReturnValueOnce("landed");
    act(() => vi.advanceTimersByTime(2_201));
    act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
    act(() => frames.at(-1)!(now));
    expect(phase()).toBe("result:landed");
    expect(container!.querySelector("[data-testid=landed-note]")?.textContent).toBe("Common carp: the big feeders have moved in on the built-up swim.");
    // Landed, the swim stays built.
    expect(JSON.parse(kept.get(swimKey(profile.userId))!)).toMatchObject({ built: TOPUP_MAX });
    expect(JSON.parse(kept.get(swimKey(profile.userId))!).spooked).toBeUndefined();
  });

  it("scatters a built swim's feeders when a big feeder hooked over it snaps off, and no feeder takes for the next casts", () => {
    const kept = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    kept.set(swimKey(profile.userId), JSON.stringify({ spot: "dock", casts: 6, built: TOPUP_MAX, at: DOCK_BUBBLES.at - 60_000 }));
    const surface = mount();
    vi.mocked(groundbaitFeeder).mockReturnValueOnce(FISH.find((fish) => fish.id === "carp")!);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "perch")!);
    step.mockReturnValueOnce("snapped");
    castAndFight(surface, 1);
    expect(phase()).toBe("idle:broke");
    expect(container!.querySelector("[data-testid=broke]")?.textContent).toContain(`Its thrashing scattered the feeders off the swim: none take for the next ${SPOOKED_SWIM_CASTS} casts, and it needs building up again.`);
    const scattered = JSON.parse(kept.get(swimKey(profile.userId))!);
    expect(scattered).toMatchObject({ spot: "dock", casts: 5, spooked: SPOOKED_SWIM_CASTS });
    expect(scattered.built).toBeUndefined();
    vi.mocked(groundbaitFeeder).mockClear();
    cast(surface);
    expect(groundbaitFeeder).not.toHaveBeenCalled();
    expect(hint()).toContain("Over the groundbait, but its feeders are still scattered.");
    expect(JSON.parse(kept.get(swimKey(profile.userId))!)).toMatchObject({ casts: 4, spooked: SPOOKED_SWIM_CASTS - 1 });
  });

  it("scatters the swim when a big feeder throws the hook too, and the scatter outlasts a reload", () => {
    const kept = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    kept.set(swimKey(profile.userId), JSON.stringify({ spot: "dock", casts: 6, built: TOPUP_MAX, at: DOCK_BUBBLES.at - 60_000 }));
    let surface = mount();
    vi.mocked(groundbaitFeeder).mockReturnValueOnce(FISH.find((fish) => fish.id === "catfish")!);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "perch")!);
    step.mockReturnValueOnce("escaped");
    castAndFight(surface, 1);
    expect(container!.querySelector("[data-testid=broke]")?.textContent).toContain("Its thrashing scattered the feeders off the swim");
    act(() => root!.unmount());
    root = null;
    container!.remove();
    vi.mocked(groundbaitFeeder).mockClear();
    surface = mount();
    cast(surface);
    expect(groundbaitFeeder).not.toHaveBeenCalled();
    expect(hint()).toContain("Over the groundbait, but its feeders are still scattered.");
  });

  it("scatters a built swim when a carp drawn the usual way over it snaps off", () => {
    const kept = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    kept.set(swimKey(profile.userId), JSON.stringify({ spot: "dock", casts: 6, built: TOPUP_MAX, at: DOCK_BUBBLES.at - 60_000 }));
    const surface = mount();
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "carp")!);
    step.mockReturnValueOnce("snapped");
    castAndFight(surface, 1);
    expect(container!.querySelector("[data-testid=broke]")?.textContent).toContain("Its thrashing scattered the feeders off the swim");
    expect(JSON.parse(kept.get(swimKey(profile.userId))!)).toMatchObject({ casts: 5, spooked: SPOOKED_SWIM_CASTS });
  });

  it("leaves a built swim as it was when the fish lost over it is not a big feeder", () => {
    const kept = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    kept.set(swimKey(profile.userId), JSON.stringify({ spot: "dock", casts: 6, built: TOPUP_MAX, at: DOCK_BUBBLES.at - 60_000 }));
    const surface = mount();
    vi.mocked(groundbaitFeeder).mockReturnValueOnce(FISH.find((fish) => fish.id === "bluegill")!);
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "perch")!);
    step.mockReturnValueOnce("escaped");
    castAndFight(surface, 1);
    expect(phase()).toBe("idle:broke");
    expect(container!.querySelector("[data-testid=broke]")?.textContent).not.toContain("scattered");
    expect(JSON.parse(kept.get(swimKey(profile.userId))!)).toMatchObject({ casts: 5, built: TOPUP_MAX });
  });

  it("keeps the big feeders on a swim already built, when topped up again", () => {
    const kept = new Map<string, string>([[bagKey(profile.userId), JSON.stringify({ handfuls: 3, day: "2000-01-01" })]]);
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    kept.set(swimKey(profile.userId), JSON.stringify({ spot: "dock", casts: 2, built: TOPUP_MAX, at: DOCK_BUBBLES.at - 60_000 }));
    mount();
    toss();
    expect(hint()).toBe(`You top up the swim as it fades: the feeders stay, the big ones too. ${2 + GROUNDBAIT_CASTS} casts of it now.`);
  });

  it("casts the tied lure at the bank's let-go fish, so one shy of it stays down", () => {
    cast(mount(DOCK_BUBBLES.at, profile, "day", false, "Mepps spinner"));
    expect(castForReleased).toHaveBeenLastCalledWith([], "dock", expect.any(Number), expect.any(Number), "Mepps spinner");
  });

  it("brings back a fish let go here on an earlier day, grown, and says so on the card", () => {
    const surface = mount();
    const pike = FISH.find((fish) => fish.id === "pike")!;
    const at = new Date(2026, 9, 4, 12).getTime();
    vi.mocked(castForReleased).mockReturnValueOnce({ fish: { species: pike, weight: 6.5, was: 6, at }, next: [] });
    cast(surface);
    expect(castForReleased).toHaveBeenCalledWith([], "dock", expect.any(Number), expect.any(Number), undefined);
    expect(container!.querySelector("[data-testid=bite]")?.textContent).toMatch(/^pike\|6\.5/);
    step.mockReturnValueOnce("landed");
    act(() => vi.advanceTimersByTime(2_201));
    act(() => surface.dispatchEvent(pointer("pointerdown", 2)));
    act(() => frames.at(-1)!(now));
    expect(phase()).toBe("result:landed");
    expect(container!.querySelector("[data-testid=landed-note]")?.textContent).toBe("Northern pike: you let this one go here on October 4, and it has put on 0.5 lb since.");
  });

  it("leaves the drawn fish to bite off the groundbait", () => {
    const surface = mount();
    vi.mocked(pickBite).mockReturnValueOnce(FISH.find((fish) => fish.id === "perch")!);
    cast(surface);
    expect(groundbaitFeeder).not.toHaveBeenCalled();
    expect(container!.querySelector("[data-testid=bite]")?.textContent).toMatch(/^perch\|/);
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

describe("useFishingGame pressure", () => {
  // Cast, let the bite come and go unstruck, and clear the miss for the next cast at the same bank.
  const castAndReset = (surface: HTMLDivElement) => {
    cast(surface);
    const waited = hint();
    for (let ms = 0; ms < 60_000 && !phase()?.startsWith("result"); ms += 50) act(() => vi.advanceTimersByTime(50));
    act(() => (container!.querySelector("button:not([data-thumb-strike]):not([data-steer])") as HTMLButtonElement).click());
    return waited;
  };

  it("makes a bank fished too long slow to bite, says to try another, and rests it while the angler fishes elsewhere", () => {
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 });
    const hints = Array.from({ length: PRESSURE_CASTS - 1 }, () => castAndReset(surface));
    // The stance chip hears of it before the cast that meets the wary fish.
    expect(container!.querySelector("[data-testid=fished-hard]")?.textContent).toBe("");
    hints.push(castAndReset(surface));
    expect(container!.querySelector("[data-testid=fished-hard]")?.textContent).toBe("dock");
    hints.push(castAndReset(surface));
    expect(hints.slice(0, PRESSURE_CASTS).some((line) => line?.includes("fished hard"))).toBe(false);
    expect(hints.at(-1)).toContain("This water has been fished hard");
    expect(container!.querySelector("[data-testid=fished-hard]")?.textContent).toBe("dock");
    // A cast at another bank rests the dock a little, so it is no longer fished hard.
    const dock = { ...surface.dataset };
    surface.dataset.stance = "dropoff";
    surface.dataset.angler = "15.4,7.8";
    surface.dataset.aim = "15.4,-5.4";
    expect(castAndReset(surface)).not.toContain("fished hard");
    expect(container!.querySelector("[data-testid=fished-hard]")?.textContent).toBe("");
    // But one cast away is not enough: back at the dock its fish soon grow wary again.
    Object.assign(surface.dataset, dock);
    expect(castAndReset(surface)).not.toContain("fished hard");
    expect(container!.querySelector("[data-testid=fished-hard]")?.textContent).toBe("dock");
    expect(castAndReset(surface)).toContain("This water has been fished hard");
  });
});

describe("useFishingGame fresh water", () => {
  it("bites sooner on the visit's first cast at a bank and says why, but not on the next cast there", async () => {
    const actual = await vi.importActual<typeof import("./logic")>("./logic");
    vi.mocked(castOnFreshWater).mockImplementation(actual.castOnFreshWater);
    const surface = mount(DOCK_BUBBLES.at, { ...profile, lifetimePoints: 700 });
    cast(surface);
    expect(hint()).toContain("Fresh water: the fish here haven't seen a lure today.");
    for (let ms = 0; ms < 60_000 && !phase()?.startsWith("result"); ms += 50) act(() => vi.advanceTimersByTime(50));
    act(() => (container!.querySelector("button:not([data-thumb-strike]):not([data-steer])") as HTMLButtonElement).click());
    cast(surface);
    expect(phase()).toBe("waiting:none");
    expect(hint()).not.toContain("Fresh water");
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
