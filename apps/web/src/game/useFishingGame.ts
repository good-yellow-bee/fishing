import { useCallback, useEffect, useRef, useState } from "react";
import {
  hotBankForDay,
  anglerLevel,
  fishTireMulForLevel,
  lureWorkTapsForLevel,
  INLET_LEVEL,
  canLand,
  isFishingStance,
  lakeHour,
  parseAim,
  parseStance,
  FISH,
  isTrophyWeight,
  lureClass,
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
  type Wind,
} from "@stillwater/shared";
import { locale, t } from "../i18n";
import { fightLines, fightWater, fightWind, isCleanFight, isCloseCall, LEAPERS, makeFight, seasonTireMul, thrivesInCold, floodedInlet, warmTireMul, rainCooled, deepCooled, runTireMul, nestTireMul, nightTireMul, spentTireMul, twilightTireMul, springRunTireMul, currentTireMul, fallFeedTireMul, rainHunterTireMul, SOFT_MOUTHS, SOLID_HOOK_STAMINA, steerSide, type FightPerformance, type FightRuntime, type FightSim, type FightWater, type FightWind, type Steer, type SurgeState } from "./fight";
import { fightInput } from "./scene/fightMotion";
import { settings } from "./settings";
import { dragTone } from "./dragTone";
import { fx } from "./fx";
import { whenShown } from "./whenShown";
import { isRiseCast } from "./eveningRise";
import { castSnags, SNAG_AT_MS, SNAG_TAPS, type SnagCover } from "./snag";
import { followCall, followerFor, GRAB_LINE, grabberFor, grabCall } from "./grab";
import { AGAIN_CASTS, castForGotAway, gotAwayAfterLoss, type GotAway } from "./gotAway";
import { HOTSPOT_PERIOD_MS, hotspotAt, isHotspotCast, type Hotspot } from "./hotspot";
import { BACKLASH_POWER, castIntoSchool, castIntoSpooked, chopWaitMul, crankRockWaitMul, dockShadeWaitMul, fallBigLureWaitMul, favorsLargeFish, flashWaitMul, flyHatchWaitMul, flyDriftWaitMul, hookWindowMs, isLightHook, isPerfectCast, jigWaitMul, jigWinterWaitMul, makeCatch, pickBite, rainInletWaitMul, SCHOOL_CASTS, SCHOOL_SAME, SCHOOL_WAIT, schoolAfterLanding, isWinterSchool, SLAP_POWER, solidStrikeMs, spinnerThumpWaitMul, stormWaitMul, springShallowsWaitMul, summerDeepWaitMul, winterSunWaitMul, windPointWaitMul, SPOOK_WAIT, stackWaitMs, sweetBand, topwaterNightWaitMul, topwaterWaitMul, waitMs, wormNightWaitMul, type School } from "./logic";
import { localId } from "./localId";
import { FOLLOWERS, takeStyle, GULP_HOLD, LIGHT_HOLD, nibblePlan, SNATCH_HOLD, stealsBait, type BiteStyle } from "./nibblePlan";
import type { ScenePhase } from "./scene/types";

/** Milliseconds as seconds with two decimals, in the angler's own number format. */
const seconds = (ms: number) => (ms / 1000).toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
  /** Struck late, so the hook only just caught: reeled in the red, it pulls out. */
  lightHook?: boolean;
  /** What the spot's water does to the fight; open water when left out. */
  water?: FightWater;
  /** A breezy or strong day, when the wind bellies a slack line. */
  windy?: FightWind;
};

/** Said after a lost fish's outcome when it was trophy-sized, so the one that got away is remembered as big. */
export function lostTrophy(species: FishSpecies, weight: number) {
  return isTrophyWeight(species, weight) ? ` ${t("It looked like a trophy.")}` : "";
}

/** How the angler played this fish, for a line on the landed card. */
/** cleanRun counts this clean fight and the clean ones landed right before it this session; 0 when this one was not clean. */
export type FightNotes = { perfectCast: boolean; hookedSolid: boolean; lightHook?: boolean; turnedRuns: number; cleanRun?: number; closeCall?: boolean; fightSec?: number; bowedLeaps?: number; easedShakes?: number; followedDarts?: number; encore?: boolean; secondTake?: boolean; grabbed?: string; gotAway?: boolean; followedIn?: boolean; clearOf?: "weeds" | "rocks" | "pilings" | "current" };

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
  if (style === "light") return t("A light take, the float just slides under — strike!");
  if (style === "lift") return t("The float lifts and lies flat — strike!");
  if (style === "peck") return t("The pecking turns into a pull — strike!");
  if (style === "run") return t("It's running off with it — strike!");
  if (style === "gulp") return t("It's gulping it down — strike!");
  if (style === "snatch") return t("It snatched it — strike fast!");
  if (style === "roll") return t("It rolled on the bait — strike!");
  return t("NOW — strike!");
}

/** Whether the hook carries real bait a little fish can strip: live bait, a float rig, or anything unnamed. A hard lure has none. */
export function carriesBait(lure: string | undefined) {
  if (lure === undefined || !lure.trim()) return true;
  const kind = lureClass(lure).id;
  return kind === "worm" || kind === "bobber" || kind === "plain";
}

/** Whether the hook carries live bait, which a fish given time swallows. */
export function isLiveBait(lure: string | undefined) {
  return lure !== undefined && lure.trim() !== "" && lureClass(lure).id === "worm";
}

/** Whether the lure tied on is a topwater one, which fish hit at the top. */
export function isTopwater(lure: string | undefined) {
  return lure !== undefined && lureClass(lure).id === "popper";
}

/** Whether the lure hangs treble hooks (a spinner, spoon or crankbait), which hold a tearing hook longer. */
export function hasTrebles(lure: string | undefined) {
  if (lure === undefined || !lure.trim()) return false;
  const kind = lureClass(lure).id;
  return kind === "spinner" || kind === "spoon" || kind === "crank";
}

/** Whether the lure is a jig, which a tap hops off the bottom. */
export function isJig(lure: string | undefined) {
  return lure !== undefined && lure.trim() !== "" && lureClass(lure).id === "jig";
}

/** Whether the lure is a spoon, which a tap lifts so it flutters back down. */
export function isSpoon(lure: string | undefined) {
  return lure !== undefined && lure.trim() !== "" && lureClass(lure).id === "spoon";
}

/** Whether the lure is a streamer, which a missed pike chases down for one more hit. */
export function isStreamer(lure: string | undefined) {
  return lure !== undefined && lure.trim() !== "" && lureClass(lure).id === "streamer";
}

/** Pike that, missing a streamer stripped away from them, chase it down for one more hit. */
export const STREAMER_CHASERS: ReadonlySet<string> = new Set(["pike", "ghost-pike"]);

/** At most this many reasons for a sooner or slower bite are told on a cast, so the hint stays readable. */
export const WAIT_REASONS = 2;

/** How many pops, hops, lifts or strips draw the fish up sooner below level 13 (see lureWorkTapsForLevel). */
export const TOPWATER_POPS = 2;
/** Each pop leaves this share of the wait still to go. */
export const TOPWATER_POP_LEFT = 0.6;
/** The share of fish that, after a missed topwater blow-up, come back up for it once more. */
export const TOPWATER_COMEBACK_ODDS = 0.5;
/** How long a fish that missed a topwater lure takes to come back up for it. */
export const TOPWATER_COMEBACK_MS = 1400;
/** Striking at a nibble on bait yanks it from the fish, which backs off: the rest of the wait stretches this much, once a cast. */
export const BAIT_YANK_WAIT = 1.5;
/** A second finger this soon after a yank makes it a camera pinch, and the yank is taken back. */
const PINCH_UNDO_MS = 600;

/** How long a bottom feeder that dropped the bait takes to come back for its second take. */
export const SECOND_TAKE_MS = 1800;
/** The twitch of the float halfway through that wait. */
export const SECOND_TAKE_NIBBLE_MS = 300;
/** How long a tiger muskie that missed follows the bait before it hits again. */
export const FOLLOW_MS = 1200;

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
  /** The day's wind; a breezy or strong one bellies a slack line in a fight. */
  wind?: Wind,
) {
  const risingRef = useRef(rising);
  risingRef.current = rising;
  const windRef = useRef(wind);
  windRef.current = wind;
  const hourRef = useRef(hour);
  hourRef.current = hour;
  const castRiseRef = useRef(false);
  /** The school a landed panfish left at its bank, for the next casts there. */
  const schoolRef = useRef<School | null>(null);
  /** The bank where a fish was just lost; its next cast waits longer. */
  const spookRef = useRef<SpotId | null>(null);
  /** A big fish that broke off, waiting to bite again at its bank. */
  const gotAwayRef = useRef<GotAway | null>(null);
  /** This bite is that fish come back. */
  const againRef = useRef(false);
  /** The fish on now is the hunter that followed a small fish in. */
  const followedRef = useRef(false);
  /** The hunter that will follow this small fish in if it isn't grabbed, with the weight it bites at. */
  const followRef = useRef<{ species: FishSpecies; weight: number } | null>(null);
  /** The last cast landed in the middle of the sweet band. */
  const castPerfectRef = useRef(false);
  /** The hook went in solid on a quick strike. */
  const hookedSolidRef = useRef(false);
  /** A pike waiting to hit the shiner on the line, and the angler it was rolled for. */
  const grabRef = useRef<{ predator: FishSpecies; profile: Profile } | null>(null);
  /** The small fish the one on the line took, by id. */
  const grabbedRef = useRef<string | undefined>(undefined);
  /** This fish came back for a second take after dropping the bait. */
  const secondTakeRef = useRef(false);
  /** A topwater lure sitting before the bite: when the bite is due, how to bring it on, and the pops so far. */
  // When the bait's bite is due, so a strike at a nibble can yank it away and put the bite off.
  const yankRef = useRef<{ dueAt: number; take: () => void } | null>(null);
  // The yank just made, so a camera pinch whose first finger looked like a strike can take it back.
  const yankedRef = useRef<{ dueAt: number; take: () => void; at: number } | null>(null);
  const popRef = useRef<{ dueAt: number; take: () => void; pops: number; work: "pop" | "hop" | "lift" | "strip"; taps: number } | null>(null);
  /** Clean fights landed in a row this session; a dirty landing or a lost fish starts it again. */
  const cleanRunRef = useRef(0);
  const castSnagRef = useRef<SnagCover | null>(null);
  /** Taps so far on a snagged lure, and the bite timers it is holding back; null while the lure is free. */
  const snagRef = useRef<{ taps: number; arm: () => void; cover: SnagCover } | null>(null);
  const mercyRef = useRef(mercy);
  mercyRef.current = mercy;
  const surfaceRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<ScenePhase>("idle");
  const powerRef = useRef(0);
  /** The power the last cast was released at, failed casts included, for the cast meter's aiming mark. */
  const lastCastRef = useRef<number | null>(null);
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
  /** This cast landed in a school; the scene shows it milling round the float while it waits. */
  const [schooled, setSchooled] = useState(false);
  const [lurking, setLurking] = useState(false);
  const [lurkerCloseInMs, setLurkerCloseInMs] = useState(0);
  /** How long this bite's fish holds the bait, so the strike cue runs out when it lets go. */
  const [strikeWindowMs, setStrikeWindowMs] = useState(0);
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
    popRef.current = null;
    yankRef.current = null;
    yankedRef.current = null;
    window.clearTimeout(timers.current.hook);
    window.clearTimeout(timers.current.snap);
    timers.current.nibbles?.forEach((id) => window.clearTimeout(id));
    window.clearTimeout(timers.current.snag);
    timers.current.shown?.();
    timers.current = {};
    snagRef.current = null;
  };

  const clearFight = () => {
    grabRef.current = null;
    grabbedRef.current = undefined;
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
    secondTakeRef.current = false;
    powerRef.current = 0;
    clearFight();
    setPhaseBoth(phase);
    const moved = phase === "idle" && movedUnheardRef.current ? hotspotRef.current : null;
    if (moved) movedUnheardRef.current = false;
    setHint(moved ? movedHint(moved.spot) : message);
  }, []);

  const beginFight = useCallback((species: FishSpecies, weight: number, current: Profile, strike?: { elapsedMs: number; solidMs: number; windowMs: number }) => {
    const solid = strike !== undefined && strike.elapsedMs <= strike.solidMs;
    const late = strike !== undefined && !solid && isLightHook(strike.elapsedMs, strike.windowMs);
    // Live bait held that long is swallowed, so a late strike still hooks deep rather than light.
    const deep = late && isLiveBait(lureRef?.current);
    const lightHook = late && !deep;
    const underpowered = !canLand(current, species);
    const water = fightWater(spotRef.current);
    const windy = fightWind(windRef.current);
    const next = { species, weight, underpowered, water, windy, lightHook };
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
      const runtime = makeFight(species, weight, current.strength, Math.random, fishTireMulForLevel(anglerLevel(current.lifetimePoints)) * seasonTireMul(season, species.id) * warmTireMul(season, species.id, sky, spotRef.current) * runTireMul(season, species.id) * nestTireMul(season, species.id, spotRef.current) * nightTireMul(hourRef.current, species.id) * spentTireMul(season, species.id) * twilightTireMul(hourRef.current, species.id) * springRunTireMul(season, species.id, spotRef.current) * currentTireMul(species.id, spotRef.current) * fallFeedTireMul(season, species.id) * rainHunterTireMul(sky, species.id), water, windy, isTopwater(lureRef?.current), hasTrebles(lureRef?.current) || deep, seasonTireMul(season, species.id) > 1, isTrophyWeight(species, weight), floodedInlet(spotRef.current, season, sky));
      runtimeRef.current = runtime;
      simRef.current = runtime.sim;
      performanceRef.current = runtime.performance;
      // A quick strike drives the hook home, so the fish starts the fight a little worn.
      hookedSolidRef.current = solid;
      // Only a struck fish can be grabbed: the fish that took it is the one on the line now.
      if (strike) {
        grabbedRef.current = undefined;
        const predator = grabberFor(species.id, spotRef.current, current, mercyRef.current, Math.random());
        grabRef.current = predator ? { predator, profile: current } : null;
        const follower = predator ? null : followerFor(species.id, spotRef.current, current, mercyRef.current, Math.random());
        followRef.current = follower ? makeCatch(follower, current.patience, anglerLevel(current.lifetimePoints)) : null;
      }
      if (solid) runtime.sim.stamina = Math.min(runtime.sim.stamina, SOLID_HOOK_STAMINA);
      // A late strike only just catches, so the hook can pull out like a soft mouth's.
      runtime.sim.lightHook = lightHook;
      const line = fightLines(species.challenge)[0];
      const again = strike && againRef.current ? `${followedRef.current ? t("It's the one that followed your fish in!") : t("It's the one that got away!")} ` : "";
      // A trophy-sized fish is felt on the rod the moment it's hooked.
      const heavy = isTrophyWeight(species, weight) ? `${t("It feels heavy — could be a trophy!")} ${t("A fish this big makes a long first run.")} ` : "";
      // Cold water makes a fish sluggish, and the angler feels it at once.
      const cold = thrivesInCold(season, species.id) ? `${t("It thrives in the cold, so it keeps its strength.")} ` : seasonTireMul(season, species.id) <= 1 ? "" : LEAPERS.has(species.id) ? `${t("The cold water has it sluggish: it tires sooner and won't jump.")} ` : `${t("The cold water has it sluggish, so it tires sooner.")} `;
      // Summer's warm water leaves a trout or whitefish short of air, so it tires sooner.
      const dim = twilightTireMul(hourRef.current, species.id) >= 1 ? "" : `${t("It hunts hardest in the low light, so it tires slower.")} `;
      const upriver = springRunTireMul(season, species.id, spotRef.current) >= 1 ? "" : `${t("It's on its spring run up the inlet, so it tires slower.")} `;
      const stream = currentTireMul(species.id, spotRef.current) >= 1 ? "" : `${t("It turns its side to the current and fights it, so it tires slower.")} `;
      const fed = fallFeedTireMul(season, species.id) >= 1 ? "" : `${t("It has fed hard for winter and is at full strength, so it tires slower.")} `;
      const murky = rainHunterTireMul(sky, species.id) >= 1 ? "" : `${t("It hunts by smell in the murky rain water and fights at full strength, so it tires slower.")} `;
      const spent = spentTireMul(season, species.id) <= 1 ? "" : `${t("It's worn from spawning, so it tires sooner.")} `;
      const flood = floodedInlet(spotRef.current, season, sky) ? `${t("The swollen inlet pulls harder on a slack line.")} ` : "";
      const warm = rainCooled(season, species.id, sky) ? `${t("The rain has cooled the water, so it keeps its strength.")} ` : deepCooled(season, species.id, spotRef.current) ? `${t("It has found cool water down deep, so it keeps its strength.")} ` : warmTireMul(season, species.id, sky, spotRef.current) <= 1 ? "" : `${t("The warm water leaves it short of air, so it tires sooner.")} `;
      // A salmon on its fall spawning run is full of fight.
      const run = runTireMul(season, species.id) >= 1 ? "" : `${t("It's on its fall run and full of fight, so it tires slower.")} `;
      // A spring bass hooked by its nest fights hard to guard it.
      const nest = nestTireMul(season, species.id, spotRef.current) >= 1 ? "" : `${t("It's guarding its nest, so it fights harder and tires slower.")} `;
      // A catfish or burbot is out hunting after dark, at its strongest.
      const hunter = nightTireMul(hourRef.current, species.id) >= 1 ? "" : `${t("It's out hunting after dark and fights at full strength, so it tires slower.")} `;
      if (heavy) {
        fx.lift();
        fx.haptic("lift");
      }
      // The strike's time is told, so the angler learns how quick a solid hook has to be.
      setHint(
        again + heavy + cold + warm + run + nest + hunter + dim + upriver + stream + fed + murky + spent + flood +
        (!strike
          ? t("{line}. Ease off when it runs.", { line })
          : solid
            ? t("Hooked solid in {time} s! {line}. Ease off when it runs.", { time: seconds(strike.elapsedMs), line })
            : lightHook
              ? t("Hooked light in {time} s, it only just caught. Keep it out of the red. {line}.", { time: seconds(strike.elapsedMs), line })
            : deep
              ? t("It swallowed the bait: hooked deep in {time} s. {line}. Ease off when it runs.", { time: seconds(strike.elapsedMs), line })
            : fightWind(windRef.current)
              ? t("Hooked in {time} s (solid under {limit} s in this wind). {line}. Ease off when it runs.", {
                  time: seconds(strike.elapsedMs),
                  limit: seconds(strike.solidMs),
                  line,
                })
              : t("Hooked in {time} s (solid under {limit} s). {line}. Ease off when it runs.", {
                  time: seconds(strike.elapsedMs),
                  limit: seconds(strike.solidMs),
                  line,
                })),
      );
    }
  }, [resetToIdle, season, sky]);

  const setTheHook = useCallback(() => {
    if (phaseRef.current !== "hookset" || !profile) return;
    const bitten = biteRef.current;
    if (!bitten) return;
    window.clearTimeout(timers.current.hook);
    const { at, ms } = biteWindowRef.current;
    const strike = { elapsedMs: Math.max(0, performance.now() - at), solidMs: solidStrikeMs(ms, fightWind(windRef.current), lureRef?.current), windowMs: ms };
    fx.splash();
    fx.haptic("strike");
    beginFight(bitten.species, bitten.weight, profile, strike);
  }, [beginFight, profile]);

  const startWait = useCallback((current: Profile, shortCast: boolean) => {
    setPhaseBoth("waiting");
    setNibble(false);
    // A short cast only draws commons, even in the bubbles; in fog the shy fish can't see the angler and come in close.
    const fogClose = shortCast && sky === "fog";
    const short = shortCast && !fogClose;
    const shortHint = () => (fogClose ? t("Short cast, but in the fog the shy fish come in close.") : shortCastHint());
    waitHintRef.current = shortCast ? shortHint() : waitHint();
    if (castHotspotRef.current) waitHintRef.current = shortCast ? `${shortHint()} ${hotspotWaitHint()}` : hotspotWaitHint();
    else if (castRiseRef.current) waitHintRef.current = `${t("Right on a rise.")} ${waitHintRef.current}`;
    if (castPerfectRef.current) waitHintRef.current = `${t("Perfect cast.")} ${waitHintRef.current}`;
    const school = castIntoSchool(schoolRef.current, spotRef.current);
    schoolRef.current = school.next;
    // A beginner still on their first catches is spared the spooked wait, and rain on the water covers the lost fish's splash.
    const spookedBank = castIntoSpooked(spookRef.current, spotRef.current) && !mercyRef.current;
    const rainCover = spookedBank && sky === "rain";
    const spooked = spookedBank && !rainCover;
    spookRef.current = null;
    const schoolFish = school.schoolId ? FISH.find((fish) => fish.id === school.schoolId) : undefined;
    setSchooled(!!schoolFish);
    if (schoolFish) waitHintRef.current = `${t("Into the school.")} ${waitHintRef.current}`;
    if (spooked) waitHintRef.current = `${t("The lost fish spooked this water, so the next bite is slower.")} ${waitHintRef.current}`;
    else if (rainCover) waitHintRef.current = `${t("The rain on the water covered the lost fish's splash, so this water isn't spooked.")} ${waitHintRef.current}`;
    // Why the lure and the conditions draw a bite sooner (or slower); only the two latest are told, so the hint stays short.
    const reasons: string[] = [];
    // A topwater lure shows best on glassy water and gets lost in a strong wind's chop; a beginner is spared the slow side.
    const topwaterWait = Math.min(topwaterWaitMul(isTopwater(lureRef?.current), windRef.current), mercyRef.current ? 1 : Infinity);
    if (topwaterWait < 1) reasons.unshift(t("Glassy water, made for a topwater."));
    else if (topwaterWait > 1) reasons.unshift(t("The chop hides the topwater, so the bites come slow."));
    // A spinner or spoon flashes in the sun, so a fish sees it from farther off.
    // Thunder puts the fish down, so a storm slows every bite; a beginner is spared it.
    const stormWait = mercyRef.current ? 1 : stormWaitMul(sky, season, windRef.current);
    if (stormWait > 1) reasons.unshift(t("Thunder puts the fish down, so the bites come slow."));
    // A breeze chops the surface, and the fish under it feed bolder.
    const chopWait = chopWaitMul(isTopwater(lureRef?.current), windRef.current);
    if (chopWait < 1) reasons.unshift(t("The breeze chops the surface, and the fish feed bolder under it."));
    const flashWait = flashWaitMul(lureRef?.current, sky, hour, moon);
    if (flashWait < 1) reasons.unshift(hour === "night" ? t("The full moon catches the lure's flash.") : t("The sun catches the lure's flash."));
    // After dark the fish hunt by sound, and a topwater's gurgle carries.
    const nightTopwaterWait = topwaterNightWaitMul(isTopwater(lureRef?.current), hour);
    if (nightTopwaterWait < 1) reasons.unshift(t("In the dark the fish hunt by sound, and they hear the topwater."));
    // Worms crawl out after dark, so live bait draws a bite sooner at night.
    const nightWait = wormNightWaitMul(lureRef?.current, hour);
    if (nightWait < 1) reasons.unshift(t("Worms crawl out after dark, and the fish are looking for one."));
    // Fish on a rise are taking insects off the top, and a fly matches the hatch.
    const hatchWait = flyHatchWaitMul(lureRef?.current, castRiseRef.current);
    if (hatchWait < 1) reasons.unshift(t("The fly matches what they're rising to."));
    // In rain or fog the fish can barely see, but they feel a spinner's blade thump.
    const thumpWait = spinnerThumpWaitMul(lureRef?.current, sky);
    if (thumpWait < 1) reasons.unshift(t("The fish can't see far, but they feel the spinner's blade thump."));
    // A jig hops down the drop-off's ledge, where the fish hold.
    const jigWait = jigWaitMul(lureRef?.current, spotRef.current);
    if (jigWait < 1) reasons.unshift(t("The jig hops down the ledge."));
    // In fall the fish fatten up for winter and go after a big meal.
    const fallWait = fallBigLureWaitMul(lureRef?.current, season);
    if (fallWait < 1) reasons.unshift(t("The fish are fattening up for winter and want a big meal."));
    // On a summer day the fish drop down to the cool water off the ledge.
    const heatWait = summerDeepWaitMul(spotRef.current, season, hour);
    if (heatWait < 1) reasons.unshift(t("The summer heat sends the fish down to the cool water off the ledge."));
    // On a bright summer day the fish tuck into the shade under the dock.
    const shadeWait = dockShadeWaitMul(spotRef.current, season, hour, sky);
    if (shadeWait < 1) reasons.unshift(t("The bright summer sun drives the fish into the shade under the dock."));
    // On a clear winter day the sun warms the reeds' shallows a little, and the cold fish drift in.
    const sunWait = winterSunWaitMul(spotRef.current, season, hour, sky);
    if (sunWait < 1) reasons.unshift(t("The winter sun warms the shallows by the reeds a little, and the cold fish drift in."));
    // A strong wind drives the baitfish onto the point, and the hunters follow.
    const blowWait = windPointWaitMul(spotRef.current, windRef.current);
    if (blowWait < 1) reasons.unshift(t("The wind drives the baitfish onto the point, and the hunters follow them in."));
    // In spring the reeds' shallows warm first, and the fish crowd in.
    const shallowsWait = springShallowsWaitMul(spotRef.current, season);
    if (shallowsWait < 1) reasons.unshift(t("The shallows by the reeds warm first in spring, and the fish crowd in."));
    // In rain the inlet's swollen current washes food in, and the fish gather to feed.
    const inletWait = rainInletWaitMul(spotRef.current, sky);
    if (inletWait < 1) reasons.unshift(t("The rain swells the inlet and washes food in, and the fish gather to feed."));
    // In winter the cold slows the fish, and a slow jig is what they still chase.
    const winterWait = jigWinterWaitMul(lureRef?.current, season);
    if (winterWait < 1) reasons.unshift(t("The cold water slows the fish, but they still chase a slow jig."));
    // A fly or streamer swings down the inlet's current to the trout holding there.
    const driftWait = flyDriftWaitMul(lureRef?.current, spotRef.current);
    if (driftWait < 1) reasons.unshift(t("The current swings the fly down to the fish."));
    // A crankbait bangs off the point's rocks, and the erratic bump draws a reaction bite.
    const rockWait = crankRockWaitMul(lureRef?.current, spotRef.current);
    if (rockWait < 1) reasons.unshift(t("The crankbait bangs off the rocks."));
    waitHintRef.current = [...reasons.slice(0, WAIT_REASONS), waitHintRef.current].join(" ");
    setHint(waitHintRef.current);
    // Roll the fish as the lure sits, so the one rising under the bobber is the one that bites.
    const mercyNow = mercyRef.current;
    const drawn = pickBite(spotRef.current, current, short, Math.random, hour, lureRef?.current, sky, castHotspotRef.current, mercyNow, season, moon);
    // The fish that broke off here may come back, at the same weight; while it's about this bank its shadow circles the float.
    setLurking(gotAwayRef.current?.spot === spotRef.current);
    const lost = castForGotAway(gotAwayRef.current, spotRef.current, Math.random(), favorsLargeFish(lureRef?.current ?? ""));
    gotAwayRef.current = lost.next;
    againRef.current = lost.again !== null;
    followedRef.current = !!lost.again?.follow;
    const species = lost.again ? lost.again.species : schoolFish && Math.random() < SCHOOL_SAME ? schoolFish : drawn;
    const bitten = lost.again ? { species, weight: lost.again.weight } : makeCatch(species, current.patience, anglerLevel(current.lifetimePoints));
    biteRef.current = bitten;
    setBite(bitten);
    const hotBank = hotBankForDay(new Date()) === spotRef.current;
    const unschooledWait = waitMs(current.patience, hour, castHotspotRef.current, anglerLevel(current.lifetimePoints), mercyNow, hotBank, castRiseRef.current, castPerfectRef.current);
    // However many bonuses stack, the bite never comes before the floor, so a nibble still fits.
    const wait = stackWaitMs(unschooledWait, schoolFish ? SCHOOL_WAIT : 1, spooked ? SPOOK_WAIT : 1, topwaterWait, chopWait, stormWait, nightTopwaterWait, flashWait, jigWait, winterWait, shallowsWait, inletWait, fallWait, heatWait, shadeWait, sunWait, blowWait, driftWait, rockWait, nightWait, hatchWait, thumpWait);
    // When the fish still about this bank is the one biting, its shadow closes in on the float over the wait.
    setLurkerCloseInMs(lost.again ? wait : 0);
    // A topwater lure is hit at the top, so every fish takes it without a nibble.
    const topwater = isTopwater(lureRef?.current);
    const style = takeStyle(species.id, topwater);
    const nibbles = nibblePlan(wait, Math.random, style);
    const stolen = carriesBait(lureRef?.current) && stealsBait(species.id, nibbles.length);
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
        popRef.current = null;
        yankRef.current = null;
        yankedRef.current = null;
        setNibble(false);
        // A bait thief nibbled the hook clean: there is nothing left to bite.
        if (stolen) {
          setOutcome({ kind: "miss", message: t("{fish} nibbled the bait clean off the hook.", { fish: t(species.name) }), fish: bitten });
          resetToIdle(t("Little fish steal bait. Cast again."), "result");
          return;
        }
        fx.bite();
        if (hour === "night") fx.rodBell("ring");
        fx.haptic("bite");
        setPhaseBoth("hookset");
        setHint(topwater ? t("It blew up on the topwater — strike!") : strikeCall(style));
        const openWindow = () => {
          const heldMs = hookWindowMs(current.accuracy, mercyNow, anglerLevel(current.lifetimePoints));
          const windowMs = style === "light" ? Math.round(heldMs * LIGHT_HOLD) : style === "gulp" ? Math.round(heldMs * GULP_HOLD) : style === "snatch" ? Math.round(heldMs * SNATCH_HOLD) : heldMs;
          biteWindowRef.current = { at: performance.now(), ms: windowMs };
          setStrikeWindowMs(windowMs);
          timers.current.hook = window.setTimeout(() => {
            if (phaseRef.current !== "hookset") return;
            // Gone to another tab mid-bite: the fish keeps the bait, and a fresh window opens on the way back.
            if (document.visibilityState === "hidden") {
              timers.current.shown = whenShown(openWindow, document, 0);
              return;
            }
            // A bottom feeder that dropped the bait noses back for one more go before it leaves.
            if (!secondTake && style === "mouth") {
              secondTake = true;
              secondTakeRef.current = true;
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
            // A fish that blew up on a topwater lure often misses it, and left to sit the lure can draw it back up.
            if (!secondTake && topwater && Math.random() < TOPWATER_COMEBACK_ODDS) {
              secondTake = true;
              secondTakeRef.current = true;
              setPhaseBoth("waiting");
              setHint(t("It missed the topwater. Let it sit, it may come back…"));
              timers.current.wait = window.setTimeout(() => {
                if (phaseRef.current !== "waiting") return;
                timers.current.shown = whenShown(takeBait);
              }, TOPWATER_COMEBACK_MS);
              return;
            }
            // A tiger muskie follows the bait it missed and hits once more, with no warning tap; a pike does the same after a streamer.
            const follower = FOLLOWERS.has(species.id);
            if (!secondTake && (follower || (STREAMER_CHASERS.has(species.id) && isStreamer(lureRef?.current)))) {
              secondTake = true;
              secondTakeRef.current = true;
              setPhaseBoth("waiting");
              setHint(follower ? t("It swirled away, but a muskie follows. Watch for it to hit again…") : t("It missed, but the streamer keeps it chasing. Watch for it to hit again…"));
              timers.current.wait = window.setTimeout(() => {
                if (phaseRef.current !== "waiting") return;
                timers.current.shown = whenShown(takeBait);
              }, FOLLOW_MS);
              return;
            }
            // The missed fish stays in the outcome so the turn-away shows the same fish.
            // How long it held on, so the angler learns the window they have.
            setOutcome({ kind: "miss", message: t("Too slow. The fish dropped the bait after {time} s.", { time: seconds(windowMs) }), fish: bitten });
            // Hold result so the miss spring and the turn play out.
            resetToIdle(style === "lift" ? t("Strike the moment the float lifts.") : t("Strike the moment the bobber goes under."), "result");
          }, windowMs);
        };
        openWindow();
      };
      const bringOn = () => {
        if (phaseRef.current !== "waiting") return;
        timers.current.shown = whenShown(takeBait);
      };
      timers.current.wait = window.setTimeout(bringOn, wait);
      // A sitting topwater can be popped, a jig on the bottom hopped, a spoon lifted and a streamer stripped, to draw the fish sooner.
      const work = topwater ? "pop" : isJig(lureRef?.current) ? "hop" : isSpoon(lureRef?.current) ? "lift" : isStreamer(lureRef?.current) ? "strip" : null;
      popRef.current = work ? { dueAt: performance.now() + wait, take: bringOn, pops: 0, work, taps: lureWorkTapsForLevel(anglerLevel(current.lifetimePoints)) } : null;
      // A beginner's easy fish never backs off.
      yankRef.current = carriesBait(lureRef?.current) && !mercyNow ? { dueAt: performance.now() + wait, take: bringOn } : null;
    };
    if (!castSnagRef.current) {
      arm();
      return;
    }
    // Fouled in the weed or on a rock: no bite until it is worked free.
    const cover = castSnagRef.current;
    timers.current.snag = window.setTimeout(() => {
      if (phaseRef.current !== "waiting") return;
      snagRef.current = { taps: 0, arm, cover: cover ?? "weed" };
      fx.plop();
      fx.haptic("nibble");
      setHint(
        cover === "rocks"
          ? t("Snagged on the rocks. Tap {n} times to work it free.", { n: SNAG_TAPS })
          : t("Snagged in the weed. Tap {n} times to work it free.", { n: SNAG_TAPS }),
      );
    }, SNAG_AT_MS);
  }, [hour, lureRef, moon, resetToIdle, season, sky]);

  const releaseCast = useCallback(() => {
    if (phaseRef.current !== "casting" || !profile) return;
    holdingRef.current = false;
    const castPower = Math.min(1, (performance.now() - holdStartRef.current) / 900);
    powerRef.current = castPower;
    lastCastRef.current = castPower;
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
    castSnagRef.current = aimed !== null ? castSnags(landing.spot, aimed.x, aimed.z, mercyRef.current, Math.random(), lureRef?.current) : null;
    castPerfectRef.current = isPerfectCast(castPower, profile.accuracy, level);
    secondTakeRef.current = false;
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
        const pop = popRef.current;
        if (!snag && pop) {
          // Popping a topwater, hopping a jig, lifting a spoon or stripping a streamer draws the fish sooner, but only the first few times; then it wants to sit.
          if (pop.pops >= pop.taps) {
            setHint(pop.work === "hop" ? t("Let it fall between hops.") : pop.work === "lift" ? t("Let it fall between lifts.") : pop.work === "strip" ? t("Let it hang between strips.") : t("Let it sit between pops."));
            break;
          }
          pop.pops += 1;
          const sooner = Math.max(0, pop.dueAt - performance.now()) * TOPWATER_POP_LEFT;
          window.clearTimeout(timers.current.wait);
          timers.current.wait = window.setTimeout(pop.take, sooner);
          pop.dueAt = performance.now() + sooner;
          if (pop.work === "hop") {
            fx.reel();
            setHint(t("Hop! The jig lifts off the bottom and flutters down. Let it fall…"));
          } else if (pop.work === "lift") {
            fx.reel();
            setHint(t("Lift! The spoon flashes and flutters back down. Let it fall…"));
          } else if (pop.work === "strip") {
            fx.reel();
            setHint(t("Strip! The streamer darts off like a fleeing fish. Let it hang…"));
          } else {
            fx.plop();
            setHint(t("Pop! The lure spits and gurgles. Let it sit…"));
          }
          break;
        }
        if (!snag) {
          // Striking at a nibble is the usual early strike, so say what it was.
          const atNibble = surfaceRef.current?.dataset.nibble === "1";
          const yank = yankRef.current;
          if (atNibble && yank) {
            // Yanking the bait from a nibbling fish makes it back off, so the real bite comes later; once a cast.
            yankRef.current = null;
            yankedRef.current = { ...yank, at: performance.now() };
            const later = Math.max(0, yank.dueAt - performance.now()) * BAIT_YANK_WAIT;
            window.clearTimeout(timers.current.wait);
            timers.current.wait = window.setTimeout(yank.take, later);
            setHint(t("You yanked the bait away from it, so the fish backed off. Let it settle and wait for the real dip."));
            break;
          }
          setHint(atNibble ? t("That was only a nibble. Wait for the bobber to go under, then strike.") : t("Too early. Wait for the bobber to go under, then strike."));
          break;
        }
        snag.taps += 1;
        fx.reel();
        if (snag.taps < SNAG_TAPS) {
          setHint(t("Working it free… {n} of {total}", { n: snag.taps, total: SNAG_TAPS }));
          break;
        }
        snagRef.current = null;
        waitHintRef.current = snag.cover === "rocks" ? t("Off the rocks. Let it settle.") : t("Free of the weed. Let it settle.");
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
        if (phaseRef.current === "waiting") {
          setHint(waitHintRef.current);
          const yanked = yankedRef.current;
          if (yanked && performance.now() - yanked.at < PINCH_UNDO_MS) {
            // Nor did it yank the bait, so the bite comes when it was due.
            yankedRef.current = null;
            yankRef.current = { dueAt: yanked.dueAt, take: yanked.take };
            window.clearTimeout(timers.current.wait);
            timers.current.wait = window.setTimeout(yanked.take, Math.max(0, yanked.dueAt - performance.now()));
          }
        }
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
    let lastScrapeFx = 0;
    let wasWeeded = false;
    let wasWrapped = false;
    let wasShaking = false;
    let wasLifting = false;
    let prevSurge: SurgeState = 0;
    /** After a loss, a fish that may bite again is said to be still about. */
    // On a small lure, say a big one tempts it back sooner.
    const tempt = () => (lureRef && !favorsLargeFish(lureRef.current) ? ` ${t("A big lure tempts it back sooner.")}` : "");
    const stillAbout = () => (gotAwayRef.current ? ` ${t("It's still about: cast here again.")}${tempt()}` : "");
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
          // Halfway in, a bigger fish hits the small one: the fight starts again with it.
          const grab = grabRef.current;
          if (grab && result === "fighting" && sim.line <= GRAB_LINE) {
            grabRef.current = null;
            followRef.current = null;
            grabbedRef.current = current.species.id;
            const taken = makeCatch(grab.predator, grab.profile.patience, anglerLevel(grab.profile.lifetimePoints));
            biteRef.current = taken;
            setBite(taken);
            fx.splash();
            fx.haptic("strike");
            prevSurge = 0;
            beginFight(taken.species, taken.weight, grab.profile);
            // The pike is where the shiner was, not back at the far end of the line.
            if (runtimeRef.current) runtimeRef.current.sim.line = sim.line;
            setHint(grabCall(current.species.id, fightLines(taken.species.challenge)[0]));
            return;
          }
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
          // A fish ploughing into the weeds at the reeds swishes and thumps once.
          if (sim.weeded && !wasWeeded) {
            fx.weeds();
            fx.haptic("weeds");
          }
          wasWeeded = !!sim.weeded;
          // A line wrapping round a piling at the dock grates once.
          if (sim.wrapped && !wasWrapped) {
            fx.scrape();
            fx.haptic("scrape");
          }
          wasWrapped = !!sim.wrapped;
          // A walleye shaking its head knocks up the rod.
          if (sim.shake && !wasShaking) {
            fx.headShake();
            fx.haptic("headShake");
          }
          wasShaking = !!sim.shake;
          // A stuck catfish gives a little on the first pump: one deep thud.
          if (sim.lifting && !wasLifting) {
            fx.lift();
            fx.haptic("lift");
          }
          wasLifting = !!sim.lifting;
          // Reeling against a run off the point grates the line over the rocks.
          if (reeling && sim.rocky && now - lastScrapeFx > 220) {
            fx.scrape();
            fx.haptic("scrape");
            lastScrapeFx = now;
          }
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
                lightHook: runtime.sim.lightHook,
                secondTake: secondTakeRef.current,
                grabbed: grabbedRef.current,
                gotAway: againRef.current && !followedRef.current,
                followedIn: againRef.current && followedRef.current,
                turnedRuns: runtime.performance.turnedRuns ?? 0,
                cleanRun: cleanRunRef.current,
                closeCall: isCloseCall(runtime.performance),
                fightSec: runtime.performance.fightSec,
                bowedLeaps: runtime.performance.bowedLeaps,
                easedShakes: runtime.performance.easedShakes,
                followedDarts: runtime.performance.followedDarts,
                encore: runtime.performance.encore,
                clearOf: runtime.performance.clearOf,
              },
            });
            clearFight();
            setPhaseBoth("result");
            schoolRef.current = schoolAfterLanding(current.species.id, spotRef.current, hourRef.current, season);
            // A hunter that followed the small fish in stays about the bank for the next few casts.
            const follow = followRef.current;
            followRef.current = null;
            if (follow && !gotAwayRef.current) gotAwayRef.current = { spot: spotRef.current, species: follow.species, weight: follow.weight, casts: AGAIN_CASTS, follow: true };
            const followed = follow && gotAwayRef.current?.follow ? ` ${followCall(follow.species)} ${t("It's still about: cast here again.")}${tempt()}` : "";
            setHint(
              (schoolRef.current
                ? `${castHint("landed")} ${isWinterSchool(current.species.id, season) ? t("{fish}: there's a big winter school here, and it stays a while. Cast again quickly!", { fish: t(current.species.name) }) : schoolRef.current.casts > SCHOOL_CASTS ? t("{fish}: there's a school here, feeding hard in the low light. Cast again quickly!", { fish: t(current.species.name) }) : t("{fish}: there's a school here, cast again quickly!", { fish: t(current.species.name) })}`
                : castHint("landed")) + followed,
            );
          } else if (result === "snapped") {
            fx.snap();
            fx.haptic("snap");
            cleanRunRef.current = 0;
            // A lost fish spooks the bank and scatters any school there.
            spookRef.current = spotRef.current;
            schoolRef.current = null;
            gotAwayRef.current = gotAwayAfterLoss(current.species, current.weight, spotRef.current);
            const trophy = lostTrophy(current.species, current.weight);
            // How close it came, so a break near the net reads as nearly there rather than as a wasted fight.
            const reeledIn = Math.round((1 - sim.line) * 100);
            const snapped = t("{fish} snapped the line — too much tension.", { fish: t(current.species.name) });
            setOutcome({ kind: "broke", message: (reeledIn >= 10 ? `${snapped} ${t("It was {n}% of the way in.", { n: reeledIn })}` : snapped) + trophy });
            resetToIdle(t("Too much tension — let go when the bar turns red or the fish is about to run.") + stillAbout());
          } else if (result === "escaped") {
            fx.snap();
            fx.haptic("snap");
            cleanRunRef.current = 0;
            // A lost fish spooks the bank and scatters any school there.
            spookRef.current = spotRef.current;
            schoolRef.current = null;
            gotAwayRef.current = gotAwayAfterLoss(current.species, current.weight, spotRef.current);
            const trophy = lostTrophy(current.species, current.weight);
            if (sim.tornOut && sim.lightHook && !SOFT_MOUTHS.has(current.species.id)) {
              setOutcome({ kind: "broke", message: t("The light hook pulled out of the {fish}.", { fish: t(current.species.name) }) + trophy });
              resetToIdle(t("Hooked light — strike sooner, and ease off as soon as the bar turns red.") + stillAbout());
            } else if (sim.tornOut) {
              setOutcome({ kind: "broke", message: t("The hook tore out of the {fish}'s soft mouth.", { fish: t(current.species.name) }) + trophy });
              resetToIdle(t("Soft mouth — ease off as soon as the bar turns red.") + stillAbout());
            } else {
              setOutcome({ kind: "broke", message: t("{fish} took all the line and threw the hook.", { fish: t(current.species.name) }) + trophy });
              resetToIdle(t("Ran out of line — hold to reel whenever the fish is calm.") + stillAbout());
            }
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
  }, [beginFight, lureRef, resetToIdle, season]);

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
    schooled,
    lurking,
    lurkerCloseInMs,
    strikeWindowMs,
    hotspot,
    sim: simRef,
    performance: performanceRef,
    powerRef,
    lastCastRef,
    dismissResult,
  };
}
