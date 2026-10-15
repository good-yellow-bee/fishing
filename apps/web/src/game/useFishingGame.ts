import { useCallback, useEffect, useRef, useState } from "react";
import {
  hotBankForDay,
  anglerLevel,
  fishTireMulForLevel,
  INLET_LEVEL,
  canLand,
  isFishingStance,
  lakeHour,
  parseAim,
  parseStance,
  resolveCast,
  SPOT_LABELS,
  type CastFail,
  type FishSpecies,
  type LakeHour,
  type LakeSeason,
  type Profile,
  type Sky,
  type SpotId,
  type StanceId,
} from "@stillwater/shared";
import { locale, t } from "../i18n";
import { fightLines, isCleanFight, isCloseCall, makeFight, SOLID_HOOK_STAMINA, steerSide, type FightPerformance, type FightRuntime, type FightSim, type Steer, type SurgeState } from "./fight";
import { fightInput } from "./scene/fightMotion";
import { settings } from "./settings";
import { dragTone } from "./dragTone";
import { fx } from "./fx";
import { whenShown } from "./whenShown";
import { isRiseCast } from "./eveningRise";
import { castSnags, SNAG_AT_MS, SNAG_TAPS } from "./snag";
import { HOTSPOT_PERIOD_MS, hotspotAt, isHotspotCast, type Hotspot } from "./hotspot";
import { BACKLASH_POWER, hookWindowMs, isPerfectCast, makeCatch, pickBite, SLAP_POWER, solidStrikeMs, sweetBand, waitMs } from "./logic";
import { localId } from "./localId";
import { biteStyle, nibblePlan, type BiteStyle } from "./nibblePlan";
import type { ScenePhase } from "./scene/types";

/** How long a result stays up before a click or Space can cast straight past it. */
export const RECAST_GUARD_MS = 450;

export type AimHint = SpotId | "shore";

function castFailHint(reason: CastFail, stance?: StanceId): string {
  // Only the inlet stance locks with its own words; the drop-off's are the defaults.
  if (reason === "locked" && stance === "inlet") return t("The inlet opens at level {level}. Fish the other banks for now.", { level: INLET_LEVEL });
  switch (reason) {
    case "stance":
      return t("Walk to the water to fish.");
    case "range":
      return t("Too far for this bank. Walk closer.");
    case "basin":
      return t("Wrong water from here. Walk to that bank.");
    case "locked":
      return t("Drop-off unlocks at level 3. Cast closer in, or toward the reeds.");
    default:
      return t("Bait landed on shore. Aim at the water.");
  }
}

function castMiss(reason: CastFail, stance: StanceId): string {
  if (reason === "locked" && stance === "inlet") return t("The inlet is closed until level {level}.", { level: INLET_LEVEL });
  switch (reason) {
    case "locked":
      return t("Drop-off is too deep until level 3.");
    case "basin":
      return t("Wrong water from here.");
    case "range":
      return t("The lure fell short.");
    case "stance":
      return t("Walk to a bank first.");
    default:
      return t("Missed the lake.");
  }
}

function hintFromDataset(raw: string | undefined): AimHint | null {
  if (raw === "dock" || raw === "reeds" || raw === "dropoff" || raw === "point" || raw === "inlet" || raw === "open" || raw === "shore") return raw;
  return null;
}

export function touchScreen() {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.("(pointer: coarse)").matches);
}

export function idleHint(stance: StanceId | null, touch = touchScreen()) {
  if (stance === "shop") {
    return touch
      ? t("Tap Open shop to visit the tackle shack. Walk down to the water to fish.")
      : t("Open the tackle shack with E or the Open shop button. Walk down to the water to fish.");
  }
  if (stance && isFishingStance(stance)) {
    return touch
      ? t("Touch the water to aim. Hold to charge, lift in the moss band.")
      : t("Click the water to aim. Hold to charge, release in the moss band.");
  }
  return t("Walk to the water.");
}

/** Hints after a cast ends or goes wrong, worded for a mouse and keyboard or for a finger. */
export function castHint(kind: "landed" | "cancelled" | "overpowered" | "ring", touch = touchScreen()) {
  switch (kind) {
    case "landed":
      return touch ? t("Landed. Touch the water to cast again.") : t("Landed. Click the water or hold Space to cast again.");
    case "cancelled":
      return touch ? t("Cast cancelled. Touch the water to try again.") : t("Cast cancelled. Click the water or hold Space to try again.");
    case "overpowered":
      return touch ? t("Overpowered. Lift in the band.") : t("Overpowered. Release in the band.");
    case "ring":
      return touch ? t("Keep the ring on the water. Lift in the moss band.") : t("Keep the ring on the water. Release in the moss band.");
  }
}

export type Fight = {
  species: FishSpecies;
  weight: number;
  underpowered: boolean;
};

/** How the angler played this fish, for a line on the landed card. */
/** cleanRun counts this clean fight and the clean ones landed right before it this session; 0 when this one was not clean. */
export type FightNotes = { perfectCast: boolean; hookedSolid: boolean; turnedRuns: number; cleanRun?: number; closeCall?: boolean; fightSec?: number };

export type Outcome =
  | { kind: "landed"; id: string; species: FishSpecies; weight: number; spot: SpotId; clean: boolean; notes?: FightNotes }
  | { kind: "broke"; message: string }
  | { kind: "miss"; message: string; fish?: { species: FishSpecies; weight: number } }
  | { kind: "error"; message: string };

type Timers = {
  wait?: number;
  hook?: number;
  snap?: number;
  nibbles?: number[];
  snag?: number;
  /** Cancels a bite held back while the page is hidden. */
  shown?: () => void;
};

/** The bite call fits how the fish took the bait: a predator slams it, a bottom feeder draws it away. */
function strikeCall(style: BiteStyle) {
  if (style === "ambush") return t("WHAM — it hit! Strike!");
  if (style === "mouth") return t("It's taking it — strike!");
  return t("NOW — strike!");
}

/** How long a bottom feeder that dropped the bait takes to come back for its second take. */
export const SECOND_TAKE_MS = 1800;
/** The twitch of the float halfway through that wait. */
export const SECOND_TAKE_NIBBLE_MS = 300;

const waitHint = () => t("Watch the bobber. Strike on the real dip, not a nibble.");
const hotspotWaitHint = () => t("Your lure is in the bubbles. Watch the bobber — strike on the real dip.");
const shortCastHint = () => t("Short cast — only small fish will look.");

function movedHint(spot: SpotId) {
  return t("The bubbles moved to the {spot}.", { spot: t(SPOT_LABELS[spot]) });
}

export function useFishingGame(
  profile: Profile | null,
  hour: LakeHour = lakeHour(),
  lureRef?: { readonly current: string },
  sky?: Sky,
  /** A new angler's easy first fish (see `isMercy`). */
  mercy = false,
  season?: LakeSeason,
  /** The moon's lit share, 0 new to 1 full. */
  moon?: number,
  /** An evening rise is on: a cast onto a fresh ring bites sooner. */
  rising = false,
) {
  const risingRef = useRef(rising);
  risingRef.current = rising;
  const castRiseRef = useRef(false);
  /** The last cast landed in the middle of the sweet band. */
  const castPerfectRef = useRef(false);
  /** The hook went in solid on a quick strike. */
  const hookedSolidRef = useRef(false);
  /** Clean fights landed in a row this session; a dirty landing or a lost fish starts it again. */
  const cleanRunRef = useRef(0);
  const castSnagRef = useRef(false);
  /** Taps so far on a snagged lure, and the bite timers it is holding back; null while the lure is free. */
  const snagRef = useRef<{ taps: number; arm: () => void } | null>(null);
  const mercyRef = useRef(mercy);
  mercyRef.current = mercy;
  const surfaceRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<ScenePhase>("idle");
  const powerRef = useRef(0);
  const holdingRef = useRef(false);
  const holdStartRef = useRef(0);
  const castPointerRef = useRef<number | null>(null);
  const biteRef = useRef<{ species: FishSpecies; weight: number } | null>(null);
  /** When the bite's strike window opened, and how long it stays open. */
  const biteWindowRef = useRef({ at: 0, ms: 0 });
  const fightRef = useRef<Fight | null>(null);
  const runtimeRef = useRef<FightRuntime | null>(null);
  const simRef = useRef<FightSim | null>(null);
  const performanceRef = useRef<FightPerformance | null>(null);
  const reelKeyRef = useRef(false);
  const reelPointerRef = useRef<number | null>(null);
  /** Rod pulled left or right against a run: from ← → / A D (and a pad's stick) or a held side button. */
  const steerKeysRef = useRef({ left: false, right: false });
  const steerPointerRef = useRef<{ id: number; side: -1 | 1 } | null>(null);
  /** Toggle reel mode: on until the next press. */
  const reelLatchRef = useRef(false);
  /** In toggle mode a press flips reeling; the press that set the hook always starts it. */
  const latchReel = (striking: boolean) => {
    reelLatchRef.current = striking ? true : !reelLatchRef.current;
  };
  const spotRef = useRef<SpotId>("dock");
  const hotspotRef = useRef<Hotspot | null>(null);
  const castHotspotRef = useRef(false);
  const movedUnheardRef = useRef(false);
  const aimHintRef = useRef<AimHint>("dock");
  const stanceRef = useRef<StanceId>("shop");
  const timers = useRef<Timers>({});
  const waitHintRef = useRef("");
  const resultAtRef = useRef(0);
  const [phase, setPhase] = useState<ScenePhase>("idle");
  const [spot, setSpot] = useState<SpotId>("dock");
  const [aimHint, setAimHint] = useState<AimHint>("dock");
  const [bite, setBite] = useState<{ species: FishSpecies; weight: number } | null>(null);
  const [fight, setFight] = useState<Fight | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [nibble, setNibble] = useState(false);
  const [hint, setHint] = useState(() => t("Walk to the water."));
  const [stance, setStance] = useState<StanceId>("shop");
  const [shopTap, setShopTap] = useState(0);
  const [hotspot, setHotspot] = useState<Hotspot | null>(null);
  const level = profile ? anglerLevel(profile.lifetimePoints) : null;

  const setPhaseBoth = (next: ScenePhase) => {
    if (next === "result" && phaseRef.current !== "result") resultAtRef.current = performance.now();
    phaseRef.current = next;
    setPhase(next);
  };

  const clearTimers = () => {
    window.clearTimeout(timers.current.wait);
    window.clearTimeout(timers.current.hook);
    window.clearTimeout(timers.current.snap);
    timers.current.nibbles?.forEach((id) => window.clearTimeout(id));
    window.clearTimeout(timers.current.snag);
    timers.current.shown?.();
    timers.current = {};
    snagRef.current = null;
  };

  const clearFight = () => {
    biteRef.current = null;
    setBite(null);
    fightRef.current = null;
    runtimeRef.current = null;
    simRef.current = null;
    performanceRef.current = null;
    reelKeyRef.current = false;
    reelPointerRef.current = null;
    reelLatchRef.current = false;
    fightInput.reeling = false;
    steerKeysRef.current = { left: false, right: false };
    steerPointerRef.current = null;
    fightInput.steer = 0;
    fx.drag.stop();
    const surface = surfaceRef.current;
    if (surface) {
      delete surface.dataset.tension;
      delete surface.dataset.line;
      delete surface.dataset.surge;
      delete surface.dataset.nibble;
    }
    setNibble(false);
    setFight(null);
  };

  const resetToIdle = useCallback((message: string, phase: "idle" | "result" = "idle") => {
    clearTimers();
    holdingRef.current = false;
    castPointerRef.current = null;
    castHotspotRef.current = false;
    castRiseRef.current = false;
    castPerfectRef.current = false;
    powerRef.current = 0;
    clearFight();
    setPhaseBoth(phase);
    const moved = phase === "idle" && movedUnheardRef.current ? hotspotRef.current : null;
    if (moved) movedUnheardRef.current = false;
    setHint(moved ? movedHint(moved.spot) : message);
  }, []);

  const beginFight = useCallback((species: FishSpecies, weight: number, current: Profile, strike?: { elapsedMs: number; solidMs: number }) => {
    const solid = strike !== undefined && strike.elapsedMs <= strike.solidMs;
    const underpowered = !canLand(current, species);
    const next = { species, weight, underpowered };
    fightRef.current = next;
    setFight(next);
    setPhaseBoth("fight");
    if (underpowered) {
      setHint(t("This fish is too heavy for your line."));
      timers.current.snap = window.setTimeout(() => {
        fx.snap();
        fx.haptic("snap");
        setOutcome({ kind: "broke", message: t("{fish} snapped the line.", { fish: t(species.name) }) });
        resetToIdle(current.strength < species.minStrength ? t("Line parted. Spend points on Strength.") : t("Line parted. Spend points on Accuracy."));
      }, 1400);
    } else {
      const runtime = makeFight(species, weight, current.strength, Math.random, fishTireMulForLevel(anglerLevel(current.lifetimePoints)));
      runtimeRef.current = runtime;
      simRef.current = runtime.sim;
      performanceRef.current = runtime.performance;
      // A quick strike drives the hook home, so the fish starts the fight a little worn.
      hookedSolidRef.current = solid;
      if (solid) runtime.sim.stamina = Math.min(runtime.sim.stamina, SOLID_HOOK_STAMINA);
      const line = fightLines(species.challenge)[0];
      // The strike's time is told, so the angler learns how quick a solid hook has to be.
      const seconds = (ms: number) => (ms / 1000).toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      setHint(
        !strike
          ? t("{line}. Ease off when it runs.", { line })
          : solid
            ? t("Hooked solid in {time} s! {line}. Ease off when it runs.", { time: seconds(strike.elapsedMs), line })
            : t("Hooked in {time} s (solid under {limit} s). {line}. Ease off when it runs.", {
                time: seconds(strike.elapsedMs),
                limit: seconds(strike.solidMs),
                line,
              }),
      );
    }
  }, [resetToIdle]);

  const setTheHook = useCallback(() => {
    if (phaseRef.current !== "hookset" || !profile) return;
    const bitten = biteRef.current;
    if (!bitten) return;
    window.clearTimeout(timers.current.hook);
    const { at, ms } = biteWindowRef.current;
    const strike = { elapsedMs: Math.max(0, performance.now() - at), solidMs: solidStrikeMs(ms) };
    fx.splash();
    fx.haptic("strike");
    beginFight(bitten.species, bitten.weight, profile, strike);
  }, [beginFight, profile]);

  const startWait = useCallback((current: Profile, short: boolean) => {
    setPhaseBoth("waiting");
    setNibble(false);
    // A short cast only draws commons, even in the bubbles.
    waitHintRef.current = short ? shortCastHint() : waitHint();
    if (castHotspotRef.current) waitHintRef.current = short ? `${shortCastHint()} ${hotspotWaitHint()}` : hotspotWaitHint();
    else if (castRiseRef.current) waitHintRef.current = `${t("Right on a rise.")} ${waitHintRef.current}`;
    if (castPerfectRef.current) waitHintRef.current = `${t("Perfect cast.")} ${waitHintRef.current}`;
    setHint(waitHintRef.current);
    // Roll the fish as the lure sits, so the one rising under the bobber is the one that bites.
    const mercyNow = mercyRef.current;
    const species = pickBite(spotRef.current, current, short, Math.random, hour, lureRef?.current, sky, castHotspotRef.current, mercyNow, season, moon);
    const bitten = makeCatch(species, current.patience, anglerLevel(current.lifetimePoints));
    biteRef.current = bitten;
    setBite(bitten);
    const hotBank = hotBankForDay(new Date()) === spotRef.current;
    const wait = waitMs(current.patience, hour, castHotspotRef.current, anglerLevel(current.lifetimePoints), mercyNow, hotBank, castRiseRef.current, castPerfectRef.current);
    const nibbles = nibblePlan(wait, Math.random, biteStyle(species.id));
    const arm = () => {
      let secondTake = false;
      const nibbleTimers: number[] = [];
      timers.current.nibbles = nibbleTimers;
      const nibbleAt = (at: number, ms: number) => {
        nibbleTimers.push(window.setTimeout(() => {
          if (phaseRef.current !== "waiting") return;
          setNibble(true);
          const surface = surfaceRef.current;
          if (surface) surface.dataset.nibble = "1";
          fx.nibble();
          fx.haptic("nibble");
          // After dark the float is hard to see, so the bell on the rod tip tells it too.
          if (hour === "night") {
            fx.rodBell("jingle");
            setHint(t("The rod bell jingles. Just a nibble, not yet…"));
          }
          nibbleTimers.push(window.setTimeout(() => {
            setNibble(false);
            if (surface) delete surface.dataset.nibble;
          }, ms));
        }, at));
      };
      for (const { at, ms } of nibbles) nibbleAt(at, ms);
      // A bite that comes while the game is out of sight waits for the player to come back, so no fish is lost unseen.
      const takeBait = () => {
        if (phaseRef.current !== "waiting") return;
        setNibble(false);
        fx.bite();
        if (hour === "night") fx.rodBell("ring");
        fx.haptic("bite");
        setPhaseBoth("hookset");
        setHint(strikeCall(biteStyle(species.id)));
        const openWindow = () => {
          const windowMs = hookWindowMs(current.accuracy, mercyNow);
          biteWindowRef.current = { at: performance.now(), ms: windowMs };
          timers.current.hook = window.setTimeout(() => {
            if (phaseRef.current !== "hookset") return;
            // Gone to another tab mid-bite: the fish keeps the bait, and a fresh window opens on the way back.
            if (document.visibilityState === "hidden") {
              timers.current.shown = whenShown(openWindow, document, 0);
              return;
            }
            // A bottom feeder that dropped the bait noses back for one more go before it leaves.
            if (!secondTake && biteStyle(species.id) === "mouth") {
              secondTake = true;
              setPhaseBoth("waiting");
              setHint(t("It dropped the bait but it's still there. Watch for a second take…"));
              // The float twitches as it noses back, so the eye knows where to look.
              nibbleAt(SECOND_TAKE_MS * 0.45, SECOND_TAKE_NIBBLE_MS);
              timers.current.wait = window.setTimeout(() => {
                if (phaseRef.current !== "waiting") return;
                timers.current.shown = whenShown(takeBait);
              }, SECOND_TAKE_MS);
              return;
            }
            // The missed fish stays in the outcome so the turn-away shows the same fish.
            setOutcome({ kind: "miss", message: t("Too slow. The fish dropped the bait."), fish: bitten });
            // Hold result so the miss spring and the turn play out.
            resetToIdle(t("Strike the moment the bobber goes under."), "result");
          }, windowMs);
        };
        openWindow();
      };
      timers.current.wait = window.setTimeout(() => {
        if (phaseRef.current !== "waiting") return;
        timers.current.shown = whenShown(takeBait);
      }, wait);
    };
    if (!castSnagRef.current) {
      arm();
      return;
    }
    // Fouled in the weed: no bite until it is worked free.
    timers.current.snag = window.setTimeout(() => {
      if (phaseRef.current !== "waiting") return;
      snagRef.current = { taps: 0, arm };
      fx.plop();
      fx.haptic("nibble");
      setHint(t("Snagged in the weed. Tap {n} times to work it free.", { n: SNAG_TAPS }));
    }, SNAG_AT_MS);
  }, [hour, lureRef, moon, resetToIdle, season, sky]);

  const releaseCast = useCallback(() => {
    if (phaseRef.current !== "casting" || !profile) return;
    holdingRef.current = false;
    const castPower = Math.min(1, (performance.now() - holdStartRef.current) / 900);
    powerRef.current = castPower;
    fx.cast();
    const surface = surfaceRef.current;
    const aimed = parseAim(surface?.dataset.aim);
    const stanceNow = parseStance(surface?.dataset.stance) ?? "trail";
    const angler = parseAim(surface?.dataset.angler);
    const level = anglerLevel(profile.lifetimePoints);
    const landing = resolveCast(
      aimed?.x ?? Number.NaN,
      aimed?.z ?? Number.NaN,
      stanceNow,
      level,
      angler?.x ?? Number.NaN,
      angler?.z ?? Number.NaN,
    );
    if (!landing.ok) {
      setOutcome({ kind: "miss", message: castMiss(landing.reason, stanceNow) });
      resetToIdle(castFailHint(landing.reason, stanceNow));
      return;
    }
    spotRef.current = landing.spot;
    setSpot(landing.spot);
    setAimHint(landing.spot);
    aimHintRef.current = landing.spot;
    if (castPower < SLAP_POWER) {
      setOutcome({ kind: "miss", message: t("The lure slapped the dock.") });
      resetToIdle(t("Too little power. Hold longer."));
      return;
    }
    if (castPower > BACKLASH_POWER) {
      setOutcome({ kind: "miss", message: t("Backlash. Recast.") });
      resetToIdle(castHint("overpowered"));
      return;
    }
    castHotspotRef.current = aimed !== null && isHotspotCast(hotspotRef.current, aimed.x, aimed.z, landing.spot);
    castRiseRef.current = risingRef.current && aimed !== null && isRiseCast(landing.spot, aimed.x, aimed.z, Date.now());
    castSnagRef.current = aimed !== null && castSnags(landing.spot, aimed.x, aimed.z, mercyRef.current, Math.random());
    castPerfectRef.current = isPerfectCast(castPower, profile.accuracy);
    startWait(profile, castPower < sweetBand(profile.accuracy).min);
  }, [profile, resetToIdle, startWait]);

  const startCast = useCallback((via: "pointer" | "key") => {
    if (!profile || phaseRef.current !== "idle") return;
    const surface = surfaceRef.current;
    // The scene already sent the angler walking to this tap on the shore.
    if (via === "pointer" && surface?.dataset.walk === "1") return;
    const stanceNow = parseStance(surface?.dataset.stance) ?? "trail";
    if (stanceNow === "shop") {
      if (via === "pointer") setShopTap((n) => n + 1);
      else setHint(idleHint("shop"));
      return;
    }
    const aimed = parseAim(surface?.dataset.aim);
    const angler = parseAim(surface?.dataset.angler);
    const preview = resolveCast(
      aimed?.x ?? Number.NaN,
      aimed?.z ?? Number.NaN,
      stanceNow,
      anglerLevel(profile.lifetimePoints),
      angler?.x ?? Number.NaN,
      angler?.z ?? Number.NaN,
    );
    if (!preview.ok) {
      setHint(castFailHint(preview.reason, stanceNow));
      return;
    }
    setOutcome(null);
    holdingRef.current = true;
    holdStartRef.current = performance.now();
    powerRef.current = 0;
    setPhaseBoth("casting");
    setHint(castHint("ring"));
  }, [profile]);

  const strikeOrCast = useCallback((via: "pointer" | "key") => {
    switch (phaseRef.current) {
      case "idle":
        startCast(via);
        break;
      case "hookset":
        setTheHook();
        break;
      case "waiting": {
        const snag = snagRef.current;
        if (!snag) {
          setHint(t("Too early. Wait for the bobber to go under, then strike."));
          break;
        }
        snag.taps += 1;
        fx.reel();
        if (snag.taps < SNAG_TAPS) {
          setHint(t("Working it free… {n} of {total}", { n: snag.taps, total: SNAG_TAPS }));
          break;
        }
        snagRef.current = null;
        waitHintRef.current = t("Free of the weed. Let it settle.");
        setHint(waitHintRef.current);
        snag.arm();
        break;
      }
      case "result":
        // A frantic last click of the fight should not throw away the catch card unread.
        if (performance.now() - resultAtRef.current < RECAST_GUARD_MS) break;
        setOutcome(null);
        {
          // The reset forgets the pointer, but this same press is the cast now.
          const pointerId = castPointerRef.current;
          resetToIdle(idleHint(stanceRef.current));
          castPointerRef.current = pointerId;
        }
        startCast(via);
        break;
    }
  }, [resetToIdle, setTheHook, startCast]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("button, a, input, textarea, select, [contenteditable]")) return;
      const side = steerSide(event.code);
      if (side && phaseRef.current === "fight") {
        event.preventDefault();
        steerKeysRef.current[side < 0 ? "left" : "right"] = true;
        return;
      }
      if (event.code !== "Space" || event.repeat) return;
      event.preventDefault();
      const striking = phaseRef.current !== "fight";
      if (striking) strikeOrCast("key");
      // The same press may have just set the hook — count it as reeling.
      if (phaseRef.current === "fight") {
        reelKeyRef.current = true;
        latchReel(striking);
      }
    };
    const up = (event: KeyboardEvent) => {
      // Let go of a steer key wherever focus went, so the rod never stays pulled.
      const side = steerSide(event.code);
      if (side) steerKeysRef.current[side < 0 ? "left" : "right"] = false;
      if (event.target instanceof HTMLElement && event.target.closest("button, a, input, textarea, select, [contenteditable]")) return;
      if (event.code !== "Space") return;
      reelKeyRef.current = false;
      if (phaseRef.current === "casting") {
        event.preventDefault();
        releaseCast();
      }
    };
    const onBlur = () => {
      reelKeyRef.current = false;
      steerKeysRef.current = { left: false, right: false };
      reelPointerRef.current = null;
      if (phaseRef.current === "casting") resetToIdle(castHint("cancelled"));
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", onBlur);
    };
  }, [releaseCast, resetToIdle, strikeOrCast]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const down = (event: PointerEvent) => {
      if (event.pointerType === "touch" && !event.isPrimary) {
        if (phaseRef.current === "casting") resetToIdle(t("Camera moved. Hold one finger or Space to cast."));
        // The first finger of a camera pinch was not a strike, so take back its "too early" hint.
        if (phaseRef.current === "waiting") setHint(waitHintRef.current);
        return;
      }
      const target = event.target as HTMLElement;
      // The side buttons pull the rod against a run; a second finger may hold one while the first reels.
      const steerButton = target.closest<HTMLElement>("[data-steer]");
      if (steerButton) {
        if (phaseRef.current === "fight") steerPointerRef.current = { id: event.pointerId, side: steerButton.dataset.steer === "-1" ? -1 : 1 };
        return;
      }
      if (!event.isPrimary || event.button !== 0) return;
      // The thumb button is a press on the water that sits under a thumb.
      const thumb = target.closest("[data-thumb-strike]") !== null;
      if (!thumb && target.closest("button, a, input, select, label, [data-camera-control], [data-lure-choice]")) return;
      if (thumb && phaseRef.current !== "waiting" && phaseRef.current !== "hookset" && phaseRef.current !== "fight") return;
      const striking = phaseRef.current !== "fight";
      if (striking) {
        castPointerRef.current = event.pointerId;
        strikeOrCast("pointer");
      }
      // The same press may have just set the hook — count it as reeling.
      if (phaseRef.current === "fight") {
        reelPointerRef.current = event.pointerId;
        latchReel(striking);
      }
    };
    const up = (event: PointerEvent) => {
      if (event.pointerId === reelPointerRef.current) reelPointerRef.current = null;
      if (event.pointerId === steerPointerRef.current?.id) steerPointerRef.current = null;
      if (phaseRef.current === "fight") return;
      if (event.pointerId !== castPointerRef.current) return;
      castPointerRef.current = null;
      if (phaseRef.current === "casting") releaseCast();
    };
    const cancel = (event: PointerEvent) => {
      if (event.pointerId === reelPointerRef.current) reelPointerRef.current = null;
      if (event.pointerId === steerPointerRef.current?.id) steerPointerRef.current = null;
      if (phaseRef.current === "fight") return;
      if (event.pointerId !== castPointerRef.current) return;
      resetToIdle(castHint("cancelled"));
    };
    surface.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    return () => {
      surface.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
    };
  }, [releaseCast, resetToIdle, strikeOrCast]);

  useEffect(() => {
    let frame = 0;
    let last = 0;
    let lastReelFx = 0;
    let prevSurge: SurgeState = 0;
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      try {
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
        last = now;
        if (holdingRef.current && phaseRef.current === "casting") {
          powerRef.current = Math.min(1, Math.max(0, (now - holdStartRef.current) / 900));
        }
        const surface = surfaceRef.current;
        // The charge is read from the ref by the meter and the scene; the page itself doesn't re-render for it.
        const shownPower = powerRef.current.toFixed(2);
        if (surface && surface.dataset.power !== shownPower) surface.dataset.power = shownPower;
        if (surface && (phaseRef.current === "idle" || phaseRef.current === "casting")) {
          const nextHint = hintFromDataset(surface.dataset.spot);
          const nextStance = parseStance(surface.dataset.stance);
          if (nextStance && nextStance !== stanceRef.current) {
            stanceRef.current = nextStance;
            setStance(nextStance);
            if (phaseRef.current === "idle") setHint(idleHint(nextStance));
          }
          if (nextHint && nextHint !== aimHintRef.current) {
            aimHintRef.current = nextHint;
            setAimHint(nextHint);
          }
        }
        const runtime = runtimeRef.current;
        const current = fightRef.current;
        fightInput.reeling = false;
        fightInput.steer = 0;
        if (phaseRef.current === "fight" && runtime && current && !current.underpowered) {
          const reeling =
            settings.reelMode === "toggle" ? reelLatchRef.current : reelKeyRef.current || reelPointerRef.current !== null;
          fightInput.reeling = reeling;
          const keys = steerKeysRef.current;
          const steer: Steer = steerPointerRef.current?.side ?? (keys.left === keys.right ? 0 : keys.left ? -1 : 1);
          fightInput.steer = steer;
          const result = runtime.step(now, dt, reeling, steer);
          const sim = runtime.sim;
          if (surface) {
            surface.dataset.tension = sim.tension.toFixed(2);
            surface.dataset.line = sim.line.toFixed(2);
            surface.dataset.surge = String(sim.surge);
          }
          if (sim.surge === 2 && prevSurge !== 2) {
            if (sim.jump) fx.splash();
            else fx.surge();
            fx.haptic("surge");
          }
          prevSurge = sim.surge;
          fx.drag.set(dragTone(sim.tension, sim.surge, reeling));
          if (reeling && now - lastReelFx > 90) {
            fx.reel();
            lastReelFx = now;
          }
          if (result === "landed") {
            fx.land();
            fx.haptic("land");
            const clean = isCleanFight(runtime.performance);
            cleanRunRef.current = clean ? cleanRunRef.current + 1 : 0;
            setOutcome({
              kind: "landed",
              id: localId(),
              species: current.species,
              weight: current.weight,
              spot: spotRef.current,
              clean,
              notes: {
                perfectCast: castPerfectRef.current,
                hookedSolid: hookedSolidRef.current,
                turnedRuns: runtime.performance.turnedRuns ?? 0,
                cleanRun: cleanRunRef.current,
                closeCall: isCloseCall(runtime.performance),
                fightSec: runtime.performance.fightSec,
              },
            });
            clearFight();
            setPhaseBoth("result");
            setHint(castHint("landed"));
          } else if (result === "snapped") {
            fx.snap();
            fx.haptic("snap");
            cleanRunRef.current = 0;
            // How close it came, so a break near the net reads as nearly there rather than as a wasted fight.
            const reeledIn = Math.round((1 - sim.line) * 100);
            const snapped = t("{fish} snapped the line — too much tension.", { fish: t(current.species.name) });
            setOutcome({ kind: "broke", message: reeledIn >= 10 ? `${snapped} ${t("It was {n}% of the way in.", { n: reeledIn })}` : snapped });
            resetToIdle(t("Too much tension — let go when the bar turns red or the fish is about to run."));
          } else if (result === "escaped") {
            fx.snap();
            fx.haptic("snap");
            cleanRunRef.current = 0;
            setOutcome({ kind: "broke", message: t("{fish} took all the line and threw the hook.", { fish: t(current.species.name) }) });
            resetToIdle(t("Ran out of line — hold to reel whenever the fish is calm."));
          }
        }
      } catch (error) {
        console.error(error);
        clearTimers();
        holdingRef.current = false;
        castPointerRef.current = null;
        powerRef.current = 0;
        clearFight();
        setPhaseBoth("result");
        setOutcome({ kind: "error", message: t("The fishing loop hit a problem. You can cast again.") });
        setHint(error instanceof Error ? error.message : t("The fishing loop hit a problem."));
      }
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      fx.drag.stop();
    };
  }, [resetToIdle]);

  useEffect(() => clearTimers, []);

  // Wall-clock periods, so the bubbles sit in the same place for everyone on the lake.
  useEffect(() => {
    if (level === null) return;
    let timer = 0;
    const place = () => {
      const now = Date.now();
      const next = hotspotAt(now, level);
      const moved = hotspotRef.current !== null && hotspotRef.current.spot !== next.spot;
      hotspotRef.current = next;
      setHotspot(next);
      // Mid-cast the hint is busy with the bobber or the fight, so the move is told on the angler's return to idle.
      if (moved && phaseRef.current === "idle") setHint(movedHint(next.spot));
      else if (moved) movedUnheardRef.current = true;
      timer = window.setTimeout(place, next.startsAt + HOTSPOT_PERIOD_MS - now);
    };
    place();
    return () => window.clearTimeout(timer);
  }, [level]);

  const dismissResult = () => {
    setOutcome(null);
    resetToIdle(idleHint(stanceRef.current));
  };

  return {
    surfaceRef,
    phase,
    spot,
    aimHint,
    stance,
    shopTap,
    fight,
    bite,
    outcome,
    hint,
    nibble,
    hotspot,
    sim: simRef,
    performance: performanceRef,
    powerRef,
    dismissResult,
  };
}
