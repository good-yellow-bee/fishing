import { useCallback, useEffect, useRef, useState } from "react";
import {
  hotBankForDay,
  crowdedBankForDay,
  CROWDED_CASTS,
  CROWDED_WAIT,
  downWeight,
  GROUNDBAIT_CARRY,
  anglerLevel,
  fishTireMulForLevel,
  lineSnapForLevel,
  turnCutMulForLevel,
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
  type LodgeRelease,
  type Giant,
  type LodgeLost,
  reportsLost,
  GIANT_ODDS,
  type Profile,
  type Sky,
  type SpotId,
  type StanceId,
  type Wind,
  fishById,
  legendaryCanBite,
} from "@stillwater/shared";
import { locale, t } from "../i18n";
import { fightLines, liftsStickerInOne, LINE_SPINNERS, netsFish, SPIN_TWIST, TOOTHY, fightWater, fightWind, isCleanFight, isCloseCall, LEAPERS, makeFight, seasonTireMul, thrivesInCold, floodedInlet, warmTireMul, rainCooled, deepCooled, runTireMul, nestTireMul, nightTireMul, spentTireMul, twilightTireMul, springRunTireMul, currentTireMul, fallFeedTireMul, rainHunterTireMul, summerStrengthTireMul, SOFT_MOUTHS, SOLID_HOOK_STAMINA, steerSide, type FightPerformance, type FightRuntime, type FightSim, type FightWater, type FightWind, type Steer, type SurgeState } from "./fight";
import { boat } from "./scene/boat";
import { fightInput } from "./scene/fightMotion";
import { settings } from "./settings";
import { dragTone } from "./dragTone";
import { fx } from "./fx";
import { whenShown } from "./whenShown";
import { isRiseCast } from "./eveningRise";
import { LILY_COVER_WAIT, tightToPads } from "./lilyCover";
import { cloudShadeWaitMul } from "./sunCover";
import { MOON_FEED_WAIT, moonPassing } from "./solunar";
import { FOAM_LANE_WAIT, onFoamLane } from "./foamFeed";
import { SUNFISH_BED_WAIT, onSunfishBed } from "./sunfishBeds";
import { CRAYFISH_JIG_WAIT, onCrayfishBed } from "./crayfishJig";
import { TADPOLE_WAIT, amongTadpoles } from "./tadpoleShallows";
import { KINGFISHER_FRY_WAIT, overKingfisherFry } from "./kingfisherFry";
import { SUNKEN_LOG_WAIT, tightToLog } from "./sunkenLog";
import { SURFACE_BUG_WAIT, amongSurfaceBugs, bugLike } from "./surfaceBugs";
import { LANTERN_MINNOW_WAIT, amongLanternMinnows, minnowLike } from "./lanternMinnows";
import { MIDGE_RISE_WAIT, midgeLike, underMidges } from "./midgeClouds";
import { DUCKWEED_FOUL_WAIT, DUCKWEED_TOPWATER_WAIT, duckweedCast, inDuckweed } from "./duckweedCast";
import { FAR_ROCK_WAIT, tightToFarRock } from "./farRock";
import { castSnags, onRockEdge, onShoreIce, ROCK_EDGE_WAIT, SNAG_AT_MS, SNAG_TAPS, type SnagCover } from "./snag";
import { FLUTTER_SEC, flutterGrabberFor, flutterTip, followCall, followerFor, GRAB_LINE, grabberFor, grabCall } from "./grab";
import { BUCKET_SIZE, liveShiners, loadBucket, saveBucket } from "./baitBucket";
import { loadSwim, RAIN_WASHED_CASTS, saveSwim, swimNow } from "./swim";
import { baitDay, loadPrebait, PREBAIT_DAYS, savePrebait } from "./prebait";
import { loadTrap, saveTrap, trapCatch, trapIsCold, trapNextChange, trapState, type Trap } from "./minnowTrap";
import { castForFoe, foeGone, isOldFoe, loadOldFoe, saveOldFoe } from "./oldFoe";
import { loadNightLine, nightLineCatch, nightLineKinds, nightLineNextChange, nightLineSeason, nightLineState, nightSkyFor, saveNightLine, wormLineHour, type NightLine } from "./nightLine";
import { markShy, loadGiantShy, rollGiantShy, saveGiantShy, shyOf, type GiantShy } from "./giantShy";
import { AGAIN_CASTS, backAgain, castForGotAway, gotAwayAfterDrop, PATIENT_DROP_RANK, gotAwayAfterLoss, type GotAway } from "./gotAway";
import { LINE_SNAP, LINE_WAIT, type LineWeight } from "./lineWeight";
import { countAtBank, loadBankMemory, rollBankMemory, saveBankMemory, waryFromYesterday, YESTERDAY_WAIT, type BankMemory } from "./bankMemory";
import { castForLodgeLost, castForLodgeTag, castForReleased, loadReleased, saveReleased, type Recaught } from "./releasedFish";
import { weightText } from "../i18n/content";
import { FRENZY_SLOT_MS, frenzyOn, HOTSPOT_PERIOD_MS, hotspotAt, isHotspotCast, slotFrenzy, type Hotspot } from "./hotspot";
import { loadBag, loadShiner, saveBag, saveShiner, type HookedShiner } from "./groundbaitBag";
import { loadTin, saveTin, WORM_TIN_DAILY, WORM_TIN_WET } from "./wormTin";
import { BACKLASH_POWER, BED_RAIDERS, COLD_WORK_WAIT, tooQuickForCold, isLongCast, castIntoSchool, castOverGroundbait, canChopWorm, CHOPPED_WORMS, wormFeedersTake, scatterSwim, SPOOKED_SWIM_CASTS, isBigFeeder, isWary, landBigFeeder, bigFeedersOver, prowlerAt, PROWLERS, scattersSwim, TOPUP_MAX, GROUNDBAIT_CASTS, GROUNDBAIT_HANDFULS, GROUNDBAIT_WAIT, groundbaitFeeder, OVERFED_WAIT, throwHandful, TOPUP_CASTS_LEFT, canBaitShiner, shinerHunter, bedRaider, crayfishHunter, tadpoleEater, fryHunter, logHolder, bugSipper, lightHunter, midgeRiser, type Groundbait, castIntoSpooked, castUnderPressure, castNewLure, type LuresShown, castOnFreshWater, FRESH_WAIT, fishedHardBanks, type Pressure, PRESSURE_WAIT, chopWaitMul, colourSuits, colourWaitMul, crankPilingWaitMul, crankRockWaitMul, darkNightWaitMul, dockShadeWaitMul, fallBigLureWaitMul, favorsLargeFish, floatReedWaitMul, flashWaitMul, flyHatchWaitMul, flyDriftWaitMul, hookWindowMs, isLightHook, isPerfectCast, isSkipCast, SKIP_CAST_WAIT, jigWaitMul, lanternDockWaitMul, jigWinterWaitMul, makeCatch, anchorSplashWaitMul, openGlareWaitMul, frenzyHunter, FRENZY_WAIT, lampLit, LAMP_WAIT, LAMP_WINDOW, longShadowWaitMul, pickBite, rainInletWaitMul, SCHOOL_SAME, SCHOOL_WAIT, schoolAfterLanding, isWinterSchool, SLAP_POWER, solidStrikeMs, spinnerInletWaitMul, spinnerReedWaitMul, spinnerThumpWaitMul, spoonOpenWaitMul, stormWaitMul, preRainWaitMul, fogLiftWaitMul, postFrontWaitMul, turnoverWaitMul, waterSwingWaitMul, castTangles, isTwisted, twistAfterCast, isWashedOut, soakAfterCast, WASHED_WAIT, springShallowsWaitMul, streamerLedgeWaitMul, summerDeepWaitMul, winterSunWaitMul, windPointWaitMul, windwardWaitMul, SPOOK_WAIT, stackWaitMs, sweetBand, topwaterNightWaitMul, topwaterWaitMul, waitMs, wormInletWaitMul, wormNightWaitMul, wormPilingWaitMul, type School } from "./logic";
import { localId } from "./localId";
import { FOLLOWERS, takeStyle, GULP_HOLD, LIGHT_HOLD, nibblePlan, SNATCH_HOLD, stealChance, stealsBait, type BiteStyle } from "./nibblePlan";
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
      : t("Click the water or use the arrow keys to aim. Hold to charge, release in the moss band.");
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
  /** The line on the reel: light snaps sooner, heavy holds more. */
  line?: LineWeight;
  /** Hooked tight to the lily pads, so it dives for the pad stems like a fish in the reeds' weeds. */
  pads?: boolean;
  /** Hooked from the boat tight to the far rock, so an unturned run drags the line over the rock. */
  farRock?: boolean;
  /** Hooked through a duckweed mat, so a ball of weed slows the reel until the first run strips it. */
  weedBall?: boolean;
  /** Hooked along the point's rock edge, so its runs dive off the ledge. */
  edge?: boolean;
  /** An egg raider hooked on the sunfish beds, so its first run, fleeing the guarding sunfish, is the long one. */
  bed?: boolean;
  /** Hooked in a foam lane on a windy day, so a slack line drifts out faster still. */
  foam?: boolean;
  /** Hooked rising to hatching bugs or midges, so a jumper leaps on its first run. */
  rising?: boolean;
  /** Hooked among the lantern's minnows at night, so it sees the net in the light and bolts from it once. */
  lantern?: boolean;
  /** Hooked chasing the kingfisher's fry, so its first run doesn't tire it. */
  fired?: boolean;
  /** A trophy that broke a line before, the angler's own old foe or another's lost one: it knows the hook, so its first run doesn't tire it either. */
  hookWise?: boolean;
  /** A breezy or strong day, when the wind bellies a slack line. */
  windy?: FightWind;
  /** A catfish or sturgeon the angler's Strength lifts off the bottom in one pump. */
  strongLift?: boolean;
};

/** Said after a lost fish's outcome when it was trophy-sized, so the one that got away is remembered as big. */
export function lostTrophy(species: FishSpecies, weight: number) {
  return isTrophyWeight(species, weight) ? ` ${t("It looked like a trophy.")}` : "";
}

/** How the angler played this fish, for a line on the landed card. */
/** cleanRun counts this clean fight and the clean ones landed right before it this session; 0 when this one was not clean. */
export type FightNotes = { perfectCast: boolean; hookedSolid: boolean; lightHook?: boolean; turnedRuns: number; cleanRun?: number; closeCall?: boolean; fightSec?: number; bowedLeaps?: number; easedShakes?: number; followedDarts?: number; encore?: boolean; secondWind?: boolean; secondTake?: boolean; grabbed?: string; gotAway?: boolean; followedIn?: boolean; recaught?: boolean; clearOf?: "weeds" | "rocks" | "pilings" | "log" | "current" };

export type Outcome =
  | { kind: "landed"; id: string; species: FishSpecies; weight: number; spot: SpotId; clean: boolean; notes?: FightNotes; note?: string; tag?: { id: string; by: string }; giant?: string; giantBonus?: number; hour?: LakeHour; lure?: string; lostFrom?: { id: string; by: string }; closesLost?: string }
  | { kind: "broke"; message: string }
  | { kind: "miss"; message: string; fish?: { species: FishSpecies; weight: number } }
  | { kind: "error"; message: string };

type Timers = {
  wait?: number;
  hook?: number;
  snap?: number;
  nibbles?: number[];
  snag?: number;
  /** A following pike's turn and its leaving, while the angler figure-eights the lure. */
  figure?: number[];
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

/** The pike family follows a flashing lure to the bank and may turn away; a figure-eight as it turns makes it strike. */
export const FIGURE_EIGHTERS: ReadonlySet<string> = new Set(["pike", "tiger-muskie", "ghost-pike"]);
/** Chance a pike-family fish on a spinner, spoon or streamer follows instead of taking, how long before it turns, and how long the turn lasts. */
export const FIGURE_EIGHT_ODDS = 0.3;
export const FIGURE_TURN_MS = 900;
export const FIGURE_WINDOW_MS = 550;

/** Whether a lure draws a following fish to the bank: the flashing lures a pike chases. */
export function drawsFollow(lure: string | undefined) {
  if (lure === undefined || !lure.trim()) return false;
  const kind = lureClass(lure).id;
  return kind === "spinner" || kind === "spoon" || kind === "streamer";
}

/** Whether the lure is a crankbait, which a tap pauses so it floats up in front of a following fish. */
export function isCrank(lure: string | undefined) {
  return lure !== undefined && lure.trim() !== "" && lureClass(lure).id === "crank";
}

/** Whether the lure is a fly, which a tap twitches like a live insect. */
export function isFly(lure: string | undefined) {
  return lure !== undefined && lure.trim() !== "" && lureClass(lure).id === "fly";
}

/** Pike that, missing a streamer stripped away from them, chase it down for one more hit. */
export const STREAMER_CHASERS: ReadonlySet<string> = new Set(["pike", "ghost-pike"]);

/** At most this many reasons for a sooner or slower bite are told on a cast, so the hint stays readable. */
export const WAIT_REASONS = 2;
const NO_REASONS: readonly string[] = [];

/** At most this many reasons a hooked fish tires slower or sooner are told at the hookset, so the hint stays readable. */
export const TIRE_REASONS = 2;

/** How many pops, hops, lifts, strips, pauses or twitches draw the fish up sooner below level 13 (see lureWorkTapsForLevel). */
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
/** A strike at nothing tugs the bait, and the fish backs off: the bite comes this much later each time, so mashing never finds it. */
export const FALSE_STRIKE_MS = 400;

/** How long a bottom feeder that dropped the bait takes to come back for its second take. */
export const SECOND_TAKE_MS = 1800;
/** The twitch of the float halfway through that wait. */
export const SECOND_TAKE_NIBBLE_MS = 300;
/** How long a tiger muskie that missed follows the bait before it hits again. */
export const FOLLOW_MS = 1200;

/** Said once, when a fight first frays the line: what did it, and what to do. */
function scuffNote(water: FightWater | undefined, teeth = false, farRock = false) {
  if (teeth) return t("Its teeth frayed your line: it snaps sooner until you retie it.");
  if (farRock) return t("The far rock frayed your line: it snaps sooner until you retie it.");
  if (water === "log") return t("Rubbing round the sunken log frayed your line: it snaps sooner until you retie it.");
  return water === "pilings"
    ? t("Rubbing round the piling frayed your line: it snaps sooner until you retie it.")
    : t("The rocks frayed your line: it snaps sooner until you retie it.");
}

const waitHint = () => t("Watch the bobber. Strike on the real dip, not a nibble.");
const hotspotWaitHint = () => t("Your lure is in the bubbles. Watch the bobber — strike on the real dip.");
const shortCastHint = () => t("Short cast — only small fish will look.");

function movedHint(spot: SpotId) {
  return t("The bubbles moved to the {spot}.", { spot: t(SPOT_LABELS[spot]) });
}

/** Tags out of the lake for a cast to find: landed this visit, or on a fish that got away and may bite again as itself. */
function takenTags(landed: ReadonlySet<string>, lost: GotAway | null): ReadonlySet<string> {
  const pending = lost?.back?.tag?.id;
  return pending ? new Set([...landed, pending]) : landed;
}

/** A fresh catch as a fished-down bank gives it: smaller, nearer its kind's least. */
function downAtBank<T extends { species: FishSpecies; weight: number }>(caught: T, down: boolean): T {
  return down ? { ...caught, weight: downWeight(caught.species, caught.weight) } : caught;
}

function frenzyHint(spot: SpotId) {
  return t("A feeding frenzy at the {bank}: baitfish boil over the bubbles. Cast into them!", { bank: t(SPOT_LABELS[spot]) });
}

/** Re-renders as a set trap or line turns ready and then stale, so an idle screen keeps up with it. Checked at
 * least once a minute, since a sleeping computer holds its timers back. */
function useTurnsOver<T, S>(set: T | null, stateOf: (set: T, now: number) => S, nextChange: (set: T, now: number) => number | null) {
  const [, setSeen] = useState<S | null>(null);
  useEffect(() => {
    if (!set) return;
    let timer: number | undefined;
    const check = () => {
      const now = Date.now();
      setSeen(stateOf(set, now));
      const next = nextChange(set, now);
      if (next !== null) timer = window.setTimeout(check, Math.min(next - now, 60_000));
    };
    check();
    return () => window.clearTimeout(timer);
  }, [set, stateOf, nextChange]);
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
  /** The day's wind as the scene's drift, which combs foam lanes across the open water on a breezy or strong day. */
  windDrift?: { x: number; z: number },
  /** The legend a solved hunt has drawn to its bank this week, or null. */
  legend: { legendId: string; spot: SpotId } | null = null,
  /** Fish other anglers let go on earlier days, still in the lake for a cast to find. */
  lodgeReleased: readonly LodgeRelease[] = [],
  /** Lures that have taken enough fish in the field log to be lucky: their hook sets a little more solid. */
  luckyLures: ReadonlySet<string> = new Set(),
  /** Banks the angler has fished down this week: their fish come smaller till they rest. */
  fishedDownBanks: ReadonlySet<SpotId> = new Set(),
  /** The week's giants no one has landed yet, one per bank, with what landing each pays when the lodge says. */
  openGiants: readonly (Giant & { bonus?: number })[] = [],
  /** Other anglers' lost trophies still about their banks. */
  lodgeLost: readonly LodgeLost[] = [],
) {
  const openGiantsRef = useRef(openGiants);
  openGiantsRef.current = openGiants;
  const lodgeLostRef = useRef(lodgeLost);
  lodgeLostRef.current = lodgeLost;
  /** Other anglers' lost trophies landed this visit, so one never bites twice before the list is read again. */
  const landedLostRef = useRef(new Set<string>());
  /** The trophy this angler last lost, for the Dock to file with the lodge; a fresh id each loss. */
  const [lostReport, setLostReport] = useState<{ id: string; speciesId: string; weight: number; spot: SpotId } | null>(null);
  const fishedDownRef = useRef(fishedDownBanks);
  fishedDownRef.current = fishedDownBanks;
  const luckyLuresRef = useRef(luckyLures);
  luckyLuresRef.current = luckyLures;
  /** The banks' memory this visit: read from the browser once, then kept here too, so a blocked store still counts casts. */
  const bankMemoryRef = useRef<{ userId: string; memory: BankMemory } | null>(null);
  const bankMemoryNow = (userId: string) => {
    const kept = bankMemoryRef.current;
    return kept && kept.userId === userId ? rollBankMemory(kept.memory, new Date()) : loadBankMemory(userId);
  };
  const keepBankMemory = (userId: string, memory: BankMemory) => {
    bankMemoryRef.current = { userId, memory };
    saveBankMemory(userId, memory);
  };
  /** Read live in the frame loop, which outlives a render's profile. */
  const anglerIdRef = useRef(profile?.userId);
  anglerIdRef.current = profile?.userId;
  /** The angler as last rendered, for handlers memoized across profile changes. */
  const profileRef = useRef(profile);
  profileRef.current = profile;
  /** The lures this week's giants broke free of: read from the browser once per angler, then kept here, and shown to the Dock. */
  const [giantShy, setGiantShy] = useState<GiantShy | null>(null);
  const giantShyRef = useRef<{ userId: string; shy: GiantShy } | null>(null);
  const giantShyNow = (userId: string) => {
    const kept = giantShyRef.current;
    const shy = kept && kept.userId === userId ? rollGiantShy(kept.shy, new Date()) : loadGiantShy(userId);
    giantShyRef.current = { userId, shy };
    return shy;
  };
  const keepGiantShy = (userId: string, shy: GiantShy) => {
    giantShyRef.current = { userId, shy };
    saveGiantShy(userId, shy);
    setGiantShy(shy);
  };
  useEffect(() => {
    setGiantShy(profile?.userId ? giantShyNow(profile.userId) : null);
  }, [profile?.userId]);
  /** A shiner or worm the angler left out on a night line, read from the browser once per angler. */
  const [nightLine, setNightLineOut] = useState<NightLine | null>(null);
  useEffect(() => {
    setNightLineOut(profile?.userId ? loadNightLine(profile.userId) : null);
  }, [profile?.userId]);
  const keepNightLine = (userId: string, line: NightLine | null) => {
    saveNightLine(userId, line);
    setNightLineOut(line);
  };
  useTurnsOver(nightLine, nightLineState, nightLineNextChange);
  // Worms dug for the day: a fresh one on a washed-out hook, or one out on a night line, comes from the tin.
  const [worms, setWorms] = useState(WORM_TIN_DAILY);
  const wormsRef = useRef(WORM_TIN_DAILY);
  const keepWorms = (next: number) => {
    wormsRef.current = next;
    setWorms(next);
    if (anglerIdRef.current) saveTin(anglerIdRef.current, next);
  };
  /** Spare live shiners in the angler's bait bucket, read from the browser once per angler; the ref is what actions count from. */
  const [bucket, setBucket] = useState(0);
  /** When each spare shiner went in, oldest first: the oldest goes out first, before it dies. */
  const bucketRef = useRef<number[]>([]);
  /** The shack's aerator fitted to the bait bucket: its spare shiners keep a day longer. */
  const aerator = profile?.aerator === true;
  const aeratorRef = useRef(aerator);
  aeratorRef.current = aerator;
  /** The worm tin's place in the shack's cool worm bin: in summer its worms keep a day longer. */
  const wormBin = profile?.wormBin === true;
  const wormBinRef = useRef(wormBin);
  wormBinRef.current = wormBin;
  /** Bread crumb in the groundbait: a swim baited with it and left behind holds the gathered feeders longer. */
  const breadCrumb = profile?.breadCrumb === true;
  const breadCrumbRef = useRef(breadCrumb);
  breadCrumbRef.current = breadCrumb;
  /** What died in the bucket and the tin since the last visit, said on sign-in; the primed swim's line adds to it, not over it. */
  const baitDiedRef = useRef("");
  // The bait kept from an earlier visit, read when the angler signs in: the bucket's shiners and the tin's worms may have died since.
  useEffect(() => {
    const kept = profile?.userId ? loadBucket(profile.userId, Date.now(), season, aeratorRef.current) : { shiners: [], died: 0 };
    bucketRef.current = kept.shiners;
    setBucket(kept.shiners.length);
    const tin = profile?.userId ? loadTin(profile.userId, new Date(), season, wormBinRef.current) : { worms: WORM_TIN_DAILY, died: 0 };
    wormsRef.current = tin.worms;
    setWorms(tin.worms);
    if (profile?.userId && kept.died > 0) saveBucket(profile.userId, kept.shiners);
    const shinersDied =
      kept.died === 0
        ? ""
        : season === "winter"
          ? t("{n} of the shiners in your bait bucket died while you were away: in the cold winter water they keep five days.", { n: kept.died })
          : season === "summer"
            ? t("{n} of the shiners in your bait bucket died while you were away: in the summer heat they keep two days.", { n: kept.died })
            : t("{n} of the shiners in your bait bucket died while you were away: they keep three days.", { n: kept.died });
    const aeratedDied = kept.died > 0 && aeratorRef.current ? `${shinersDied} ${t("Your aerator keeps them a day longer.")}` : shinersDied;
    const wormsDied =
      tin.died === 0
        ? ""
        : wormBinRef.current
          ? t("{n} of the worms left in your tin died in the summer heat while you were away: even in the worm bin they keep only to the next day.", { n: tin.died })
          : t("{n} of the worms left in your tin died in the summer heat while you were away: they keep only the day they are dug or bought.", { n: tin.died });
    baitDiedRef.current = [aeratedDied, wormsDied].filter(Boolean).join(" ");
    if (baitDiedRef.current) setHint(baitDiedRef.current);
  }, [profile?.userId]);
  const keepBucket = (userId: string, shiners: number[]) => {
    bucketRef.current = liveShiners(shiners, Date.now(), season, aeratorRef.current);
    saveBucket(userId, bucketRef.current);
    setBucket(bucketRef.current.length);
  };
  /** The spare shiners alive right now: one whose days in the bucket ran out during the visit has died. */
  const bucketNow = () => liveShiners(bucketRef.current, Date.now(), season, aeratorRef.current);
  /** The shiner trap by the shack, read when the angler signs in. */
  const [trap, setTrapState] = useState<Trap | null>(null);
  const trapRef = useRef<Trap | null>(null);
  const keepTrap = (userId: string, next: Trap | null) => {
    trapRef.current = next;
    saveTrap(userId, next);
    setTrapState(next);
  };
  useEffect(() => {
    trapRef.current = profile?.userId ? loadTrap(profile.userId) : null;
    setTrapState(trapRef.current);
  }, [profile?.userId]);
  useTurnsOver(trap, trapState, trapNextChange);
  /** The bucket with a fresh shiner in, or with its oldest one taken out. */
  const bucketIn = () => [...bucketNow(), Date.now()];
  const bucketOut = () => bucketNow().slice(1);
  const legendRef = useRef(legend);
  legendRef.current = legend;
  const lodgeReleasedRef = useRef(lodgeReleased);
  lodgeReleasedRef.current = lodgeReleased;
  /** Other anglers' let-go fish landed this visit, out of the lake till the list is read again. */
  const landedTagsRef = useRef(new Set<string>());
  const risingRef = useRef(rising);
  risingRef.current = rising;
  const windRef = useRef(wind);
  windRef.current = wind;
  const windDriftRef = useRef(windDrift);
  windDriftRef.current = windDrift;
  const hourRef = useRef(hour);
  hourRef.current = hour;
  const skyRef = useRef(sky);
  skyRef.current = sky;
  const castRiseRef = useRef(false);
  /** The school a landed panfish left at its bank, for the next casts there. */
  const schoolRef = useRef<School | null>(null);
  /** The groundbait tossed off a bank, for the next casts there. */
  const groundbaitRef = useRef<Groundbait | null>(null);
  /** The bank where a fish was just lost; its next cast waits longer. */
  const spookRef = useRef<SpotId | null>(null);
  /** The run of casts at one bank; a long one makes its fish wary until the angler moves. */
  const pressureRef = useRef<Pressure>({});
  /** The kinds of lure each bank's fish have seen this visit, so a new kind can catch the wary ones off guard. */
  const shownRef = useRef<LuresShown>({});
  /** The banks cast at this visit; the first cast at each meets fish that haven't seen a lure today. */
  const fishedRef = useRef<ReadonlySet<SpotId>>(new Set());
  /** A big fish that broke off, waiting to bite again at its bank. */
  const gotAwayRef = useRef<GotAway | null>(null);
  /** This bite is that fish come back. */
  const againRef = useRef(false);
  /** The fish on now is the hunter that followed a small fish in. */
  const followedRef = useRef(false);
  /** The fish biting now is the one that dropped the bait on the last cast. */
  const droppedRef = useRef(false);
  /** The fish on now is one let go at this bank on an earlier day, come back grown. */
  const recaughtRef = useRef<Recaught | null>(null);
  /** The bite came from a feeder the groundbait drew in, for the landed card to say so. */
  const fedRef = useRef<"fed" | "big" | null>(null);
  /** This bite is a hunter come to the live shiner. */
  const shinerTakenRef = useRef(false);
  /** The hunter that will follow this small fish in if it isn't grabbed, with the weight it bites at. */
  const followRef = useRef<{ species: FishSpecies; weight: number } | null>(null);
  /** The last cast landed in the middle of the sweet band. */
  const castPerfectRef = useRef(false);
  /** The lure landed far out, where the stretching line soaks up the strike. */
  const castLongRef = useRef(false);
  /** This cast skipped under the dock's planks. */
  const castSkipRef = useRef(false);
  /** This cast landed tight to a lily pad bed, where the bass and pike lie in ambush. */
  const castPadsRef = useRef(false);
  /** This cast landed on the point's rock edge, just past the shallow rocks. */
  const castEdgeRef = useRef(false);
  /** This cast landed tight to the far rock out in the open water. */
  const castFarRockRef = useRef(false);
  /** Whether this cast landed in one of the wind's foam lanes. */
  const castFoamRef = useRef(false);
  /** Whether the last cast landed on the sunfish beds either side of the dock, where the perch and smallmouth raid the eggs. */
  const castBedRef = useRef(false);
  /** Whether the last cast hopped a jig over the crayfish bed round the dock's pilings, where the smallmouth and catfish hunt them. */
  const castCrayfishRef = useRef(false);
  /** Whether the last cast landed among a school of spring tadpoles in the shallows, where the fish come to gorge on them. */
  const castTadpoleRef = useRef(false);
  const castFryRef = useRef(false);
  const castLogRef = useRef(false);
  const castBugRef = useRef(false);
  const castMinnowRef = useRef(false);
  const castMidgeRef = useRef(false);
  /** How the last cast fished the duckweed: a popper riding over a mat, a lure bearded with it, or neither. */
  const castWeedRef = useRef<"topwater" | "fouled" | null>(null);
  /** This cast went in over the groundbait, so a school landed from it stays to feed. */
  const castBaitedRef = useRef(false);
  /** How often the swim this cast went in over was topped up, so a big feeder lost from it scatters a built one. */
  const castBuiltRef = useRef(0);
  /** The hook went in solid on a quick strike. */
  const hookedSolidRef = useRef(false);
  /** A pike waiting to hit the shiner on the line, and the angler it was rolled for. */
  const grabRef = useRef<{ predator: FishSpecies; profile: Profile } | null>(null);
  /** The hunter that comes for the small fish on the line once it has fluttered long enough, and how long it has so far. */
  const flutterRef = useRef<{ predator: FishSpecies; profile: Profile } | null>(null);
  const flutterSecRef = useRef(0);
  /** The small fish the one on the line took, by id. */
  const grabbedRef = useRef<string | undefined>(undefined);
  /** This fish came back for a second take after dropping the bait. */
  const secondTakeRef = useRef(false);
  /** A topwater lure sitting before the bite: when the bite is due, how to bring it on, and the pops so far. */
  // When the bait's bite is due, so a strike at a nibble can yank it away and put the bite off.
  const yankRef = useRef<{ dueAt: number; take: () => void } | null>(null);
  // The yank just made, so a camera pinch whose first finger looked like a strike can take it back.
  const yankedRef = useRef<{ dueAt: number; take: () => void; at: number } | null>(null);
  /** The bite the wait is building to, and when, so a strike at nothing can push it back. */
  const biteDueRef = useRef<{ dueAt: number; take: () => void } | null>(null);
  /** When the last strike at nothing came, so a camera pinch's first finger can take it back. */
  const falseStrikeAtRef = useRef<number | null>(null);
  const scheduleBite = (take: () => void, ms: number) => {
    window.clearTimeout(timers.current.wait);
    timers.current.wait = window.setTimeout(take, ms);
    biteDueRef.current = { dueAt: performance.now() + ms, take };
  };
  /** Moves the coming bite by `ms`, keeping the lure work's and the yank's own clocks in step. */
  const shiftBite = (ms: number) => {
    const due = biteDueRef.current;
    if (!due) return;
    scheduleBite(due.take, Math.max(0, due.dueAt - performance.now() + ms));
    const dueAt = biteDueRef.current!.dueAt;
    if (popRef.current) popRef.current.dueAt = dueAt;
    if (yankRef.current) yankRef.current.dueAt = dueAt;
  };
  /** A strike at nothing: the fish backs off a moment, though a beginner's easy fish doesn't mind. */
  const strikeAtNothing = () => {
    if (!biteDueRef.current || mercyRef.current) return false;
    shiftBite(FALSE_STRIKE_MS);
    falseStrikeAtRef.current = performance.now();
    return true;
  };
  /** A pike-family fish following the lure to the bank: when it turns, when it leaves, and its take if the angler times the figure-eight. */
  const figureRef = useRef<{ turnAt: number; endAt: number; take: () => void; fish: { species: FishSpecies; weight: number } } | null>(null);
  /** What the scene shows of a follow: the pike trailing the lure, then turning. */
  const [follow, setFollow] = useState<"follow" | "turn" | null>(null);
  /** A follower that turned away without taking: like a dropped fish, it stays about for a cast straight back. */
  const turnAway = (figure: { fish: { species: FishSpecies; weight: number } }, message = t("It turned away and sank back into the deep."), hint = t("A follower turns away unless you figure-eight the lure as it turns. Cast again.")) => {
    figureRef.current = null;
    setFollow(null);
    setOutcome({ kind: "miss", message, fish: figure.fish });
    if (!gotAwayRef.current) gotAwayRef.current = gotAwayAfterDrop(figure.fish.species, figure.fish.weight, spotRef.current, recaughtRef.current);
    resetToIdle(hint, "result");
  };
  const popRef = useRef<{ dueAt: number; take: () => void; pops: number; work: "pop" | "hop" | "lift" | "strip" | "pause" | "twitch"; taps: number; lastAt: number; season: LakeSeason | undefined } | null>(null);
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
  // Handfuls left in the bag this visit, and the bank the last one still feeds, so the page can offer and show it.
  // A handful comes free once a day; ones bought at the shack stay in the bag across a reload.
  const [handfuls, setHandfuls] = useState(GROUNDBAIT_HANDFULS);
  const handfulsRef = useRef(GROUNDBAIT_HANDFULS);
  /** A handful thrown or bought is kept for the angler it belongs to. */
  const keepHandfuls = (next: number) => {
    handfulsRef.current = next;
    setHandfuls(next);
    if (anglerIdRef.current) saveBag(anglerIdRef.current, next);
  };
  // Each angler's own bag, read when they sign in.
  useEffect(() => {
    handfulsRef.current = profile?.userId ? loadBag(profile.userId) : GROUNDBAIT_HANDFULS;
    setHandfuls(handfulsRef.current);
  }, [profile?.userId]);
  /** The line came out of a fight over the rocks or round a piling frayed, and snaps sooner until retied. */
  const frayedRef = useRef(false);
  const [frayed, setFrayed] = useState(false);
  const markFrayed = (next: boolean) => {
    frayedRef.current = next;
    setFrayed(next);
  };
  /** Spinner casts since the last knot; enough of them twist the line until it is retied. */
  const twistRef = useRef(0);
  const [twisted, setTwisted] = useState(false);
  const setTwist = (next: number) => {
    twistRef.current = next;
    setTwisted(isTwisted(next));
  };
  /** Working a lure off the rocks blunts its hook point, so the strike has to be quicker to set solid until it is touched up. */
  const dullRef = useRef(false);
  const [dulled, setDulled] = useState(false);
  const markDull = (next: boolean) => {
    dullRef.current = next;
    setDulled(next);
  };
  /** Casts on the worm since a fresh one went on; enough of them wash its scent out until it is swapped for a fresh one. */
  const soakRef = useRef(0);
  const [washed, setWashed] = useState(false);
  const setSoak = (next: number) => {
    soakRef.current = next;
    setWashed(isWashedOut(next));
  };
  /** This cast went out on a washed-out worm, so its bite comes slower. */
  const castWashedRef = useRef(false);
  /** A landed golden shiner hooked back on as live bait, or one bought at the shack, for the next cast. */
  const liveShinerRef = useRef(false);
  /** The shiner on the hook was landed in a clean fight, so it swims hard and draws more of the hunters. */
  const livelyShinerRef = useRef(false);
  const [liveShiner, setLiveShiner] = useState(false);
  const [livelyShiner, setLivelyShiner] = useState(false);
  const hookShiner = (next: HookedShiner) => {
    liveShinerRef.current = next !== null;
    livelyShinerRef.current = next === "lively";
    setLiveShiner(next !== null);
    setLivelyShiner(next === "lively");
    if (anglerIdRef.current) saveShiner(anglerIdRef.current, next);
  };
  // The angler's own hook, left on before a reload, read when they sign in.
  useEffect(() => {
    const kept = profile?.userId ? loadShiner(profile.userId) : null;
    liveShinerRef.current = kept !== null;
    livelyShinerRef.current = kept === "lively";
    setLiveShiner(kept !== null);
    setLivelyShiner(kept === "lively");
  }, [profile?.userId]);
  const [groundbait, setGroundbait] = useState<Groundbait | null>(null);
  /** When the swim's handful went in, whether it has primed once, and whether bread crumb went in with it, kept with it for the next visit. */
  const swimRef = useRef<{ at: number; primed: boolean; bread: boolean }>({ at: 0, primed: false, bread: false });
  /** The groundbait out now is a swim left from an earlier visit that the feeders have gathered over. */
  const [swimPrimed, setSwimPrimed] = useState(false);
  const keepGroundbait = (next: Groundbait | null, thrown?: number) => {
    if (thrown !== undefined) {
      swimRef.current = { at: thrown, primed: false, bread: breadCrumbRef.current };
      setSwimPrimed(false);
    }
    groundbaitRef.current = next;
    setGroundbait(next);
    if (anglerIdRef.current) saveSwim(anglerIdRef.current, next ? { ...next, at: swimRef.current.at, ...(swimRef.current.primed ? { primed: true } : {}), ...(swimRef.current.bread ? { bread: true } : {}) } : null);
  };
  // The angler's swim from an earlier visit, read when they sign in: left long enough for the season, the feeders have gathered over it, once, fewer of them in the rain.
  useEffect(() => {
    const swim = profile?.userId ? loadSwim(profile.userId) : null;
    const now = swimNow(swim, Date.now(), season, sky);
    groundbaitRef.current = now ? { spot: now.spot, casts: now.casts, ...(now.built ? { built: now.built } : {}), ...(now.spooked ? { spooked: now.spooked } : {}), ...(now.worm ? { worm: true } : {}), ...(now.landedBig ? { landedBig: now.landedBig } : {}) } : null;
    swimRef.current = { at: now?.at ?? 0, primed: !!now?.primed, bread: !!now?.bread };
    setSwimPrimed(!!now?.primed);
    setGroundbait(groundbaitRef.current);
    if (profile?.userId && swim && !now) saveSwim(profile.userId, null);
    if (now?.primedNow && profile?.userId) {
      saveSwim(profile.userId, { spot: now.spot, casts: now.casts, at: now.at, primed: true, ...(now.bread ? { bread: true } : {}), ...(now.worm ? { worm: true } : {}), ...(now.landedBig ? { landedBig: now.landedBig } : {}) });
      const left = { bank: t(SPOT_LABELS[now.spot]), casts: now.casts };
      const primed = now.bread
        ? t("The groundbait and bread crumb you left at the {bank} have the feeders gathered there: {casts} casts of it.", left)
        : t("The groundbait you left at the {bank} has the feeders gathered there: {casts} casts of it.", left);
      const washed = sky === "rain" ? t("The rain washed {n} casts of it away.", { n: RAIN_WASHED_CASTS }) : "";
      setHint([baitDiedRef.current, primed, washed].filter(Boolean).join(" "));
    }
  }, [profile?.userId]);
  /** The bank whose next cast meets wary fish, for the stance chip to say so before the cast. */
  const [fishedHard, setFishedHard] = useState<readonly SpotId[]>([]);
  const [lurking, setLurking] = useState(false);
  const [lurkerCloseInMs, setLurkerCloseInMs] = useState(0);
  /** How long this bite's fish holds the bait, so the strike cue runs out when it lets go. */
  const [strikeWindowMs, setStrikeWindowMs] = useState(0);
  const [hint, setHint] = useState(() => t("Walk to the water."));
  /** The angler's headlamp, switched on by the player; it only lights the water at night. */
  const [lamp, setLamp] = useState(false);
  const lampRef = useRef(false);
  lampRef.current = lamp;
  /** Whether the headlamp lit the water when this cast went out; the cast keeps it, slow bite and long strike alike. */
  const castLampRef = useRef(false);
  /** The line on the reel when this cast went out; its fight snaps by it. */
  const castLineRef = useRef<LineWeight>("standard");
  // Night's end switches the lamp off, so the next night starts dark.
  useEffect(() => {
    if (hour !== "night") setLamp(false);
  }, [hour]);
  /** The reasons past WAIT_REASONS the cast's hint left out, with the hint they belong to. */
  const [moreReasons, setMoreReasons] = useState<{ hint: string; more: readonly string[] }>({ hint: "", more: NO_REASONS });
  const [stance, setStance] = useState<StanceId>("shop");
  const [shopTap, setShopTap] = useState(0);
  const [hotspot, setHotspot] = useState<Hotspot | null>(null);
  /** Whether the bubble patch is in a feeding frenzy right now. */
  const [frenzy, setFrenzy] = useState(false);
  /** This cast landed in the bubbles while they boiled in a frenzy. */
  const castFrenzyRef = useRef(false);
  /** A frenzy began while the line was out, so its start is told on the return to idle. */
  const frenzyUnheardRef = useRef(false);
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
    biteDueRef.current = null;
    falseStrikeAtRef.current = null;
    window.clearTimeout(timers.current.hook);
    window.clearTimeout(timers.current.snap);
    timers.current.nibbles?.forEach((id) => window.clearTimeout(id));
    timers.current.figure?.forEach((id) => window.clearTimeout(id));
    figureRef.current = null;
    setFollow(null);
    window.clearTimeout(timers.current.snag);
    timers.current.shown?.();
    timers.current = {};
    snagRef.current = null;
  };

  const clearFight = () => {
    grabRef.current = null;
    flutterRef.current = null;
    flutterSecRef.current = 0;
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
    castFrenzyRef.current = false;
    castRiseRef.current = false;
    castPerfectRef.current = false;
    castSkipRef.current = false;
    castPadsRef.current = false;
    castEdgeRef.current = false;
    castFarRockRef.current = false;
    castFoamRef.current = false;
    castBedRef.current = false;
    castCrayfishRef.current = false;
    castTadpoleRef.current = false;
    castFryRef.current = false;
    castLogRef.current = false;
    castBugRef.current = false;
    castMinnowRef.current = false;
    castMidgeRef.current = false;
    castWeedRef.current = null;
    secondTakeRef.current = false;
    powerRef.current = 0;
    clearFight();
    setPhaseBoth(phase);
    const moved = phase === "idle" && movedUnheardRef.current ? hotspotRef.current : null;
    if (moved) movedUnheardRef.current = false;
    const frenzyNow = phase === "idle" && frenzyUnheardRef.current && frenzyOn(Date.now()) ? hotspotRef.current : null;
    if (phase === "idle") frenzyUnheardRef.current = false;
    setHint(moved ? movedHint(moved.spot) : frenzyNow ? frenzyHint(frenzyNow.spot) : message);
  }, []);

  const beginFight = useCallback((species: FishSpecies, weight: number, current: Profile, strike?: { elapsedMs: number; solidMs: number; windowMs: number }) => {
    const solid = strike !== undefined && strike.elapsedMs <= strike.solidMs;
    const late = strike !== undefined && !solid && isLightHook(strike.elapsedMs, strike.windowMs);
    // Live bait held that long is swallowed, so a late strike still hooks deep rather than light.
    const deep = late && (isLiveBait(lureRef?.current) || shinerTakenRef.current);
    const lightHook = late && !deep;
    const underpowered = !canLand(current, species);
    // A fish hooked tight to the lily pads dives for the stems, so the fight there is a weed fight whatever the bank;
    // one hooked tight to the sunken log from the bank runs for the log and can wrap the line round it (out on the boat, the hull swings clear).
    const pads = castPadsRef.current;
    const water: FightWater = pads ? "weeds" : castLogRef.current && spotRef.current !== "open" ? "log" : fightWater(spotRef.current);
    const windy = fightWind(windRef.current);
    // One hooked tight to the far rock from the boat runs round the rock, dragging the line over it unless turned.
    const farRock = castFarRockRef.current && water === "boat";
    // One hooked through a duckweed mat comes in under a ball of weed until it runs.
    const weedBall = castWeedRef.current !== null;
    // One hooked along the point's rock edge dives off the ledge, clear of the shallow rocks.
    const edge = castEdgeRef.current && water === "rocks";
    // An egg raider hooked on the sunfish beds bolts from the guarding sunfish.
    const bed = castBedRef.current && BED_RAIDERS.has(species.id);
    // One hooked in a foam lane on a windy day fights where the wind's drift is strongest.
    const foam = castFoamRef.current && windy !== undefined;
    // One that rose to the hatching bugs or midges is already at the top, so a jumper leaps on its first run, as off a popper.
    const rising = (castBugRef.current || castMidgeRef.current) && !isTopwater(lureRef?.current) && season !== "winter";
    // One hooked among the lantern's minnows at night sees the net in the light, if it comes to the net at all.
    const lantern = castMinnowRef.current && netsFish(species, mercyRef.current);
    // One hooked chasing the kingfisher's fry is fired up.
    const fired = castFryRef.current;
    const hookWise = !!(recaughtRef.current?.foe || recaughtRef.current?.lost);
    const next = { species, weight, underpowered, water, windy, lightHook, line: castLineRef.current, pads, farRock, weedBall, edge, bed, foam, rising, lantern, fired, hookWise, strongLift: liftsStickerInOne(species.id, current.strength) };
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
      const runtime = makeFight(species, weight, current.strength, Math.random, fishTireMulForLevel(anglerLevel(current.lifetimePoints)) * seasonTireMul(season, species.id) * warmTireMul(season, species.id, sky, spotRef.current) * runTireMul(season, species.id) * nestTireMul(season, species.id, spotRef.current) * nightTireMul(hourRef.current, species.id) * spentTireMul(season, species.id) * twilightTireMul(hourRef.current, species.id) * springRunTireMul(season, species.id, spotRef.current) * currentTireMul(species.id, spotRef.current) * fallFeedTireMul(season, species.id) * rainHunterTireMul(sky, species.id) * summerStrengthTireMul(season, species.id), water, windy, isTopwater(lureRef?.current) || rising, hasTrebles(lureRef?.current) || deep, seasonTireMul(season, species.id) > 1, isTrophyWeight(species, weight), floodedInlet(spotRef.current, season, sky), frayedRef.current, deep, lineSnapForLevel(anglerLevel(current.lifetimePoints)), turnCutMulForLevel(anglerLevel(current.lifetimePoints)), netsFish(species, mercyRef.current), { farRock, weedBall, edge, bed, foam, lantern, fired: fired || hookWise, lineSnap: LINE_SNAP[castLineRef.current] });
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
        // Missed that, the hunter may still come for it if the angler lets it flutter.
        const flutterer = predator ? null : flutterGrabberFor(species.id, spotRef.current, current, mercyRef.current, Math.random());
        flutterRef.current = flutterer ? { predator: flutterer, profile: current } : null;
        flutterSecRef.current = 0;
        const follower = predator ? null : followerFor(species.id, spotRef.current, current, mercyRef.current, Math.random());
        followRef.current = follower ? downAtBank(makeCatch(follower, current.patience, anglerLevel(current.lifetimePoints)), fishedDownRef.current.has(spotRef.current) && !mercyRef.current) : null;
      }
      if (solid) runtime.sim.stamina = Math.min(runtime.sim.stamina, SOLID_HOOK_STAMINA);
      // A late strike only just catches, so the hook can pull out like a soft mouth's.
      runtime.sim.lightHook = lightHook;
      const line = fightLines(species.challenge)[0];
      const again = !strike ? "" : againRef.current ? `${followedRef.current ? t("It's the one that followed your fish in!") : droppedRef.current ? t("It's the one that dropped your bait!") : t("It's the one that got away!")} ` : recaughtRef.current ? `${recaughtRef.current.lost ? t("It's the trophy {name} lost!", { name: recaughtRef.current.lost.by }) : recaughtRef.current.foe ? t("It's the trophy that broke you off!") : recaughtRef.current.giant ? t("It's {name}, the bank's giant!", { name: t(recaughtRef.current.giant) }) : recaughtRef.current.tag ? t("It's a fish {name} let go!", { name: recaughtRef.current.tag.by }) : t("It's a fish you let go here before!")} ` : shinerTakenRef.current ? `${t("It took the live shiner!")} ` : "";
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
      const basking = summerStrengthTireMul(season, species.id) >= 1 ? "" : `${t("It thrives in the warm summer water and is at its strongest, so it tires slower.")} `;
      const spent = spentTireMul(season, species.id) <= 1 ? "" : `${t("It's worn from spawning, so it tires sooner.")} `;
      const flood = floodedInlet(spotRef.current, season, sky) ? `${t("The swollen inlet pulls harder on a slack line.")} ` : "";
      const warm = rainCooled(season, species.id, sky) ? `${t("The rain has cooled the water, so it keeps its strength.")} ` : deepCooled(season, species.id, spotRef.current) ? `${t("It has found cool water down deep, so it keeps its strength.")} ` : warmTireMul(season, species.id, sky, spotRef.current) <= 1 ? "" : `${t("The warm water leaves it short of air, so it tires sooner.")} `;
      // A salmon on its fall spawning run is full of fight.
      const run = runTireMul(season, species.id) >= 1 ? "" : `${t("It's on its fall run and full of fight, so it tires slower.")} `;
      // A spring bass hooked by its nest fights hard to guard it.
      const nest = nestTireMul(season, species.id, spotRef.current) >= 1 ? "" : `${t("It's guarding its nest, so it fights harder and tires slower.")} `;
      // A catfish or burbot is out hunting after dark, at its strongest.
      const hunter = nightTireMul(hourRef.current, species.id) >= 1 ? "" : `${t("It's out hunting after dark and fights at full strength, so it tires slower.")} `;
      // On a small fish where a bigger one hunts it, say how to draw the hunter.
      const flutter = strike ? flutterTip(species.id, spotRef.current, current, mercyRef.current) : "";
      if (heavy) {
        fx.lift();
        fx.haptic("lift");
      }
      // The strike's time is told, so the angler learns how quick a solid hook has to be.
      setHint(
        again + heavy + [cold, warm, run, nest, hunter, dim, upriver, stream, fed, murky, basking, spent, flood].filter(Boolean).slice(0, TIRE_REASONS).join("") +
        (!strike
          ? t("{line}. Ease off when it runs.", { line })
          : solid
            ? t("Hooked solid in {time} s! {line}. Ease off when it runs.", { time: seconds(strike.elapsedMs), line })
            : lightHook
              ? t("Hooked light in {time} s, it only just caught. Keep it out of the red. {line}.", { time: seconds(strike.elapsedMs), line })
            : deep && TOOTHY.has(species.id)
              ? t("It swallowed the bait: hooked deep in {time} s, with its teeth on the line. Land it quick. {line}. Ease off when it runs.", { time: seconds(strike.elapsedMs), line })
            : deep
              ? t("It swallowed the bait: hooked deep in {time} s. {line}. Ease off when it runs.", { time: seconds(strike.elapsedMs), line })
            : dullRef.current
              ? t("Hooked in {time} s (solid under {limit} s on the dull hook). {line}. Ease off when it runs.", {
                  time: seconds(strike.elapsedMs),
                  limit: seconds(strike.solidMs),
                  line,
                })
            : castLongRef.current
              ? t("Hooked in {time} s (solid under {limit} s this far out, where the line stretches). {line}. Ease off when it runs.", {
                  time: seconds(strike.elapsedMs),
                  limit: seconds(strike.solidMs),
                  line,
                })
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
                })) +
        (flutter ? ` ${flutter}` : ""),
      );
    }
  }, [resetToIdle, season, sky]);

  const setTheHook = useCallback(() => {
    if (phaseRef.current !== "hookset" || !profile) return;
    const bitten = biteRef.current;
    if (!bitten) return;
    window.clearTimeout(timers.current.hook);
    const { at, ms } = biteWindowRef.current;
    const strike = { elapsedMs: Math.max(0, performance.now() - at), solidMs: solidStrikeMs(ms, fightWind(windRef.current), lureRef?.current, dullRef.current, castLongRef.current, anglerLevel(profile.lifetimePoints), luckyLuresRef.current.has(lureRef?.current ?? "")), windowMs: ms };
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
    // On the beds, the crayfish or the tadpoles the fish come in to the prey however close it lies, so the short-cast line isn't told there.
    const shortTold = shortCast && !castBedRef.current && !castCrayfishRef.current && !castTadpoleRef.current && !castFryRef.current && !castBugRef.current && !castMinnowRef.current && !castMidgeRef.current;
    waitHintRef.current = shortTold ? shortHint() : waitHint();
    if (castHotspotRef.current) waitHintRef.current = shortTold ? `${shortHint()} ${hotspotWaitHint()}` : hotspotWaitHint();
    else if (castRiseRef.current) waitHintRef.current = `${t("Right on a rise.")} ${waitHintRef.current}`;
    if (castPerfectRef.current) waitHintRef.current = `${t("Perfect cast.")} ${waitHintRef.current}`;
    if (castSkipRef.current) waitHintRef.current = `${t("Skipped it under the dock, into the shade.")} ${waitHintRef.current}`;
    if (castPadsRef.current) waitHintRef.current = `${t("Tight to the lily pads, where the bass and pike wait in ambush.")} ${waitHintRef.current}`;
    if (castEdgeRef.current) waitHintRef.current = `${t("Along the rock edge, where the point drops off and the bass hold.")} ${waitHintRef.current}`;
    if (castFarRockRef.current) waitHintRef.current = `${t("Tight to the far rock, where the walleye hold in its shadow.")} ${waitHintRef.current}`;
    if (castFoamRef.current) waitHintRef.current = `${t("Right in a foam lane, where the wind gathers drowned insects and the fish feed along it.")} ${waitHintRef.current}`;
    if (castWeedRef.current === "topwater") waitHintRef.current = `${t("Over the duckweed, where the bass lurk in its shade for a lure on top.")} ${waitHintRef.current}`;
    if (castWeedRef.current === "fouled" && !mercyRef.current) waitHintRef.current = `${t("Into the duckweed: the lure comes through bearded with weed, and the fish turn from it.")} ${waitHintRef.current}`;
    if (castMidgeRef.current) waitHintRef.current = `${t("Under a cloud of dancing midges, where the fish rise to the ones that fall to the water.")} ${waitHintRef.current}`;
    if (castMinnowRef.current) waitHintRef.current = `${t("Among the minnows in the lanterns' light, where the crappie, walleye and bass hunt them.")} ${waitHintRef.current}`;
    if (castBugRef.current) waitHintRef.current = `${t("Among the bugs skating on the surface, where the fish are looking up for them.")} ${waitHintRef.current}`;
    if (castLogRef.current) waitHintRef.current = `${t("Tight to the sunken log, where the fish hold in its shade.")} ${waitHintRef.current}`;
    if (castFryRef.current) waitHintRef.current = `${t("Over the fry the kingfisher dives on, where the perch and bass hunt them too.")} ${waitHintRef.current}`;
    if (castTadpoleRef.current) waitHintRef.current = `${t("Among the tadpoles in the warm shallows, where the fish come to gorge on them.")} ${waitHintRef.current}`;
    if (castCrayfishRef.current) waitHintRef.current = `${t("Hopped over the crayfish by the pilings, where the smallmouth and catfish hunt them.")} ${waitHintRef.current}`;
    if (castBedRef.current) waitHintRef.current = `${t("On the sunfish beds, where the perch and smallmouth come to raid the eggs.")} ${waitHintRef.current}`;
    const school = castIntoSchool(schoolRef.current, spotRef.current);
    schoolRef.current = school.next;
    // A beginner still on their first catches is spared the spooked wait, and rain on the water covers the lost fish's splash.
    const spookedBank = castIntoSpooked(spookRef.current, spotRef.current) && !mercyRef.current;
    const rainCover = spookedBank && sky === "rain";
    const spooked = spookedBank && !rainCover;
    spookRef.current = null;
    const bait = castOverGroundbait(groundbaitRef.current, spotRef.current);
    // A beginner is spared the overfed swim's slow bites, and told only of the groundbait.
    const full = bait.full && !mercyRef.current;
    castBaitedRef.current = bait.baited;
    castBuiltRef.current = bait.built;
    if (bait.baited) keepGroundbait(bait.next);
    const schoolFish = school.schoolId ? FISH.find((fish) => fish.id === school.schoolId) : undefined;
    setSchooled(!!schoolFish);
    if (schoolFish) waitHintRef.current = `${t("Into the school.")} ${waitHintRef.current}`;
    // Only told when the legend can take this cast: the angler can land it and the cast went out full.
    const huntedFish = legendRef.current?.spot === spotRef.current ? fishById(legendRef.current.legendId) : undefined;
    if (huntedFish && !short && legendaryCanBite(current, huntedFish, spotRef.current)) waitHintRef.current = `${t("The {fish} your hunt tracked down haunts this water.", { fish: t(huntedFish.name) })} ${waitHintRef.current}`;
    if (castFrenzyRef.current) waitHintRef.current = `${t("Into the frenzy! The baitfish boil and the hunters are slashing through them.")} ${waitHintRef.current}`;
    if (bait.baited) waitHintRef.current = `${full ? t("Over the groundbait, but the fish are still full from it.") : bait.spooked ? t("Over the groundbait, but its feeders are still scattered.") : t("Over the groundbait.")} ${waitHintRef.current}`;
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
    // In the last hour before the clouds turn to rain the air hangs heavy, and the fish feed hard ahead of it.
    const rainComingWait = preRainWaitMul(new Date(), sky);
    if (rainComingWait < 1) reasons.unshift(t("The air hangs heavy with the rain coming, and the fish feed hard ahead of it."));
    const fogLiftWait = fogLiftWaitMul(new Date(), sky);
    if (fogLiftWait < 1) reasons.unshift(t("The fog is burning off, and the fish move up to feed in the warming water."));
    // The bright morning after the rain sends the fish sulking deep, where only a slow jig or worm still reaches them; a beginner is spared it.
    const frontWait = mercyRef.current ? 1 : postFrontWaitMul(new Date(), sky, lureRef?.current);
    if (frontWait > 1) reasons.unshift(t("The sky is high and bright after yesterday's rain, and the fish sulk deep. A slow jig or worm still draws them."));
    // Under a clear summer midday sun the fish shun the bright open water.
    const glareWait = mercyRef.current ? 1 : openGlareWaitMul(spotRef.current, season, hour, sky);
    if (glareWait > 1) reasons.unshift(t("The midday glare drives the fish from the open water, so the bites come slow."));
    // On a moonless night the fish can barely see to feed.
    const darkWait = mercyRef.current ? 1 : darkNightWaitMul(hour, moon);
    if (darkWait > 1) reasons.unshift(t("There's no moon tonight and the fish can barely see to feed, so the bites come slow."));
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
    // A lure whose colour suits the light shows up to the fish sooner.
    const colour = colourSuits(lureRef?.current, sky, hour);
    const colourWait = colourWaitMul(lureRef?.current, sky, hour);
    if (colour === "bright") reasons.unshift(sky === "rain" || sky === "fog" || sky === "overcast" ? t("The bright lure shows up in the murk.") : t("The bright lure shows up in the low light."));
    else if (colour === "natural") reasons.unshift(t("In the clear daylight the natural colours look like the real thing."));
    else if (colour === "dark") reasons.unshift(t("The dark lure stands out against the night sky above it."));
    // A worm sinks down beside the dock's pilings, where the fish hide.
    const pilingWait = wormPilingWaitMul(lureRef?.current, spotRef.current);
    if (pilingWait < 1) reasons.unshift(t("The worm sinks down beside the pilings, where the fish hide."));
    // A spoon flutters down through the open water, where the hunters roam.
    const spoonWait = spoonOpenWaitMul(lureRef?.current, spotRef.current);
    if (spoonWait < 1) reasons.unshift(t("The spoon flutters down through the open water, where the hunters roam."));
    // A spinner's blade flickers along the reed edge, past the hunters in ambush.
    const reedWait = spinnerReedWaitMul(lureRef?.current, spotRef.current);
    if (reedWait < 1) reasons.unshift(t("The spinner's blade flickers along the reed edge, past the hunters lying in ambush."));
    // A float rig holds the bait still at the reed edge, over the panfish in the stems.
    const floatWait = floatReedWaitMul(lureRef?.current, spotRef.current);
    if (floatWait < 1) reasons.unshift(t("The float holds the bait still at the reed edge, right over the panfish hiding in the stems."));
    // A streamer darts up the drop-off's edge like a fleeing baitfish.
    const streamerWait = streamerLedgeWaitMul(lureRef?.current, spotRef.current);
    if (streamerWait < 1) reasons.unshift(t("The streamer darts up the ledge like a fleeing baitfish, right past the trout holding deep."));
    // The inlet's current tumbles a worm downstream like food washed in.
    const washWait = wormInletWaitMul(lureRef?.current, spotRef.current);
    if (washWait < 1) reasons.unshift(t("The current tumbles the worm downstream like food washed in from the stream."));
    // The inlet's current spins a spinner's blade hard even on a slow retrieve.
    const flowWait = spinnerInletWaitMul(lureRef?.current, spotRef.current);
    if (flowWait < 1) reasons.unshift(t("The current spins the blade hard even on a slow retrieve, and the fish in the flow come to it."));
    // A crankbait knocks off the dock's pilings and darts aside.
    const knockWait = crankPilingWaitMul(lureRef?.current, spotRef.current);
    if (knockWait < 1) reasons.unshift(t("The crankbait knocks off the pilings and darts aside, and the fish underneath strike at it."));
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
    // After dark the dock's lanterns draw minnows into their light, and the hunters follow; a cast right among them says so itself.
    const lanternWait = lanternDockWaitMul(spotRef.current, hour);
    if (lanternWait < 1 && !castMinnowRef.current) reasons.unshift(t("The dock lanterns draw minnows into their light, and the fish follow them in."));
    // A strong wind drives the baitfish onto the point, and the hunters follow.
    const blowWait = windPointWaitMul(spotRef.current, windRef.current);
    if (blowWait < 1) reasons.unshift(t("The wind drives the baitfish onto the point, and the hunters follow them in."));
    // A cloud sliding over the sun shades the water, and the fish move up into the shallows to feed while it lasts.
    const cloudWait = cloudShadeWaitMul(spotRef.current, sky, hour, Date.now());
    if (cloudWait < 1) reasons.unshift(t("A cloud slides over the sun, and the fish move up into the shallows to feed."));
    // While the moon passes overhead or underfoot the fish come on the feed, at every bank.
    const moonPass = moonPassing(new Date());
    const moonWait = moonPass ? MOON_FEED_WAIT : 1;
    if (moonPass === "overhead") reasons.unshift(t("The moon is passing overhead, and the fish come on the feed for an hour either side."));
    else if (moonPass === "underfoot") reasons.unshift(t("The moon is passing underfoot, on the far side of the earth, and the fish come on the feed for an hour either side."));
    // A light breeze blowing onto this bank pushes the warm surface water and its food in, and the fish follow.
    const windwardWait = windwardWaitMul(spotRef.current, windRef.current);
    if (windwardWait < 1) reasons.unshift(t("The breeze blows onto this bank and pushes the food in, and the fish follow it."));
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
    // While the lake turns over in late fall the stirred-up water puts the fish off, but the inlet's fresh stream water keeps them feeding; a beginner is spared the slow side. Told late, so the lake-wide news comes first.
    const turnoverWait = Math.min(turnoverWaitMul(new Date(), spotRef.current, season), mercyRef.current ? 1 : Infinity);
    if (turnoverWait > 1) reasons.unshift(t("The lake is turning over, and the stirred-up water puts the fish off. The inlet's fresh stream water still holds them."));
    else if (turnoverWait < 1) reasons.unshift(t("The lake is turning over, but the inlet's fresh stream water keeps its fish feeding."));
    // Water warming since yesterday wakes the fish to feed, and water cooling makes them sluggish; a beginner is spared the slow side.
    const swingWait = Math.min(waterSwingWaitMul(new Date()), mercyRef.current ? 1 : Infinity);
    if (swingWait < 1) reasons.unshift(t("The water has warmed since yesterday, and the fish wake up to feed."));
    else if (swingWait > 1) reasons.unshift(t("The water has cooled since yesterday, and the sluggish fish bite slow."));
    // A bank fished too long grows wary, and rests while the angler fishes elsewhere; fish feeding on groundbait don't mind, and a beginner is spared.
    // A kind of lure the wary fish haven't seen yet catches them off guard, and buys the bank a few more casts.
    const pressure = castUnderPressure(pressureRef.current, spotRef.current);
    const switched = castNewLure(shownRef.current, pressure.next, spotRef.current, lureRef?.current, pressure.pressured);
    pressureRef.current = switched.pressure;
    shownRef.current = switched.shown;
    setFishedHard(mercyRef.current ? [] : fishedHardBanks(switched.pressure));
    const pressureWait = pressure.pressured && !switched.relieved && !bait.baited && !mercyRef.current ? PRESSURE_WAIT : 1;
    if (pressureWait > 1) reasons.unshift(t("This water has been fished hard and the fish are wary of the line, so the bites come slow. Try another bank or another kind of lure."));
    else if (switched.relieved && !bait.baited && !mercyRef.current) reasons.unshift(t("The wary fish here haven't seen this kind of lure yet, so they come to it."));
    // A bank fished hard yesterday keeps its fish wary for today's first casts there, and another angler fishes one bank
    // each day, so its first casts meet fish already wary (told once, not stacked). Fish on groundbait don't mind, and a
    // beginner is spared.
    const banks = bankMemoryNow(current.userId);
    const unrelieved = !bait.baited && !mercyRef.current;
    const yesterdayWait = waryFromYesterday(banks, spotRef.current) && unrelieved ? YESTERDAY_WAIT : 1;
    const crowdedWait = yesterdayWait === 1 && crowdedBankForDay(new Date()) === spotRef.current && (banks.today.casts[spotRef.current] ?? 0) < CROWDED_CASTS && unrelieved ? CROWDED_WAIT : 1;
    keepBankMemory(current.userId, countAtBank(banks, spotRef.current, "casts"));
    if (yesterdayWait > 1) reasons.unshift(t("This bank was fished hard yesterday, so its fish are still wary for your first casts."));
    if (crowdedWait > 1) reasons.unshift(t("Another angler has been fishing this bank today, so its fish are wary for your first casts."));
    // The visit's first cast at a bank meets fish that haven't seen a lure today; it is told last, so the bank's own reasons come first.
    // The anchor's splash puts the fish down for a few seconds; a cast into it doesn't spend the fresh water's first look.
    const anchorWait = anchorSplashWaitMul(spotRef.current, boat.mode === "anchored" ? Date.now() - boat.anchoredAt : null);
    const fresh = anchorWait > 1 ? { fresh: false, next: fishedRef.current } : castOnFreshWater(fishedRef.current, spotRef.current);
    fishedRef.current = fresh.next;
    const freshWait = fresh.fresh ? FRESH_WAIT : 1;
    if (fresh.fresh) reasons.push(t("Fresh water: the fish here haven't seen a lure today."));
    // A worm soaked through many casts has lost its scent, so the fish are slow to find it; told ahead of the bank's reasons.
    const washedWait = castWashedRef.current ? WASHED_WAIT : 1;
    if (washedWait > 1) reasons.unshift(t("The worm has soaked pale and lost its scent, so the bites come slow. Put a fresh one on."));
    // With the low sun behind the angler, their long shadow falls across the water and the fish shy from it.
    const shadowWait = mercyRef.current ? 1 : longShadowWaitMul(spotRef.current, hour, sky);
    if (shadowWait > 1) reasons.unshift(t("The low sun behind you throws your shadow across the water, and the fish shy from it. Try another bank till the sun climbs or sets."));
    // A live shiner on the hook swims down and draws the bank's hunters; it goes out on this one cast, and is told first.
    const shiner = liveShinerRef.current;
    const lively = shiner && livelyShinerRef.current;
    if (shiner) {
      hookShiner(null);
      reasons.unshift(lively ? t("The lively shiner swims hard on the hook, and more of the hunters here come to it.") : t("The live shiner swims down off the hook, and the hunters here come to it."));
    }
    // Told late with the other slow sides the angler can switch off, so the two-reason cap keeps it.
    castLampRef.current = lampLit(lampRef.current, hour) && !mercyRef.current;
    const lampWait = castLampRef.current ? LAMP_WAIT : 1;
    if (lampWait > 1) reasons.unshift(t("Your headlamp shows the float plainly, but its light on the water puts the fish off."));
    // The line on the reel holds for the cast and its fight. Heavy line is a slow side told with the others the angler can
    // switch off; light line's speed-up is told last, after the bank's own reasons.
    castLineRef.current = settings.line;
    const lineWait = LINE_WAIT[castLineRef.current];
    if (lineWait > 1) reasons.unshift(t("Heavy line: the fish can see it, so the bites come slower."));
    else if (lineWait < 1) reasons.push(t("Light line: the fish can't see it, so the bites come sooner."));
    // Told last, so the two-reason cap always keeps it: waiting a few seconds is the fix.
    if (anchorWait > 1) reasons.unshift(t("The anchor's splash put the fish down, so the bites come slow: give it a few seconds before you cast."));
    waitHintRef.current = [...reasons.slice(0, WAIT_REASONS), waitHintRef.current].join(" ");
    setHint(waitHintRef.current);
    setMoreReasons({ hint: waitHintRef.current, more: reasons.slice(WAIT_REASONS) });
    // Roll the fish as the lure sits, so the one rising under the bobber is the one that bites.
    const mercyNow = mercyRef.current;
    const hunted = legendRef.current?.spot === spotRef.current ? legendRef.current.legendId : undefined;
    // The small feeders on a swim built all the way draw the bank's pike, when the tied lure would take one the angler can land.
    const prowling = bait.built >= TOPUP_MAX && !mercyNow ? prowlerAt(spotRef.current, lureRef?.current) : undefined;
    const prowler = prowling && canLand(current, prowling) ? prowling.id : undefined;
    const drawn = pickBite(spotRef.current, current, short, Math.random, hour, lureRef?.current, sky, castHotspotRef.current, mercyNow, season, moon, hunted, prowler);
    // The fish that broke off here may come back, at the same weight; while it's about this bank its shadow circles the float.
    setLurking(gotAwayRef.current?.spot === spotRef.current);
    // A giant that broke free of the tied lure this week will not take it again, whether still about or fresh.
    const shyNow = giantShyNow(current.userId);
    const lureShy = (giant: string | undefined) => !!giant && shyOf(shyNow, spotRef.current, giant, lureRef?.current);
    const waiting = gotAwayRef.current;
    const lost = castForGotAway(waiting, spotRef.current, waiting && lureShy(backAgain(waiting, openGiantsRef.current)?.giant) ? 1 : Math.random(), favorsLargeFish(lureRef?.current ?? ""), current.patience);
    gotAwayRef.current = lost.next;
    againRef.current = lost.again !== null;
    followedRef.current = !!lost.again?.follow;
    droppedRef.current = !!lost.again?.dropped;
    // A fish let go at this bank on an earlier day may come back to the line, a little heavier; a beginner's first fish stays an easy one.
    const released = lost.again || mercyNow ? null : castForReleased(loadReleased(), spotRef.current, Date.now(), Math.random(), lureRef?.current);
    if (released?.fish) saveReleased(released.next);
    // Failing that, one another angler let go here may come up, carrying their tag.
    const tagged = released && !released.fish && lodgeReleasedRef.current.length > 0 ? castForLodgeTag(lodgeReleasedRef.current, spotRef.current, Date.now(), Math.random(), takenTags(landedTagsRef.current, gotAwayRef.current), current) : null;
    // A let-go fish that broke off or dropped the bait is still that fish when it bites again.
    // Rarely, the bank's giant comes up, if no one has landed it this week and the angler's line could hold it.
    const bankGiant = !lost.again && !mercyNow && !released?.fish && !tagged ? openGiantsRef.current.find((one) => one.spot === spotRef.current) : undefined;
    const giant = bankGiant && !lureShy(bankGiant.name) ? bankGiant : undefined;
    const giantKind = giant ? FISH.find((fish) => fish.id === giant.speciesId) : undefined;
    const giantUp = giant && giantKind && canLand(current, giantKind) && Math.random() < GIANT_ODDS ? { species: giantKind, weight: giant.weight, was: giant.weight, at: Date.now(), giant: giant.name, ...(giant.bonus ? { giantBonus: giant.bonus } : {}) } : null;
    // Failing all those, the trophy that broke off here on an earlier day may be back.
    const storedFoe = loadOldFoe(current.userId);
    if (storedFoe && foeGone(storedFoe, Date.now())) saveOldFoe(current.userId, null);
    const foe = !lost.again && !mercyNow && !released?.fish && !tagged && !giantUp ? castForFoe(storedFoe, spotRef.current, Date.now(), Math.random()) : null;
    // Or a trophy another angler lost here may take.
    const ownFoe = foe && canLand(current, foe.species) ? foe : null;
    const lodgeFoe = !lost.again && !mercyNow && !released?.fish && !tagged && !giantUp && !ownFoe && lodgeLostRef.current.length > 0 ? castForLodgeLost(lodgeLostRef.current, spotRef.current, Math.random(), landedLostRef.current, current) : null;
    recaughtRef.current = (lost.again ? backAgain(lost.again, openGiantsRef.current) : undefined) ?? released?.fish ?? tagged ?? giantUp ?? ownFoe ?? lodgeFoe;
    // Over the groundbait the feeders crowd in, so some bites are theirs; a beginner's first fish stays an easy one.
    const feeder = bait.baited && !bait.full && !bait.spooked && !mercyNow ? groundbaitFeeder(spotRef.current, lureRef?.current, short, hour, Math.random, bait.built, bait.worm, bait.wary) : null;
    const hunter = shiner && !lost.again && !recaughtRef.current && !mercyNow ? shinerHunter(spotRef.current, current, hour, Math.random, lively) : null;
    shinerTakenRef.current = !!hunter;
    // On the sunfish beds some bites are the perch and smallmouth come to raid the eggs; a beginner's first fish stays an easy one.
    const raider = castBedRef.current && !lost.again && !recaughtRef.current && !hunter && !mercyNow ? bedRaider(spotRef.current, lureRef?.current, current, hour) : null;
    // A jig over the crayfish bed draws the fish that hunt them, the same way.
    const crayHunter = castCrayfishRef.current && !lost.again && !recaughtRef.current && !hunter && !raider && !mercyNow ? crayfishHunter(spotRef.current, lureRef?.current, current, hour) : null;
    const gorger = castTadpoleRef.current && !lost.again && !recaughtRef.current && !hunter && !raider && !crayHunter && !mercyNow ? tadpoleEater(spotRef.current, lureRef?.current, current, hour) : null;
    const fryChaser = castFryRef.current && !lost.again && !recaughtRef.current && !hunter && !raider && !crayHunter && !gorger && !mercyNow ? fryHunter(spotRef.current, lureRef?.current, current, hour) : null;
    const logFish = castLogRef.current && !lost.again && !recaughtRef.current && !hunter && !raider && !crayHunter && !gorger && !fryChaser && !mercyNow ? logHolder(spotRef.current, lureRef?.current, current, hour) : null;
    const sipper = castBugRef.current && !lost.again && !recaughtRef.current && !hunter && !raider && !crayHunter && !gorger && !fryChaser && !logFish && !mercyNow ? bugSipper(spotRef.current, lureRef?.current, current, hour) : null;
    const lightFish = castMinnowRef.current && !lost.again && !recaughtRef.current && !hunter && !raider && !crayHunter && !gorger && !fryChaser && !logFish && !sipper && !mercyNow ? lightHunter(spotRef.current, lureRef?.current, current, hour) : null;
    const riser = castMidgeRef.current && !lost.again && !recaughtRef.current && !hunter && !raider && !crayHunter && !gorger && !fryChaser && !logFish && !sipper && !lightFish && !mercyNow ? midgeRiser(spotRef.current, lureRef?.current, current, hour) : null;
    const frenzyFish = castFrenzyRef.current && !lost.again && !recaughtRef.current && !hunter && !mercyNow ? frenzyHunter(spotRef.current, lureRef?.current, current, hour) : null;
    const species = lost.again ? lost.again.species : recaughtRef.current ? recaughtRef.current.species : hunter ? hunter : raider ? raider : crayHunter ? crayHunter : gorger ? gorger : fryChaser ? fryChaser : logFish ? logFish : sipper ? sipper : lightFish ? lightFish : riser ? riser : frenzyFish ? frenzyFish : schoolFish && Math.random() < SCHOOL_SAME ? schoolFish : (feeder ?? drawn);
    fedRef.current = !feeder || species !== feeder ? null : isBigFeeder(feeder.id, bait.built) && !bait.wary ? "big" : "fed";
    const bitten = lost.again ? { species, weight: lost.again.weight } : recaughtRef.current ? { species, weight: recaughtRef.current.weight } : downAtBank(makeCatch(species, current.patience, anglerLevel(current.lifetimePoints)), fishedDownRef.current.has(spotRef.current) && !mercyNow);
    biteRef.current = bitten;
    setBite(bitten);
    const hotBank = hotBankForDay(new Date()) === spotRef.current;
    const unschooledWait = waitMs(current.patience, hour, castHotspotRef.current, anglerLevel(current.lifetimePoints), mercyNow, hotBank, castRiseRef.current, castPerfectRef.current);
    // However many bonuses stack, the bite never comes before the floor, so a nibble still fits.
    const wait = stackWaitMs(unschooledWait, castSkipRef.current ? SKIP_CAST_WAIT : 1, castPadsRef.current ? LILY_COVER_WAIT : 1, castEdgeRef.current ? ROCK_EDGE_WAIT : 1, castFarRockRef.current ? FAR_ROCK_WAIT : 1, castFoamRef.current ? FOAM_LANE_WAIT : 1, castBedRef.current ? SUNFISH_BED_WAIT : 1, castCrayfishRef.current ? CRAYFISH_JIG_WAIT : 1, castTadpoleRef.current ? TADPOLE_WAIT : 1, castFryRef.current ? KINGFISHER_FRY_WAIT : 1, castLogRef.current ? SUNKEN_LOG_WAIT : 1, castBugRef.current ? SURFACE_BUG_WAIT : 1, castMinnowRef.current ? LANTERN_MINNOW_WAIT : 1, castMidgeRef.current ? MIDGE_RISE_WAIT : 1, castWeedRef.current === "topwater" ? DUCKWEED_TOPWATER_WAIT : castWeedRef.current === "fouled" && !mercyNow ? DUCKWEED_FOUL_WAIT : 1, schoolFish ? SCHOOL_WAIT : 1, bait.baited ? (full ? OVERFED_WAIT : GROUNDBAIT_WAIT) : 1, spooked ? SPOOK_WAIT : 1, washedWait, pressureWait, yesterdayWait, crowdedWait, freshWait, topwaterWait, chopWait, stormWait, rainComingWait, fogLiftWait, frontWait, turnoverWait, swingWait, glareWait, shadowWait, darkWait, nightTopwaterWait, flashWait, jigWait, winterWait, shallowsWait, inletWait, fallWait, heatWait, shadeWait, lanternWait, sunWait, blowWait, windwardWait, cloudWait, moonWait, driftWait, rockWait, pilingWait, spoonWait, reedWait, floatWait, streamerWait, washWait, flowWait, knockWait, nightWait, hatchWait, thumpWait, colourWait, anchorWait, lampWait, lineWait, castFrenzyRef.current ? FRENZY_WAIT : 1);
    // When the fish still about this bank is the one biting, its shadow closes in on the float over the wait.
    setLurkerCloseInMs(lost.again ? wait : 0);
    // A topwater lure is hit at the top, so every fish takes it without a nibble.
    const topwater = isTopwater(lureRef?.current);
    const style = takeStyle(species.id, topwater);
    const nibbles = nibblePlan(wait, Math.random, style);
    // A swim whose feeders were scattered has no thieves crowding it either, however little built it is left.
    const thiefSwim = bait.baited && !bait.spooked ? bait.built : null;
    const stolen = carriesBait(lureRef?.current) && stealsBait(species.id, nibbles.length, Math.random, stealChance(thiefSwim));
    const arm = () => {
      let secondTake = false;
      let followed = false;
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
          setSoak(0);
          setOutcome({ kind: "miss", message: t("{fish} nibbled the bait clean off the hook.", { fish: t(species.name) }), fish: bitten });
          resetToIdle(thiefSwim === 0 ? t("Shiners crowd a fresh swim and steal bait until it's topped up. Cast again.") : t("Little fish steal bait. Cast again."), "result");
          return;
        }
        // A pike on a flashing lure may follow it to the bank instead of taking: the angler figure-eights it as it turns.
        if (!followed && !secondTake && !mercyNow && FIGURE_EIGHTERS.has(species.id) && drawsFollow(lureRef?.current) && Math.random() < FIGURE_EIGHT_ODDS) {
          followed = true;
          const startFollow = () => {
            if (phaseRef.current !== "waiting") return;
            // Not turning yet: a tap now is too soon.
            figureRef.current = { turnAt: Infinity, endAt: Infinity, take: takeBait, fish: bitten };
            setFollow("follow");
            setHint(t("{fish} followed it to the bank! Figure-eight: tap as it turns…", { fish: t(species.name) }));
            fx.nibble();
            fx.haptic("nibble");
            timers.current.figure = [
              window.setTimeout(() => {
                const figure = figureRef.current;
                if (!figure || phaseRef.current !== "waiting") return;
                // Out of sight, it waits: the follow starts over when the angler is back.
                if (document.visibilityState === "hidden") {
                  figureRef.current = null;
                  setFollow(null);
                  timers.current.shown = whenShown(startFollow, document, 0);
                  return;
                }
                // The window runs from the call the angler sees, whatever the frame rate.
                figure.turnAt = performance.now();
                figure.endAt = figure.turnAt + FIGURE_WINDOW_MS;
                setFollow("turn");
                setHint(t("NOW — it's turning!"));
                fx.plop();
                fx.haptic("bite");
                timers.current.figure?.push(
                  window.setTimeout(() => {
                    if (figureRef.current !== figure || phaseRef.current !== "waiting") return;
                    turnAway(figure);
                  }, FIGURE_WINDOW_MS),
                );
              }, FIGURE_TURN_MS),
            ];
          };
          startFollow();
          return;
        }
        // A fish taking for real ends any follow.
        figureRef.current = null;
        setFollow(null);
        fx.bite();
        if (hour === "night") fx.rodBell("ring");
        fx.haptic("bite");
        setPhaseBoth("hookset");
        setHint(topwater ? t("It blew up on the topwater — strike!") : strikeCall(style));
        const openWindow = () => {
          const heldMs = Math.round(hookWindowMs(current.accuracy, mercyNow, anglerLevel(current.lifetimePoints)) * (castLampRef.current ? LAMP_WINDOW : 1));
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
              scheduleBite(() => {
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
              scheduleBite(() => {
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
              scheduleBite(() => {
                if (phaseRef.current !== "waiting") return;
                timers.current.shown = whenShown(takeBait);
              }, FOLLOW_MS);
              return;
            }
            // The missed fish stays in the outcome so the turn-away shows the same fish.
            // How long it held on, so the angler learns the window they have.
            setOutcome({ kind: "miss", message: t("Too slow. The fish dropped the bait after {time} s.", { time: seconds(windowMs) }), fish: bitten });
            // It was never pricked, so it may take again on a cast straight back, unless a bigger lost fish is already about.
            const dropped = !gotAwayRef.current;
            if (dropped) gotAwayRef.current = gotAwayAfterDrop(bitten.species, bitten.weight, spotRef.current, recaughtRef.current);
            // Hold result so the miss spring and the turn play out.
            resetToIdle((style === "lift" ? t("Strike the moment the float lifts.") : t("Strike the moment the bobber goes under.")) + (dropped ? ` ${current.patience >= PATIENT_DROP_RANK ? t("It wasn't hooked, and your Patience keeps it about: cast straight back here, it will likely take again.") : t("It wasn't hooked, so it may take again: cast straight back here.")}` : ""), "result");
          }, windowMs);
        };
        openWindow();
      };
      const bringOn = () => {
        if (phaseRef.current !== "waiting") return;
        timers.current.shown = whenShown(takeBait);
      };
      scheduleBite(bringOn, wait);
      // A sitting topwater can be popped, a jig on the bottom hopped, a spoon lifted, a streamer stripped, a crankbait paused and a fly twitched, to draw the fish sooner.
      const work = topwater ? "pop" : isJig(lureRef?.current) ? "hop" : isSpoon(lureRef?.current) ? "lift" : isStreamer(lureRef?.current) ? "strip" : isCrank(lureRef?.current) ? "pause" : isFly(lureRef?.current) ? "twitch" : null;
      // In winter the slow fish want it worked slow; a beginner's easy fish don't mind.
      popRef.current = work ? { dueAt: performance.now() + wait, take: bringOn, pops: 0, work, taps: lureWorkTapsForLevel(anglerLevel(current.lifetimePoints)), lastAt: performance.now(), season: mercyNow ? undefined : season } : null;
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
    // In winter the lure skitters across the ice that rims the shore instead of reaching the water; a beginner is spared it.
    if (aimed !== null && !mercyRef.current && onShoreIce(season, aimed.x, aimed.z)) {
      setOutcome({ kind: "miss", message: t("The lure skittered across the shore ice.") });
      resetToIdle(t("Ice rims the shore in winter. Cast past it to the open water."));
      return;
    }
    // A line twisted by a spinner's blade kinks on the cast now and then, until it is retied.
    if (castTangles(twistRef.current, Math.random(), mercyRef.current)) {
      setOutcome({ kind: "miss", message: t("A wind knot: the twisted line kinked on the cast.") });
      resetToIdle(t("A spinner's turns and a bluegill's circles twist the line. Retie to take the twist out."));
      return;
    }
    setTwist(twistAfterCast(twistRef.current, lureRef?.current));
    castWashedRef.current = !mercyRef.current && isWashedOut(soakRef.current) && isLiveBait(lureRef?.current);
    setSoak(soakAfterCast(soakRef.current, lureRef?.current, mercyRef.current));
    castHotspotRef.current = aimed !== null && isHotspotCast(hotspotRef.current, aimed.x, aimed.z, landing.spot);
    castFrenzyRef.current = castHotspotRef.current && frenzyOn(Date.now());
    castRiseRef.current = risingRef.current && aimed !== null && isRiseCast(landing.spot, aimed.x, aimed.z, Date.now());
    castSnagRef.current = aimed !== null ? castSnags(landing.spot, aimed.x, aimed.z, mercyRef.current, Math.random(), profile.accuracy, lureRef?.current, season) : null;
    castPerfectRef.current = isPerfectCast(castPower, profile.accuracy, level);
    // A beginner's easy fish sets as solid however far out it took.
    castLongRef.current = aimed !== null && angler !== null && !mercyRef.current && isLongCast(angler.x, angler.z, aimed.x, aimed.z, level, stanceNow === "open");
    castSkipRef.current = isSkipCast(castPower, profile.accuracy, landing.spot, lureRef?.current);
    castPadsRef.current = aimed !== null && tightToPads(season, aimed.x, aimed.z);
    castEdgeRef.current = aimed !== null && onRockEdge(landing.spot, aimed.x, aimed.z);
    castFarRockRef.current = aimed !== null && tightToFarRock(landing.spot, aimed.x, aimed.z);
    castFoamRef.current = aimed !== null && onFoamLane(windDriftRef.current, aimed.x, aimed.z);
    castBedRef.current = aimed !== null && onSunfishBed(season, aimed.x, aimed.z);
    castCrayfishRef.current = aimed !== null && onCrayfishBed(season, aimed.x, aimed.z) && isJig(lureRef?.current);
    castTadpoleRef.current = aimed !== null && amongTadpoles(season, hourRef.current, aimed.x, aimed.z);
    castFryRef.current = aimed !== null && overKingfisherFry(season, hourRef.current, sky, aimed.x, aimed.z);
    castLogRef.current = aimed !== null && tightToLog(aimed.x, aimed.z);
    castBugRef.current = aimed !== null && bugLike(lureRef?.current) && amongSurfaceBugs(season, hourRef.current, sky, windDriftRef.current, aimed.x, aimed.z);
    castMinnowRef.current = aimed !== null && minnowLike(lureRef?.current) && amongLanternMinnows(hourRef.current, aimed.x, aimed.z);
    // A fly among the striders under a midge cloud is told once, as the bugs.
    castMidgeRef.current = aimed !== null && !castBugRef.current && midgeLike(lureRef?.current) && underMidges(hourRef.current, sky, season, windDriftRef.current, aimed.x, aimed.z);
    // Among the lily pads the pads decide how the lure fishes, so the duckweed counts only out in its still coves.
    castWeedRef.current = duckweedCast(aimed !== null && !castPadsRef.current && inDuckweed(season, windDriftRef.current, aimed.x, aimed.z), isTopwater(lureRef?.current));
    secondTakeRef.current = false;
    startWait(profile, castPower < sweetBand(profile.accuracy).min);
  }, [profile, resetToIdle, season, sky, startWait]);

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
        const figure = figureRef.current;
        if (figure) {
          figureRef.current = null;
          setFollow(null);
          timers.current.figure?.forEach((id) => window.clearTimeout(id));
          const now = performance.now();
          if (now >= figure.turnAt && now <= figure.endAt) {
            fx.reel();
            figure.take();
            setHint(t("It turned on the figure-eight and hit! Strike!"));
          } else {
            turnAway(figure, t("Too soon: it saw the rod move and sank away."), t("Wait for it to turn, then figure-eight. Cast again."));
          }
          break;
        }
        const snag = snagRef.current;
        const pop = popRef.current;
        if (!snag && pop) {
          // Popping a topwater, hopping a jig, lifting a spoon, stripping a streamer, pausing a crankbait or twitching a fly draws the fish sooner, but only the first few times; then it wants to sit.
          if (pop.pops >= pop.taps) {
            const rest = pop.work === "hop" ? t("Let it fall between hops.") : pop.work === "lift" ? t("Let it fall between lifts.") : pop.work === "strip" ? t("Let it hang between strips.") : pop.work === "pause" ? t("Keep it coming between pauses.") : pop.work === "twitch" ? t("Let it drift between twitches.") : t("Let it sit between pops.");
            // Worked past the few touches that help, it only puts the fish off.
            setHint(strikeAtNothing() ? `${rest} ${t("Worked again so soon, it puts the fish off a moment.")}` : rest);
            break;
          }
          pop.pops += 1;
          const sinceLast = performance.now() - pop.lastAt;
          pop.lastAt = performance.now();
          if (tooQuickForCold(pop.season, sinceLast)) {
            // Worked too quick for the cold, the slow fish turn from it and the bite comes later.
            const later = Math.max(0, pop.dueAt - performance.now()) * COLD_WORK_WAIT;
            scheduleBite(pop.take, later);
            pop.dueAt = performance.now() + later;
            fx.reel();
            setHint(t("Too quick for the cold water: the slow fish turn from it. Give it a slow count before the next one."));
            break;
          }
          const sooner = Math.max(0, pop.dueAt - performance.now()) * TOPWATER_POP_LEFT;
          scheduleBite(pop.take, sooner);
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
          } else if (pop.work === "twitch") {
            fx.plop();
            setHint(t("Twitch! The fly darts like a live insect. Let it drift…"));
          } else if (pop.work === "pause") {
            // Stopping the reel makes no sound of its own.
            setHint(t("Pause! The crankbait stops and floats up, and a following fish turns on it. Reel on…"));
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
            scheduleBite(yank.take, later);
            setHint(t("You yanked the bait away from it, so the fish backed off. Let it settle and wait for the real dip."));
            break;
          }
          // The tug of a strike at nothing moves the bait, and the fish backs off a moment.
          const backed = strikeAtNothing();
          setHint(
            atNibble
              ? backed
                ? t("That was only a nibble, and the tug puts the fish off a moment. Wait for the bobber to go under, then strike.")
                : t("That was only a nibble. Wait for the bobber to go under, then strike.")
              : backed
                ? t("Too early: the tug moved the bait, and the fish backs off a moment. Wait for the bobber to go under, then strike.")
                : t("Too early. Wait for the bobber to go under, then strike."),
          );
          break;
        }
        snag.taps += 1;
        fx.reel();
        if (snag.taps < SNAG_TAPS) {
          setHint(t("Working it free… {n} of {total}", { n: snag.taps, total: SNAG_TAPS }));
          break;
        }
        snagRef.current = null;
        // Dragging the hook off the rocks blunts its point.
        if (snag.cover === "rocks") markDull(true);
        waitHintRef.current = snag.cover === "rocks" ? t("Off the rocks, but they blunted the hook point. Let it settle.") : t("Free of the weed. Let it settle.");
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
          const falseAt = falseStrikeAtRef.current;
          if (falseAt !== null && performance.now() - falseAt < PINCH_UNDO_MS) {
            // Nor was it a strike at nothing, so the fish never backed off.
            falseStrikeAtRef.current = null;
            shiftBite(-FALSE_STRIKE_MS);
          }
          const yanked = yankedRef.current;
          if (yanked && performance.now() - yanked.at < PINCH_UNDO_MS) {
            // Nor did it yank the bait, so the bite comes when it was due.
            yankedRef.current = null;
            yankRef.current = { dueAt: yanked.dueAt, take: yanked.take };
            scheduleBite(yanked.take, Math.max(0, yanked.dueAt - performance.now()));
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
    let wasBitten = false;
    let wasShaking = false;
    let wasLifting = false;
    let wasNetting = false;
    let wasNetHead = false;
    let prevSurge: SurgeState = 0;
    /** After a loss, a fish that may bite again is said to be still about. */
    // On a small lure, say a big one tempts it back sooner.
    const tempt = () => (lureRef && !favorsLargeFish(lureRef.current) ? ` ${t("A big lure tempts it back sooner.")}` : "");
    const stillAbout = () => (gotAwayRef.current ? ` ${t("It's still about: cast here again.")}${tempt()}` : "");
    // A trophy that breaks off is remembered at its bank for the days to come; a giant or a let-go fish is already its own story.
    const foeLost = (current: { species: FishSpecies; weight: number }) => {
      const userId = anglerIdRef.current;
      const recaught = recaughtRef.current;
      if (!userId || !isTrophyWeight(current.species, current.weight) || current.species.rarity === "legendary" || (recaught && !recaught.foe)) return "";
      // The same fish lost again keeps the day it first broke off and the lure it first carried off, and is already known to the lodge.
      const fresh = !isOldFoe(loadOldFoe(userId), current);
      // A fresh loss goes to the lodge too, for other anglers to meet, under an id the foe keeps from the start, so landing it oneself closes it.
      const reportId = fresh && reportsLost(current.species, current.weight) ? localId() : undefined;
      if (reportId) setLostReport({ id: reportId, speciesId: current.species.id, weight: current.weight, spot: spotRef.current });
      if (fresh) saveOldFoe(userId, { species: current.species.id, weight: current.weight, spot: spotRef.current, at: Date.now(), ...(lureRef?.current ? { lure: lureRef.current } : {}), ...(reportId ? { reportId } : {}) });
      return ` ${t("It will be about this bank in the days to come.")}`;
    };
    // A giant that breaks free learns the lure it was hooked on.
    const giantLost = () => {
      const giant = recaughtRef.current?.giant;
      const lure = lureRef?.current;
      const userId = anglerIdRef.current;
      if (!giant || !lure || !userId) return "";
      keepGiantShy(userId, markShy(giantShyNow(userId), spotRef.current, giant, lure));
      return ` ${t("{name} knows the {lure} now, and won't take one again this week.", { name: t(giant), lure: t(lure) })}`;
    };
    // A big feeder or a prowler lost off the built-up swim scatters the rest: the build is gone and the feeders stay off it a few casts.
    const feedersScattered = (species: FishSpecies) => {
      const scattered = scattersSwim(species.id, castBuiltRef.current) ? scatterSwim(groundbaitRef.current, spotRef.current) : null;
      if (!scattered) return "";
      keepGroundbait(scattered);
      return ` ${t("Its thrashing scattered the feeders off the swim: none take for the next {n} casts, and it needs building up again.", { n: SPOOKED_SWIM_CASTS })}`;
    };
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
          const result = runtime.step(now, dt, reeling, steer, settings.drag);
          const sim = runtime.sim;
          // Left to flutter on a slack line out past halfway, the small fish draws the hunter in. Only its calm spells count,
          // since easing off for a run is no pause, and a pump of the reel starts the pause again.
          if (flutterRef.current && result === "fighting") {
            if (reeling) flutterSecRef.current = 0;
            else if (sim.surge === 0 && sim.line > GRAB_LINE) flutterSecRef.current += dt;
            if (flutterSecRef.current >= FLUTTER_SEC) {
              grabRef.current = flutterRef.current;
              flutterRef.current = null;
            }
          }
          // Halfway in, a bigger fish hits the small one: the fight starts again with it.
          const grab = grabRef.current;
          if (grab && result === "fighting" && sim.line <= GRAB_LINE) {
            grabRef.current = null;
            followRef.current = null;
            grabbedRef.current = current.species.id;
            const taken = downAtBank(makeCatch(grab.predator, grab.profile.patience, anglerLevel(grab.profile.lifetimePoints)), fishedDownRef.current.has(spotRef.current) && !mercyRef.current);
            biteRef.current = taken;
            setBite(taken);
            fx.splash();
            fx.haptic("strike");
            prevSurge = 0;
            // The hunter takes it by the boat or bank, away from any rock or log the lure landed by.
            castFarRockRef.current = false;
            castLogRef.current = false;
            castWeedRef.current = null;
            castEdgeRef.current = false;
            castBedRef.current = false;
            castFoamRef.current = false;
            castBugRef.current = false;
            castMidgeRef.current = false;
            castMinnowRef.current = false;
            castFryRef.current = false;
            beginFight(taken.species, taken.weight, grab.profile);
            // The pike is where the shiner was, not back at the far end of the line.
            if (runtimeRef.current) runtimeRef.current.sim.line = sim.line;
            setHint(grabCall(current.species.id, taken.species.id, fightLines(taken.species.challenge)[0]));
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
          // A line wrapping round a piling or the sunken log grates once.
          if (sim.wrapped && !wasWrapped) {
            fx.scrape();
            fx.haptic("scrape");
          }
          wasWrapped = !!sim.wrapped;
          // A pike's teeth wear through to the line it swallowed: it grates once, and the card says so.
          if (sim.bitten && !wasBitten) {
            fx.scrape();
            fx.haptic("scrape");
            setHint(t("Its teeth have frayed the line! It snaps sooner now, so land it quick."));
          }
          wasBitten = !!sim.bitten;
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
          // A fish reaching the net lets a toggled reel go, so the next press is the strike that nets it.
          if (sim.netting && !wasNetting && settings.reelMode === "toggle") reelLatchRef.current = false;
          // Its head coming up at the net is heard and felt, not only read on the card.
          if (sim.netHead && !wasNetHead) {
            fx.plop();
            fx.haptic("nibble");
          }
          wasNetting = !!sim.netting;
          wasNetHead = !!sim.netHead;
          if (reeling && !sim.netting && now - lastReelFx > 90) {
            fx.reel();
            lastReelFx = now;
          }
          if (result === "landed") {
            fx.land();
            fx.haptic("land");
            // A bluegill's tight circles leave the line twisted, nearer a tangle.
            if (LINE_SPINNERS.has(current.species.id)) setTwist(twistRef.current + SPIN_TWIST);
            const clean = isCleanFight(runtime.performance);
            cleanRunRef.current = clean ? cleanRunRef.current + 1 : 0;
            schoolRef.current = schoolAfterLanding(current.species.id, spotRef.current, hourRef.current, season, castBaitedRef.current);
            // A hunter that followed the small fish in stays about the bank for the next few casts.
            const follow = followRef.current;
            followRef.current = null;
            if (follow && !gotAwayRef.current) gotAwayRef.current = { spot: spotRef.current, species: follow.species, weight: follow.weight, casts: AGAIN_CASTS, follow: true };
            const schooled = !schoolRef.current
              ? ""
              : isWinterSchool(current.species.id, season)
                ? t("{fish}: there's a big winter school here, and it stays a while. Cast again quickly!", { fish: t(current.species.name) })
                : hourRef.current === "dawn" || hourRef.current === "dusk"
                  ? t("{fish}: there's a school here, feeding hard in the low light. Cast again quickly!", { fish: t(current.species.name) })
                  : castBaitedRef.current
                    ? t("{fish}: there's a school here, feeding on the groundbait. It stays a while, so cast again quickly!", { fish: t(current.species.name) })
                    : t("{fish}: there's a school here, cast again quickly!", { fish: t(current.species.name) });
            const followed = follow && gotAwayRef.current?.follow ? `${followCall(follow.species)} ${t("It's still about: cast here again.")}${tempt()}` : "";
            // A big feeder landed off the built-up swim is counted on it; from the second, the rest are wary of it.
            const landedOff = isBigFeeder(current.species.id, castBuiltRef.current) ? landBigFeeder(groundbaitRef.current, spotRef.current) : null;
            const wised = !!landedOff && isWary(landedOff) && !isWary(groundbaitRef.current);
            if (landedOff) keepGroundbait(landedOff);
            // The landed card covers the hint, so what the bank holds now rides on the card too.
            const fed = wised
              ? t("{fish}: that's the second big one off this swim, so the rest are wary of it now: they come no more than the other feeders until a fresh swim is built.", { fish: t(current.species.name) })
              : fedRef.current === "big"
                ? t("{fish}: the big feeders have moved in on the built-up swim.", { fish: t(current.species.name) })
                : fedRef.current
                  ? t("{fish}: it came in to feed on the groundbait.", { fish: t(current.species.name) })
                  : "";
            // A prowler is fought through the swim even when landed, so it scatters the feeders as a lost big feeder does.
            const prowlerScattered = PROWLERS.has(current.species.id) ? feedersScattered(current.species).trim() : "";
            const prowled = prowlerScattered ? `${t("{fish}: it was hunting the feeders on the built-up swim.", { fish: t(current.species.name) })} ${prowlerScattered}` : "";
            const frays = runtime.performance.scuffed || runtime.performance.bitten;
            const scuffed = frays && !frayedRef.current ? scuffNote(current.water, !runtime.performance.scuffed, current.farRock) : "";
            if (frays) markFrayed(true);
            // The fish took the worm, so a fresh one goes on.
            setSoak(0);
            const recaught = recaughtRef.current;
            if (recaught?.tag) landedTagsRef.current.add(recaught.tag.id);
            if (recaught?.lost) landedLostRef.current.add(recaught.lost.id);
            // Landed, as the foe come back or as the one that got away the same day, it is no one's foe any more, and its lodge report closes.
            const storedFoe = anglerIdRef.current ? loadOldFoe(anglerIdRef.current) : null;
            const ownLanded = !!recaught?.foe || isOldFoe(storedFoe, current);
            if (anglerIdRef.current && ownLanded) saveOldFoe(anglerIdRef.current, null);
            const closesLost = ownLanded ? storedFoe?.reportId : undefined;
            const back = !recaught
              ? ""
              : recaught.lost
                ? t("{fish}: the trophy {name} lost here.", { fish: t(current.species.name), name: recaught.lost.by })
              : recaught.foe
                ? recaught.foe.lure
                  ? t("{fish}: the trophy that broke you off here on {date}, still with your {lure} in its jaw.", { fish: t(current.species.name), date: new Date(recaught.at).toLocaleDateString(locale(), { month: "long", day: "numeric" }), lure: t(recaught.foe.lure) })
                  : t("{fish}: the trophy that broke you off here on {date}.", { fish: t(current.species.name), date: new Date(recaught.at).toLocaleDateString(locale(), { month: "long", day: "numeric" }) })
              : recaught.giant
                ? t("{fish}: you landed {name}, this week's giant of the bank!", { fish: t(current.species.name), name: t(recaught.giant) })
              : recaught.tag
                ? t("{fish}: {name} let this one go here on {date} at {was}, and now it's yours.", { fish: t(current.species.name), name: recaught.tag.by, date: new Date(recaught.at).toLocaleDateString(locale(), { month: "long", day: "numeric" }), was: weightText(recaught.was) })
              : recaught.weight > recaught.was
                ? t("{fish}: you let this one go here on {date}, and it has put on {gain} since.", { fish: t(current.species.name), date: new Date(recaught.at).toLocaleDateString(locale(), { month: "long", day: "numeric" }), gain: weightText(recaught.weight - recaught.was) })
                : t("{fish}: you let this one go here on {date}, and it's back on your line.", { fish: t(current.species.name), date: new Date(recaught.at).toLocaleDateString(locale(), { month: "long", day: "numeric" }) });
            const landedNote = [back, fed, prowled, schooled, followed, scuffed].filter(Boolean).join(" ");
            const angler = anglerIdRef.current;
            if (angler) keepBankMemory(angler, countAtBank(bankMemoryNow(angler), spotRef.current, "landed"));
            setOutcome({
              kind: "landed",
              id: localId(),
              species: current.species,
              weight: current.weight,
              spot: spotRef.current,
              clean,
              ...(landedNote ? { note: landedNote } : {}),
              ...(recaught?.tag ? { tag: recaught.tag } : {}),
              ...(recaught?.giant ? { giant: recaught.giant, ...(recaught.giantBonus ? { giantBonus: recaught.giantBonus } : {}) } : {}),
              ...(recaught?.lost ? { lostFrom: { id: recaught.lost.id, by: recaught.lost.by } } : {}),
              ...(closesLost ? { closesLost } : {}),
              ...(lureRef?.current ? { lure: lureRef.current } : {}),
              notes: {
                perfectCast: castPerfectRef.current,
                hookedSolid: hookedSolidRef.current,
                lightHook: runtime.sim.lightHook,
                secondTake: secondTakeRef.current,
                grabbed: grabbedRef.current,
                gotAway: againRef.current && !followedRef.current && !droppedRef.current,
                followedIn: againRef.current && followedRef.current,
                recaught: !!recaught && !recaught.foe && !recaught.giant && !recaught.lost,
                turnedRuns: runtime.performance.turnedRuns ?? 0,
                cleanRun: cleanRunRef.current,
                closeCall: isCloseCall(runtime.performance),
                fightSec: runtime.performance.fightSec,
                bowedLeaps: runtime.performance.bowedLeaps,
                easedShakes: runtime.performance.easedShakes,
                followedDarts: runtime.performance.followedDarts,
                encore: runtime.performance.encore,
                secondWind: runtime.performance.secondWind,
                clearOf: runtime.performance.clearOf,
              },
            });
            clearFight();
            setPhaseBoth("result");
            setHint([castHint("landed"), landedNote].filter(Boolean).join(" "));
          } else if (result === "snapped") {
            fx.snap();
            fx.haptic("snap");
            cleanRunRef.current = 0;
            // A lost fish spooks the bank and scatters any school there.
            spookRef.current = spotRef.current;
            schoolRef.current = null;
            gotAwayRef.current = gotAwayAfterLoss(current.species, current.weight, spotRef.current, recaughtRef.current);
            const trophy = lostTrophy(current.species, current.weight) + giantLost() + foeLost(current) + feedersScattered(current.species);
            // How close it came, so a break near the net reads as nearly there rather than as a wasted fight.
            const reeledIn = Math.round((1 - sim.line) * 100);
            // A break gives the angler a fresh knot to tie on, so the line is sound again.
            const snapped = sim.bitten
              ? t("The {fish}'s teeth wore through the line before you could land it.", { fish: t(current.species.name) })
              : sim.frayed ? t("{fish} snapped the frayed line, short of the usual strain.", { fish: t(current.species.name) }) : t("{fish} snapped the line — too much tension.", { fish: t(current.species.name) });
            markFrayed(false);
            setTwist(0);
            markDull(false);
            setSoak(0);
            setOutcome({ kind: "broke", message: (reeledIn >= 10 ? `${snapped} ${t("It was {n}% of the way in.", { n: reeledIn })}` : snapped) + trophy });
            resetToIdle((sim.bitten ? t("Given time, a pike or muskie swallows the bait: strike sooner, or land it quick.") : t("Too much tension — let go when the bar turns red or the fish is about to run.")) + stillAbout());
          } else if (result === "escaped") {
            fx.snap();
            fx.haptic("snap");
            cleanRunRef.current = 0;
            // A lost fish spooks the bank and scatters any school there.
            spookRef.current = spotRef.current;
            schoolRef.current = null;
            gotAwayRef.current = gotAwayAfterLoss(current.species, current.weight, spotRef.current, recaughtRef.current);
            const frays = runtime.performance.scuffed || runtime.performance.bitten;
            const trophy = lostTrophy(current.species, current.weight) + giantLost() + foeLost(current) + feedersScattered(current.species) + (frays && !frayedRef.current ? ` ${scuffNote(current.water, !runtime.performance.scuffed, current.farRock)}` : "");
            if (frays) markFrayed(true);
            if (sim.tornOut && sim.lightHook && !SOFT_MOUTHS.has(current.species.id)) {
              setOutcome({ kind: "broke", message: t("The light hook pulled out of the {fish}.", { fish: t(current.species.name) }) + trophy });
              resetToIdle(t("Hooked light — strike sooner, and ease off as soon as the bar turns red.") + stillAbout());
            } else if (sim.slipped) {
              setOutcome({ kind: "broke", message: t("The {fish} slithered off the hook on the slack line.", { fish: t(current.species.name) }) + trophy });
              resetToIdle(t("Slippery — keep the line tight between its runs.") + stillAbout());
            } else if (sim.thrown) {
              setOutcome({ kind: "broke", message: t("The {fish} charged straight at you and the light hook dropped out of the slack line.", { fish: t(current.species.name) }) + trophy });
              resetToIdle(t("Hooked light — when it charges, reel fast to keep the line tight.") + stillAbout());
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

  // The frenzy keeps the wall clock too, so the bubbles boil for everyone at once; its start is told when idle, or on the return to idle.
  const frenzyRef = useRef(false);
  useEffect(() => {
    if (level === null) return;
    let timer = 0;
    const check = () => {
      const now = Date.now();
      const slot = slotFrenzy(now);
      const on = now >= slot.from && now < slot.to;
      if (on !== frenzyRef.current && hotspotRef.current) {
        const bank = t(SPOT_LABELS[hotspotRef.current.spot]);
        if (phaseRef.current === "idle") setHint(on ? frenzyHint(hotspotRef.current.spot) : t("The frenzy at the {bank} is over.", { bank }));
        frenzyUnheardRef.current = on && phaseRef.current !== "idle";
      }
      frenzyRef.current = on;
      setFrenzy(on);
      const next = now < slot.from ? slot.from : now < slot.to ? slot.to : slotFrenzy((Math.floor(now / FRENZY_SLOT_MS) + 1) * FRENZY_SLOT_MS).from;
      timer = window.setTimeout(check, next - now);
    };
    check();
    return () => window.clearTimeout(timer);
  }, [level]);

  const toggleLamp = useCallback(() => setLamp((on) => !on), []);

  /** Tie the frayed or twisted end off and a fresh knot on, touch up a dull hook point, and put a fresh worm on, so the line holds full strain, casts clean, sets solid and draws the fish again. */
  const retie = useCallback(() => {
    if (phaseRef.current !== "idle" || (!frayedRef.current && !isTwisted(twistRef.current) && !dullRef.current && !isWashedOut(soakRef.current))) return;
    const wasFrayed = frayedRef.current;
    const wasTwisted = isTwisted(twistRef.current);
    const wasDull = dullRef.current;
    // A fresh worm for a washed-out one on the hook comes from the tin; with none left the washed-out one stays on.
    const washedOn = isWashedOut(soakRef.current) && isLiveBait(lureRef?.current);
    const tinEmpty = washedOn && wormsRef.current === 0;
    const emptyTin = t("Your worm tin is empty, so the washed-out worm stays on. More worms are dug each day, or the shack sells one.");
    if (tinEmpty && !wasFrayed && !wasTwisted && !wasDull) {
      setHint(emptyTin);
      return;
    }
    markFrayed(false);
    setTwist(0);
    markDull(false);
    if (!tinEmpty) setSoak(0);
    if (washedOn && !tinEmpty) keepWorms(wormsRef.current - 1);
    const rebaited = washedOn && !tinEmpty ? `${t("You thread a fresh worm on the hook. Its scent draws the fish again.")} ${t("Worms left in your tin: {worms}.", { worms: wormsRef.current })}` : "";
    const fixed = wasFrayed
      ? t("You cut off the frayed line and tie the lure on again. The line holds full strain.")
      : wasTwisted
        ? t("You cut off the twisted line and tie the lure on again. It casts clean.")
        : wasDull
          ? t("You touch up the dull hook point and tie the lure on again. It sets solid again.")
          : rebaited
            ? ""
            : t("You thread a fresh worm on the hook. Its scent draws the fish again.");
    setHint([fixed, rebaited, tinEmpty ? emptyTin : ""].filter(Boolean).join(" "));
  }, []);

  /** Toss a handful of groundbait off the bank the angler stands on: the next casts there bite sooner. A fading swim there is topped up, a well-fed one overfed. With `chopped` worm from the tin in it, the bank's perch come in with the feeders. */
  const tossHandful = (chopped: boolean) => {
    if (phaseRef.current !== "idle" || handfulsRef.current <= 0) return;
    if (chopped && !canChopWorm(wormsRef.current, groundbaitRef.current, spotRef.current)) return;
    const before = groundbaitRef.current?.built ?? 0;
    const angler = anglerIdRef.current;
    const day = angler ? baitDay(loadPrebait(angler), spotRef.current, new Date()) : null;
    const { next, kind } = throwHandful(groundbaitRef.current, spotRef.current, day?.regular, chopped, skyRef.current === "rain");
    const builtFresh = kind === "fresh" && !!day?.regular;
    if (angler && day) savePrebait(angler, builtFresh ? { ...day.next, built: day.next.day } : day.next);
    keepGroundbait(next, Date.now());
    keepHandfuls(handfulsRef.current - 1);
    if (chopped) keepWorms(wormsRef.current - CHOPPED_WORMS);
    fx.plop();
    const perch = wormFeedersTake(spotRef.current, lureRef?.current)
      ? t("{n} chopped worms went in with it: the perch here come in to feed with the feeders while the swim lasts.", { n: CHOPPED_WORMS })
      : t("{n} chopped worms went in with it: the perch here come in to feed while the swim lasts, though not to the lure you have tied on.", { n: CHOPPED_WORMS });
    const worm = chopped ? `${perch} ${t("Worms left in your tin: {worms}.", { worms: wormsRef.current })}` : "";
    const withWorm = (said: string) => [said, worm].filter(Boolean).join(" ");
    if (kind === "topped") {
      // The big feeders are told of only where they live and would take the tied lure; wary of the swim, they no longer move in.
      const takesBig = bigFeedersOver(next, lureRef?.current);
      const big = takesBig && !isWary(next);
      const grew = next.built! > before;
      // The prowler is named only where it lives, would take the tied lure, and the angler could land it.
      const prowler = next.built! >= TOPUP_MAX ? prowlerAt(spotRef.current, lureRef?.current) : undefined;
      const wary = takesBig && isWary(next) ? t("The big feeders here are wary of this swim now: let it fade and build a fresh one to bring them back.") : "";
      const prowl = prowler && profileRef.current && canLand(profileRef.current, prowler) ? t("{fish} prowls round it now, hunting the small feeders: one hooked here scatters them, landed or lost.", { fish: t(prowler.name) }) : "";
      setHint(
        withWorm(
          [big && grew
            ? t("You top up the swim again as it fades: the feeders stay, and the big ones move in. {casts} casts of it now.", { casts: next.casts })
            : big
              ? t("You top up the swim as it fades: the feeders stay, the big ones too. {casts} casts of it now.", { casts: next.casts })
              : grew
                ? t("You top up the swim as it fades: the feeders stay, and more come in. {casts} casts of it now.", { casts: next.casts })
                : t("You top up the swim as it fades: the feeders stay. {casts} casts of it now.", { casts: next.casts }), wary, prowl].filter(Boolean).join(" "),
        ),
      );
      return;
    }
    if (kind === "washed") {
      setHint(withWorm(t("The rain washes the handful through before more feeders settle on it: the swim keeps going but builds no further. {casts} casts of it now. Top it up once the rain stops.", { casts: next.casts })));
      return;
    }
    if (kind === "overfed") {
      setHint(withWorm(t("Too much too soon: the fish fill up on it, so the next {full} casts bite slower and no feeders take. {casts} casts of it now.", { full: next.full!, casts: next.casts })));
      return;
    }
    const run = builtFresh
      ? t("Day {days} running you bait this bank: its feeders expect it now and come straight in, as after a top-up.", { days: day!.next.days })
      : day?.newDay && day.next.days >= 2
        ? t("Day {days} running you bait this bank: from day {need} its feeders start to expect it.", { days: day.next.days, need: PREBAIT_DAYS })
        : "";
    const tossed = [t("You toss a handful of groundbait. The fish will gather to feed here for the next {casts} casts.", { casts: GROUNDBAIT_CASTS }), worm, t("Top it up as it fades, with {left} casts or fewer left, and more feeders come in.", { left: TOPUP_CASTS_LEFT }), run].filter(Boolean).join(" ");
    setHint(
      season === "summer"
        ? `${tossed} ${t("In the summer heat, any left draws them back after three hours but is eaten within a day.")}`
        : season === "winter"
          ? `${tossed} ${t("In the winter cold, any left takes twelve hours to draw them back but keeps four days.")}`
          : tossed,
    );
  };
  const throwGroundbait = useCallback(() => tossHandful(false), [season]);
  /** Toss a handful with chopped worm in it, as throwGroundbait does. */
  const throwChoppedWorm = useCallback(() => tossHandful(true), [season]);

  /** A handful bought at the shack goes in the bag, which carries no more than GROUNDBAIT_CARRY. */
  const addHandful = useCallback(() => keepHandfuls(Math.min(GROUNDBAIT_CARRY, handfulsRef.current + 1)), []);

  /** A worm bought at the shack goes in the tin, which holds no more than a wet morning's dig. */
  const addWorm = useCallback(() => {
    keepWorms(Math.min(WORM_TIN_WET, wormsRef.current + 1));
    setHint(t("The worm goes in your tin: {n} of {max}.", { n: wormsRef.current, max: WORM_TIN_WET }));
  }, []);

  /** A live shiner bought at the shack goes on the hook for the next cast, or, with one on it already, into the bait bucket. */
  const addShiner = () => {
    if (!liveShinerRef.current) {
      hookShiner("live");
      setHint(t("You hook the shop's shiner on as live bait. Cast it out to the hunters."));
      return;
    }
    if (!profile || bucketNow().length >= BUCKET_SIZE) return;
    keepBucket(profile.userId, bucketIn());
    setHint(t("The shiner goes in your bait bucket: {n} of {max}.", { n: bucketRef.current.length, max: BUCKET_SIZE }));
  };

  /** Bait the shiner trap by the shack with a handful of groundbait, for a later visit to lift. */
  const setTrap = () => {
    if (!profile || trapRef.current || handfulsRef.current <= 0 || phaseRef.current !== "idle") return;
    keepHandfuls(handfulsRef.current - 1);
    const cold = trapIsCold(season);
    keepTrap(profile.userId, { setAt: Date.now(), ...(cold ? { cold } : {}) });
    setHint(
      cold
        ? t("You bait the shiner trap with a handful of groundbait and sink it by the shack. The water is cold and the shiners slow: lift it after twelve hours, within three days, for one.")
        : t("You bait the shiner trap with a handful of groundbait and sink it by the shack. Lift it after six hours, within three days."),
    );
  };

  /** Lift the shiner trap: the shiners in it go in the bait bucket, as many as it holds room for, and the rest go back. */
  const liftTrap = () => {
    const lifted = trapRef.current;
    const now = Date.now();
    const spares = bucketNow();
    // A full bucket has no room, so the trap stays down till there is.
    if (!profile || !lifted || trapState(lifted, now) === "soaking" || spares.length >= BUCKET_SIZE || phaseRef.current !== "idle") return;
    const caught = trapCatch(lifted, now, Math.random);
    keepTrap(profile.userId, null);
    const added = Math.min(caught, BUCKET_SIZE - spares.length);
    keepBucket(profile.userId, [...spares, ...Array.from({ length: added }, () => now)]);
    setHint(
      caught === 0
        ? t("The trap comes up empty: it sat too long, and the shiners found their way out.")
        : added < caught
          ? t("Shiners in the trap: {caught}. Your bait bucket takes {added}, and the rest go back, the bucket being full.", { caught, added })
          : t("Shiners in the trap: {caught}, all into your bait bucket.", { caught }),
    );
  };

  /** Hook a spare shiner from the bait bucket. */
  const hookFromBucket = () => {
    if (!profile || liveShinerRef.current || bucketNow().length === 0) return;
    keepBucket(profile.userId, bucketOut());
    hookShiner("live");
    setHint(t("You hook a shiner from your bucket on as live bait. Cast it out to the hunters."));
  };

  /** Leave a shiner, or at dusk or night a worm on the hook, out on a night line at this bank, for a later visit to check. */
  const setNightLine = () => {
    const spot = stanceRef.current;
    // With no shiner to spare, a worm from the tin goes out instead, when one is tied on: fewer night feeders come to it.
    const shiner = liveShinerRef.current || bucketNow().length > 0;
    if (!profile || nightLine || (!shiner && !(isLiveBait(lureRef?.current) && wormLineHour(hourRef.current) && wormsRef.current > 0)) || phaseRef.current !== "idle" || !isFishingStance(spot) || spot === "open" || nightLineKinds(spot, profile).length === 0) return;
    // A spare from the bucket goes out first, so the shiner on the hook stays for casting.
    if (bucketNow().length > 0) keepBucket(profile.userId, bucketOut());
    else if (shiner) hookShiner(null);
    else keepWorms(wormsRef.current - 1);
    const setAt = Date.now();
    const lineSeason = nightLineSeason(season);
    keepNightLine(profile.userId, { spot, setAt, ...(shiner ? {} : { bait: "worm" as const }), ...(lineSeason ? { season: lineSeason } : {}) });
    // The forecast tells the night's sky, and the sky tells how likely the line is to hold a fish.
    const sky = nightSkyFor(setAt);
    const tonight = sky === "rain" ? t("Rain tonight: the night feeders will be roaming.") : sky === "clear" ? t("A clear night: the feeders keep close to cover, so the line may come in empty.") : "";
    const left = !lineSeason
      ? shiner
        ? t("You leave the shiner out on a night line here. Come back to check it once the night is out, and within two days.")
        : t("You leave a worm out on a night line here. Come back to check it once the night is out, and within two days.")
      : [
          shiner ? t("You leave the shiner out on a night line here.") : t("You leave a worm out on a night line here."),
          lineSeason === "summer" ? t("Check it once the night is out, and before that evening: in the summer heat crayfish strip the bait fast.") : t("In the winter cold the fish are slow: check it once the night is out and it has soaked twelve hours, and within four days."),
        ].join(" ");
    setHint([left, tonight, shiner ? "" : t("Worms left in your tin: {worms}.", { worms: wormsRef.current })].filter(Boolean).join(" "));
  };

  /** Bring in the night line set at this bank: a night feeder of the bank, or an empty hook. */
  const checkNightLine = () => {
    const spot = nightLine?.spot;
    if (!profile || !spot || stanceRef.current !== spot || phaseRef.current !== "idle") return;
    const now = Date.now();
    const state = nightLineState(nightLine, now);
    if (state === "soaking") return;
    keepNightLine(profile.userId, null);
    const caught = nightLineCatch(nightLine, now, profile, anglerLevel(profile.lifetimePoints), Math.random);
    if (!caught) {
      setHint(state === "stale" ? t("The night line sat out too long: the bait is long gone, and nothing is on it.") : nightLine.bait === "worm" ? t("The night line comes in empty: something stole the worm in the dark.") : t("The night line comes in empty: something stole the shiner in the dark."));
      return;
    }
    const fish = downAtBank(caught, fishedDownRef.current.has(spot) && !mercyRef.current);
    keepBankMemory(profile.userId, countAtBank(bankMemoryNow(profile.userId), spot, "landed"));
    // Not fought, so not clean, and it ends any run of clean fights.
    cleanRunRef.current = 0;
    // Logged at the hour it took the bait, the night, not when the line came in.
    setOutcome({ kind: "landed", id: localId(), species: fish.species, weight: fish.weight, spot, clean: false, hour: "night", note: nightLine.bait === "worm" ? t("{fish} took the worm on your night line.", { fish: t(fish.species.name) }) : t("{fish} took the shiner on your night line.", { fish: t(fish.species.name) }) });
    setPhaseBoth("result");
    setHint(castHint("landed"));
  };

  const dismissResult = () => {
    setOutcome(null);
    resetToIdle(idleHint(stanceRef.current));
  };

  /** Hook the landed golden shiner back on as live bait, so the next cast carries it out to the bank's hunters. */
  const baitShiner = () => {
    if (outcome?.kind !== "landed" || !canBaitShiner(outcome.species.id)) return;
    // With a plain shiner on the hook already, a lively one landed clean takes its place and the plain one goes in the
    // bucket; otherwise the landed one goes in the bucket to keep.
    if (liveShinerRef.current && !(outcome.clean && !livelyShinerRef.current)) {
      if (!profile || bucketNow().length >= BUCKET_SIZE) return;
      keepBucket(profile.userId, bucketIn());
      setOutcome(null);
      resetToIdle(t("The shiner goes in your bait bucket: {n} of {max}.", { n: bucketRef.current.length, max: BUCKET_SIZE }));
      return;
    }
    if (liveShinerRef.current && profile && bucketNow().length < BUCKET_SIZE) keepBucket(profile.userId, bucketIn());
    // Landed clean, it isn't worn out, so it swims hard on the hook.
    hookShiner(outcome.clean ? "lively" : "live");
    setOutcome(null);
    resetToIdle(outcome.clean ? t("You hook the lively shiner on as live bait: landed clean, it swims hard and draws more of the hunters. Cast it out.") : t("You hook the shiner on as live bait. Cast it out to the hunters."));
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
    /** Reasons the hint left out, while the hint is still the cast's own. */
    moreReasons: moreReasons.hint === hint ? moreReasons.more : NO_REASONS,
    nibble,
    schooled,
    handfuls,
    groundbait,
    swimPrimed,
    fishedHard,
    giantShy,
    nightLine,
    trap,
    setTrap,
    liftTrap,
    lostReport,
    livelyShiner,
    bucket,
    aerator,
    wormBin,
    breadCrumb,
    hookFromBucket,
    setNightLine,
    checkNightLine,
    throwGroundbait,
    throwChoppedWorm,
    addHandful,
    addShiner,
    addWorm,
    frayed,
    twisted,
    dulled,
    washed,
    worms,
    retie,
    lamp,
    toggleLamp,
    lurking,
    lurkerCloseInMs,
    follow,
    strikeWindowMs,
    hotspot,
    frenzy,
    sim: simRef,
    /** Clean fights landed in a row this session before the one on now. */
    cleanRun: cleanRunRef.current,
    performance: performanceRef,
    powerRef,
    lastCastRef,
    dismissResult,
    liveShiner,
    baitShiner,
  };
}
