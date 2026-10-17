import { isTrophyWeight, type ChallengeId, type FishSpecies } from "@stillwater/shared";
import { t } from "../i18n";
import { difficulty01 } from "./logic";
import { biteStyle } from "./nibblePlan";

export type SurgeState = 0 | 1 | 2; // 0 calm, 1 warning (telegraph), 2 surging
/** `jump`: the coming or current run is a leap clear of the water. */
/**
 * `stamina`: the fish's fight left, 1 fresh to 0 played out.
 * `runSide`: which way the coming or current run heads across the view, -1 left or 1 right.
 * `turning`: the angler is pulling the rod against the run, so it is cut short.
 */
export type FightSim = {
  line: number;
  tension: number;
  surge: SurgeState;
  jump?: boolean;
  stamina: number;
  runSide: -1 | 1;
  turning?: boolean;
  /** The run it makes on seeing the net, while that run lasts. */
  lastRun?: boolean;
  /** A trophy's second run at the net, after the first last run. */
  encore?: boolean;
  /** A pike's last run is a roll on the line instead, coming and while it lasts. */
  roll?: boolean;
  /** A long runner's first run after the hook: the long one, coming and while it lasts. */
  firstRun?: boolean;
  /** A rainbow trout's first leap: a long tail-walk across the top, coming and while it lasts. */
  tailWalk?: boolean;
  /** A brook trout's run that darted the other way halfway: the turn has to switch sides. */
  darted?: boolean;
  /** A walleye shaking its head between runs: reeling through it sends the line into the red. */
  shake?: boolean;
  /** A soft-mouthed fish reeled in the red: the hook is tearing and pulls free if it goes on. */
  tearing?: boolean;
  /** The hook tore out of a soft mouth: why the fish got away. */
  tornOut?: boolean;
  /** Hooked light on a late strike: reeled in the red, the hook pulls out as it would from a soft mouth. */
  lightHook?: boolean;
  /** A bottom feeder sitting tight on the bottom between runs: reeling barely moves it until the angler eases off and pumps. */
  sulk?: boolean;
  /** A catfish pumped once off the bottom: it has started to lift, and one more pump brings it up. */
  lifting?: boolean;
  /** A run left unturned at a weedy spot ends with the fish in the weeds: line comes in slowly and it rests there a while. */
  weeded?: boolean;
  /** At the dock, a run nobody turned has wrapped the line round a piling: reeling only rubs it until the fish swings free. */
  wrapped?: boolean;
  /** At the inlet, a run heading downstream that the angler isn't turning: the current helps it take more line. */
  downstream?: boolean;
  /** Off the point, a run the angler isn't turning, dragging the line over the rocks. */
  rocky?: boolean;
  /** At the drop-off, a run heading down the ledge. */
  diving?: boolean;
  /** At the inlet, a resting fish the current is carrying off while the angler isn't reeling. */
  carried?: boolean;
};
/** -1 rod pulled left, 1 right, 0 straight. */
export type Steer = -1 | 0 | 1;

/** The keys that pull the rod in a fight: ← or A left, → or D right (a pad's stick sends A and D). */
/** A head shake is a twist on the spot, not a run, so the starter fish that shake can't be turned. */
export function canTurnRuns(challenge: ChallengeId) {
  return challenge !== "mash";
}

export function steerSide(code: string): -1 | 1 | null {
  if (code === "ArrowLeft" || code === "KeyA") return -1;
  if (code === "ArrowRight" || code === "KeyD") return 1;
  return null;
}
export type FightOutcome = "fighting" | "landed" | "snapped" | "escaped";

/** Trout, bass and salmon jump: every second run of theirs is a leap. */
export const LEAPERS: ReadonlySet<string> = new Set(["brook-trout", "rainbow-trout", "smallmouth-bass", "largemouth-bass", "salmon"]);
/** A rainbow trout tail-walks: its first leap dances across the top this much longer than a usual one. */
export const TAIL_WALKERS: ReadonlySet<string> = new Set(["rainbow-trout"]);
export const TAIL_WALK = 1.8;
/** A sturgeon breaches once: its first run after the hook is a leap clear of the water. */
export const BREACHERS: ReadonlySet<string> = new Set(["sturgeon"]);
/** Pike roll on the line at the net instead of making a last run, and a burbot coils on it the same way. */
export const ROLLERS: ReadonlySet<string> = new Set(["pike", "tiger-muskie", "ghost-pike", "burbot"]);
/** A roll on the line lasts this long; held tight past the leap's grace, it loads the line into the red. */
export const ROLL_MS = 900;
/** Whitefish and crappie have soft mouths: reeled hard in the red, the hook tears out. */
export const SOFT_MOUTHS: ReadonlySet<string> = new Set(["lake-whitefish", "crappie"]);
/** Seconds of reeling in the red before the hook tears out of a soft mouth. */
export const TEAR_SEC = 0.8;
/** A crappie's "paper mouth" is softer still: it tears out of it sooner, before the line would snap. */
export const PAPER_MOUTHS: ReadonlySet<string> = new Set(["crappie"]);
export const PAPER_TEAR_SEC = 0.45;
/** A treble hook holds in three places, so a soft mouth or a light hook takes this much longer in the red to tear free. */
export const TREBLE_HOLD = 1.5;
/** Pound for pound a smallmouth bass fights hardest: it tires this much slower than its size says. */
export const SCRAPPERS: ReadonlySet<string> = new Set(["smallmouth-bass"]);
export const SCRAPPER_TIRE = 0.8;
/** A bluegill turns its flat side to the pull and circles: while it's fresh, reeling brings it in this much slower. */
export const BROADSIDERS: ReadonlySet<string> = new Set(["bluegill"]);
export const BROADSIDE_REEL = 0.7;
/** A perch fights hard for a moment, then gives up: it tires this much faster than its size says. */
export const QUITTERS: ReadonlySet<string> = new Set(["perch"]);
export const QUIT_TIRE = 1.3;
/** Carp and salmon make one long run straight after the hook. */
/** Brook trout dart: halfway through each run they cut back the other way, so a turn has to switch sides. */
export const DARTERS: ReadonlySet<string> = new Set(["brook-trout"]);

/** Walleye shake their heads between runs: reel through a shake and the line goes into the red. */
export const HEAD_SHAKERS: ReadonlySet<string> = new Set(["walleye"]);
export const SHAKE_MS = 600;
/** A shake gives about a reaction time to let go before a tight line goes into the red. */
export const SHAKE_GRACE_SEC = 0.3;

/** Catfish stick to the bottom: a sulking catfish takes two pumps to lift, not one. */
export const STICKERS: ReadonlySet<string> = new Set(["catfish"]);

/** Largemouth bass bury themselves in cover: in the weeds or round a piling they stay put longer and don't run again till they come out. */
export const COVER_DIVERS: ReadonlySet<string> = new Set(["largemouth-bass"]);
export const COVER_HOLD = 1.6;

export const LONG_RUNNERS: ReadonlySet<string> = new Set(["carp", "salmon"]);
/** How much longer that first run lasts than the carp's other runs. */
export const FIRST_RUN_LONGER = 1.6;
/** A leap is in the air this long. */
export const JUMP_MS = 750;
/** Seconds into a leap before a held line costs anything: a prompt bow is always in time. */
export const JUMP_GRACE_SEC = 0.15;
export type FightRuntime = {
  sim: FightSim;
  performance: FightPerformance;
  step(nowMs: number, dtSec: number, reeling: boolean, steer?: Steer): FightOutcome;
};

export type FightPerformance = {
  peakTension: number;
  maxLine: number;
  /** Runs the angler cut short by pulling the rod the other way. */
  turnedRuns?: number;
  /** Leaps the angler bowed to, letting go before the line loaded the rod. */
  bowedLeaps?: number;
  /** A walleye's head shakes the angler eased off for, not reeling through into the red. */
  easedShakes?: number;
  /** A brook trout's darts the angler switched sides for and kept turning. */
  followedDarts?: number;
  /** A trophy that made a second run at the net. */
  encore?: boolean;
  /** Seconds of fight played so far, by game time, so a paused tab doesn't count. */
  fightSec?: number;
  /** At the reeds, the point or the dock, every run so far kept out of the weeds, off the rocks or clear of the pilings; at the inlet, every run downstream turned upstream. Unset once one wasn't. */
  clearOf?: "weeds" | "rocks" | "pilings" | "current";
};

/** Where FightBar turns the tension bar red. */
export const RED_TENSION = 0.8;
/** Under this the line is easy; between it and RED_TENSION it is tight. */
export const TIGHT_TENSION = 0.55;

export type TensionZone = "easy" | "tight" | "red";

/** A fish tires against a reeling line and faster on its runs; a slack line in calm water lets it rest. */
const TIRE_REEL = 0.05;
const TIRE_RUN = 0.07;
const REST = 0.015;
/** At the bottom of its stamina a fish's runs pull this share as hard, and its calm spells last this much longer. */
const SPENT_PULL = 0.55;
const SPENT_CALM = 1.3;
/** A played-out fish comes in this much faster. */
const SPENT_REEL = 1.2;
/** Pulling the rod against a run eats this many extra seconds of it each second, and tires the fish this much more. */
const TURN_CUT = 0.9;
const TIRE_TURN = 0.06;

/** Under this the fish is tiring; under the other it is played out. */
export const TIRING_STAMINA = 0.6;
export const SPENT_STAMINA = 0.25;
export type StaminaState = "fresh" | "tiring" | "spent";

/** Reeling with the tension bar in the tight (amber) zone brings line in this much faster. */
export const PRESSURE_REEL = 1.25;

/** A fish hooked solid on a quick strike starts the fight this worn. */
export const SOLID_HOOK_STAMINA = 0.8;

/** Reeled this close with fight still in it, a fish sees the net and makes one last run; a played-out fish comes in quietly. */
export const LAST_RUN_LINE = 0.15;

/** Bottom feeders sulk after every second run, for this long at most, unless the angler pumps them up first. */
export const SULK_MS = 2200;
/** While it sulks, reeling brings line in at this share of the usual rate. */
export const SULK_REEL = 0.2;
/** A slack line held this long while it sulks, then a turn of the reel, pumps the fish off the bottom. */
export const SULK_PUMP_SEC = 0.4;
/** How long a fish that ran into the weeds sits there, and how much of the usual line a turn of the reel wins back meanwhile. */
export const WEED_MS = 1600;
export const WEED_REEL = 0.3;
/** How much faster slack line drifts out in the inlet's current. */
export const CURRENT_DRIFT = 1.6;
/** A swollen inlet (spring melt or rain) pulls this much harder still on slack line. */
export const FLOOD_DRIFT = 1.25;

/** Whether the inlet runs swollen: with spring's melt or in rain. */
export function floodedInlet(spot: string, season: string | undefined, sky: string | undefined) {
  return spot === "inlet" && (season === "spring" || sky === "rain");
}
/** The inlet's current flows this way across the view; a run heading with it, left unturned, takes this much more line. */
export const DOWNSTREAM_SIDE = 1;
export const DOWNSTREAM_RUN = 1.3;
/** At the drop-off a run dives down the ledge: it pulls this much harder, and tires the fish this much more. */
export const DEEP_PULL = 1.25;
export const DEEP_TIRE = 1.3;
/** Off the point a run left unturned drags the line over the rocks: reeling against it loads the line this much harder. */
export const ROCK_PULL = 1.2;
/** At the dock a run left unturned wraps the line round a piling for this long: reeling wins no line meanwhile and loads it this much harder each second. */
export const WRAP_MS = 1200;
export const WRAP_PULL = 0.5;
/** Out on the boat it swings to follow a run, so a run takes out only this share of the line it would from the bank. */
export const BOAT_RUN = 0.65;
/** In winter's cold water a hooked fish is sluggish: it tires this much faster on a run or against the reel. */
export const WINTER_TIRE = 1.25;

/** Cold lovers: a burbot spawns under winter's ice, and a pike hunts on through the winter, so both stay lively in the cold. */
export const COLD_LOVERS: ReadonlySet<string> = new Set(["burbot", "pike"]);

/** Whether a fish thrives in winter's cold rather than going sluggish. */
export function thrivesInCold(season: string | undefined, speciesId?: string) {
  return season === "winter" && speciesId !== undefined && COLD_LOVERS.has(speciesId);
}

/** How the season speeds a fish's tiring: faster in winter unless it's a cold lover, else 1. */
export function seasonTireMul(season: string | undefined, speciesId?: string) {
  return season === "winter" && !thrivesInCold(season, speciesId) ? WINTER_TIRE : 1;
}
/** Cold-water fish: summer's warm water holds little air for them, so they tire sooner. */
export const COLDWATER: ReadonlySet<string> = new Set(["brook-trout", "rainbow-trout", "salmon", "lake-whitefish"]);
/** In summer a cold-water fish tires this much faster on a run or against the reel. */
export const SUMMER_TIRE = 1.2;

/** Whether a summer rain has cooled the water for a cold-water fish, sparing it summer's short air. */
export function rainCooled(season: string | undefined, speciesId: string, sky: string | undefined) {
  return season === "summer" && COLDWATER.has(speciesId) && sky === "rain";
}

/** Whether a cold-water fish hooked off the dropoff in summer has found cool water down deep, sparing it summer's short air. */
export function deepCooled(season: string | undefined, speciesId: string, spot: string | undefined) {
  return season === "summer" && COLDWATER.has(speciesId) && spot === "dropoff";
}

/** How summer's warm water speeds a cold-water fish's tiring: faster in summer unless rain or the deep has cooled it, else 1. */
export function warmTireMul(season: string | undefined, speciesId: string, sky?: string, spot?: string) {
  return season === "summer" && COLDWATER.has(speciesId) && !rainCooled(season, speciesId, sky) && !deepCooled(season, speciesId, spot) ? SUMMER_TIRE : 1;
}
/** Fall run fish: in fall they run up to spawn, full of fight (a brook trout spawns in fall too, in colour and on edge). */
export const FALL_RUNNERS: ReadonlySet<string> = new Set(["salmon", "brook-trout"]);
/** In fall a fish on its spawning run tires only this fast on a run or against the reel. */
export const FALL_RUN_TIRE = 0.8;

/** How a fall spawning run slows a fish's tiring: slower in fall for a fall runner, else 1. */
export function runTireMul(season: string | undefined, speciesId: string) {
  return season === "fall" && FALL_RUNNERS.has(speciesId) ? FALL_RUN_TIRE : 1;
}
/** Spring run fish: in spring they run up the inlet to spawn, full of fight. */
export const SPRING_RUNNERS: ReadonlySet<string> = new Set(["sturgeon"]);
/** In spring a spring runner hooked at the inlet tires only this fast on a run or against the reel. */
export const SPRING_RUN_TIRE = 0.8;

/** How a spring spawning run slows a fish's tiring: slower for a spring runner hooked at the inlet in spring, else 1. */
export function springRunTireMul(season: string | undefined, speciesId: string, spot: string) {
  return season === "spring" && spot === "inlet" && SPRING_RUNNERS.has(speciesId) ? SPRING_RUN_TIRE : 1;
}
/** Current fighters: built for moving water, they turn broadside to the inlet's current and fight it. A brook trout is a stream fish at heart and does the same. */
export const CURRENT_FIGHTERS: ReadonlySet<string> = new Set(["smallmouth-bass", "rainbow-trout", "brook-trout"]);
/** A current fighter hooked at the inlet tires only this fast on a run or against the reel. */
export const CURRENT_FIGHTER_TIRE = 0.85;

/** How the inlet's current slows a current fighter's tiring: slower at the inlet, else 1. */
export function currentTireMul(speciesId: string, spot: string) {
  return spot === "inlet" && CURRENT_FIGHTERS.has(speciesId) ? CURRENT_FIGHTER_TIRE : 1;
}
/** Fall feeders: they feed hard before winter and are at full strength in fall. */
export const FALL_FEEDERS: ReadonlySet<string> = new Set(["tiger-muskie"]);
/** In fall a fall feeder tires only this fast on a run or against the reel. */
export const FALL_FEED_TIRE = 0.85;

/** How fall feeding slows a fish's tiring: slower in fall for a fall feeder, else 1. */
export function fallFeedTireMul(season: string | undefined, speciesId: string) {
  return season === "fall" && FALL_FEEDERS.has(speciesId) ? FALL_FEED_TIRE : 1;
}
/** Scent hunters: they hunt by smell, so murky rain water suits them. */
export const SCENT_HUNTERS: ReadonlySet<string> = new Set(["catfish"]);
/** In rain a scent hunter tires only this fast on a run or against the reel. */
export const RAIN_HUNTER_TIRE = 0.85;

/** How rain's murky water slows a scent hunter's tiring: slower in rain, else 1. */
export function rainHunterTireMul(sky: string | undefined, speciesId: string) {
  return sky === "rain" && SCENT_HUNTERS.has(speciesId) ? RAIN_HUNTER_TIRE : 1;
}
/** Warm lovers: a carp thrives in summer's warm water, when it feeds most and is at its strongest. */
export const WARM_LOVERS: ReadonlySet<string> = new Set(["carp"]);
/** In summer a warm lover tires only this fast on a run or against the reel. */
export const SUMMER_STRENGTH_TIRE = 0.85;

/** How summer's warm water slows a warm lover's tiring: slower in summer, else 1. */
export function summerStrengthTireMul(season: string | undefined, speciesId: string) {
  return season === "summer" && WARM_LOVERS.has(speciesId) ? SUMMER_STRENGTH_TIRE : 1;
}
/** Nest guarders: in spring they guard a nest in the shallows and fight hard for it. A bluegill fans its nest in the same shallows and chases off anything that comes near. */
export const NEST_GUARDERS: ReadonlySet<string> = new Set(["largemouth-bass", "smallmouth-bass", "bluegill"]);
/** The shallow spots where a nest guarder makes its nest. */
export const NEST_SPOTS: ReadonlySet<string> = new Set(["reeds", "dock"]);
/** In spring a nest guarder hooked by its nest tires only this fast on a run or against the reel. */
export const NEST_TIRE = 0.85;

/** How guarding a nest slows a fish's tiring: slower in spring for a nest guarder hooked in the shallows, else 1. */
export function nestTireMul(season: string | undefined, speciesId: string, spot: string) {
  return season === "spring" && NEST_GUARDERS.has(speciesId) && NEST_SPOTS.has(spot) ? NEST_TIRE : 1;
}
/** Night hunters: after dark they're out feeding at full strength. */
export const NIGHT_HUNTERS: ReadonlySet<string> = new Set(["catfish", "burbot"]);
/** At night a night hunter tires only this fast on a run or against the reel. */
export const NIGHT_HUNTER_TIRE = 0.85;

/** How the night slows a night hunter's tiring: slower at night, else 1. */
export function nightTireMul(hour: string | undefined, speciesId: string) {
  return hour === "night" && NIGHT_HUNTERS.has(speciesId) ? NIGHT_HUNTER_TIRE : 1;
}
/** Twilight hunters: their eyes are made for low light, so they hunt hardest at dawn and dusk. */
export const TWILIGHT_HUNTERS: ReadonlySet<string> = new Set(["walleye", "crappie"]);
/** At dawn or dusk a twilight hunter tires only this fast on a run or against the reel. */
export const TWILIGHT_HUNTER_TIRE = 0.85;

/** How the low light slows a twilight hunter's tiring: slower at dawn and dusk, else 1. */
export function twilightTireMul(hour: string | undefined, speciesId: string) {
  return (hour === "dawn" || hour === "dusk") && TWILIGHT_HUNTERS.has(speciesId) ? TWILIGHT_HUNTER_TIRE : 1;
}
/** Early spawners: they spawn as the ice goes out and are worn from it through spring. */
export const EARLY_SPAWNERS: ReadonlySet<string> = new Set(["pike", "walleye"]);
/** In spring an early spawner, worn from spawning, tires this much faster on a run or against the reel. */
export const SPAWN_SPENT_TIRE = 1.15;

/** How spawning wears an early spawner: faster tiring in spring, else 1. */
export function spentTireMul(season: string | undefined, speciesId: string) {
  return season === "spring" && EARLY_SPAWNERS.has(speciesId) ? SPAWN_SPENT_TIRE : 1;
}
/** A day's wind bellies a slack line, so between runs it drifts out this much faster. */
export const WIND_SLACK = { breezy: 1.25, strong: 1.5 } as const;
export type FightWind = keyof typeof WIND_SLACK;

/** Breezy and strong days push on the line; calm and light ones don't. */
export function fightWind(wind: string | undefined): FightWind | undefined {
  return wind === "breezy" || wind === "strong" ? wind : undefined;
}
export type FightWater = "open" | "weeds" | "current" | "deep" | "rocks" | "boat" | "pilings";
/** The water a spot gives the fight. */
export function fightWater(spot: string): FightWater {
  return spot === "reeds" ? "weeds" : spot === "inlet" ? "current" : spot === "dropoff" ? "deep" : spot === "point" ? "rocks" : spot === "open" ? "boat" : spot === "dock" ? "pilings" : "open";
}

export function staminaState(stamina: number): StaminaState {
  if (stamina < SPENT_STAMINA) return "spent";
  return stamina < TIRING_STAMINA ? "tiring" : "fresh";
}

/** The fight bar's zone for a tension, so it can be named in words and patterns as well as colour. */
export function tensionZone(tension: number): TensionZone {
  if (tension < TIGHT_TENSION) return "easy";
  return tension < RED_TENSION ? "tight" : "red";
}

/** Line out past this and the fish is gone. */
export const ESCAPE_LINE = 1.25;
/** 80% of the way from hookset (1) to escape (1.25), like RED_TENSION; a hookset tap's idle frames stay far below it. */
export const RUN_OUT_LINE = 1.2;
/** A third of the way from hookset to escape, the fight card warns that the line is running out. */
export const SHORT_LINE = 1 + (ESCAPE_LINE - 1) / 3;

/** Tension this close to snapping, or the line this near the escape, and a landed fish was a close call. */
export const CLOSE_CALL_TENSION = 0.95;

export function isCloseCall(performance: FightPerformance) {
  return performance.peakTension >= CLOSE_CALL_TENSION || performance.maxLine >= RUN_OUT_LINE;
}

/** Clean = tension never went red and the fish never nearly ran out the line. */
export function isCleanFight(performance: FightPerformance) {
  return performance.peakTension < RED_TENSION && performance.maxLine < RUN_OUT_LINE;
}

type Pattern = {
  calmMin: number;
  calmMax: number;
  surgeMin: number;
  surgeMax: number;
  warnMs: number;
  strength: number;
  reelSurge: number;
};

const PATTERNS: Record<ChallengeId, Pattern> = {
  mash: { calmMin: 700, calmMax: 1200, surgeMin: 400, surgeMax: 700, warnMs: 220, strength: 0.35, reelSurge: 0.75 },
  timing: { calmMin: 1500, calmMax: 2400, surgeMin: 700, surgeMax: 1000, warnMs: 480, strength: 0.62, reelSurge: 0.18 },
  tension: { calmMin: 1100, calmMax: 1800, surgeMin: 1600, surgeMax: 2400, warnMs: 380, strength: 0.48, reelSurge: 0.4 },
  sequence: { calmMin: 800, calmMax: 1300, surgeMin: 700, surgeMax: 1100, warnMs: 260, strength: 0.5, reelSurge: 0.32 },
  surge: { calmMin: 900, calmMax: 1400, surgeMin: 1200, surgeMax: 1900, warnMs: 350, strength: 0.52, reelSurge: 0.28 },
};

/** Reeling as a run starts turns the bar red and costs the clean bonus; the run then pulls gently enough that red lasts ~0.3 s, so a 0.25 s reaction to red or LET GO still saves the line. */
const SURGE_PULL = 0.6;

/** A run cannot snap the line in its first moments, so a prompt LET GO is saved at any frame rate. */
const RUN_GRACE_MS = 300;
const GRACE_TENSION = 0.95;

/** The fight card's calls when the coming run is a leap: calm, warning, in the air. */
export function jumpLines(): [string, string, string] {
  return [t("Reel steady"), t("Let go now — it's coming up!"), t("BOW — it's jumping!")];
}

/** The fight card's three calls for a challenge (calm, warning, run), in the player's language. */
export function fightLines(challenge: ChallengeId): [string, string, string] {
  switch (challenge) {
    case "mash":
      return [t("Reel in quick pumps"), t("Let go now — it's shaking"), t("LET GO — head shake!")];
    case "timing":
      return [t("Reel a steady retrieve"), t("Let go now — it's lining up"), t("LET GO — it's running!")];
    case "tension":
      return [t("Reel and grind it in"), t("Let go now — the rod loads"), t("LET GO — bulldog run!")];
    case "sequence":
      return [t("Reel in short pumps"), t("Let go now — another burst"), t("LET GO — double run!")];
    case "surge":
      return [t("Reel easy — don't horse it"), t("Let go now — it's gathering"), t("LET GO — long run!")];
  }
}

export function makeFight(
  species: FishSpecies,
  weight: number,
  strength: number,
  random: () => number = Math.random,
  /** Above 1, the fish tires faster (a level 9 unlock); resting is unchanged. */
  tireMul = 1,
  /** What the water does to the fight: at the reeds an unturned run ends in the weeds; at the inlet the current takes slack line and helps a run downstream; at the drop-off runs dive; off the point an unturned run drags the line over the rocks; at the dock an unturned run wraps the line round a piling; out on the boat runs take less line. */
  water: FightWater = "open",
  /** A breezy or strong day: slack line drifts out faster between runs. */
  wind?: FightWind,
  /** Hooked on a topwater lure: a jumper is already at the top, so its first run is a leap. */
  topwater = false,
  /** Hooked on a lure with treble hooks (a spinner, spoon or crankbait), or deep on swallowed bait: a tearing hook holds longer. */
  trebles = false,
  /** Winter's cold water: a jumper stays down and never leaps. */
  cold = false,
  /** A trophy-sized fish: like a carp, its first run is the long one. */
  trophy = false,
  /** The inlet runs swollen with spring's melt or rain: its current takes slack line faster still. */
  flood = false,
): FightRuntime {
  const weedy = water === "weeds";
  const pattern = PATTERNS[species.challenge];
  const t = difficulty01(species, weight);
  const reelRate = Math.max(0.07, 0.14 + strength * 0.005 - t * 0.02);
  const driftWater = (0.012 + t * 0.015) * (water === "current" ? CURRENT_DRIFT * (flood ? FLOOD_DRIFT : 1) : 1);
  const driftCalm = driftWater * (wind ? WIND_SLACK[wind] : 1);
  // A run takes line by its own pull; the wind only shows on a resting line.
  const driftSurge = driftWater * (species.challenge === "tension" ? 1.35 : 2) * (water === "boat" ? BOAT_RUN : 1);
  const tensionUpCalm = Math.max(
    0.12,
    0.2 + t * 0.12 - (strength - 1) * 0.015 + (species.challenge === "tension" ? 0.08 : 0),
  );
  const tensionDecay = species.challenge === "mash" ? 0.7 : 0.85;
  const surgeScale = 0.55 + t * 0.35;
  const range = (min: number, max: number) => min + random() * (max - min);

  // Runs swing from side to side; the first way is the fish's own, not a dice roll, so seeded fights replay unchanged.
  const firstSide = Math.floor(weight * 10) % 2 === 0 ? 1 : -1;
  const sim: FightSim = { line: 1, tension: 0.2, surge: 0, stamina: 1, runSide: firstSide };
  /** 0 fresh, 1 spent: how far the fish has tired. */
  const worn = () => 1 - sim.stamina;
  const performance: FightPerformance = { peakTension: sim.tension, maxLine: sim.line, turnedRuns: 0, bowedLeaps: 0, fightSec: 0 };
  let completedSurges = 0;
  let nextAt: number | null = null;
  let graceUntil = -Infinity;
  let jumpAge = 0;
  let lastRunDone = false;
  /** A trophy-sized fish sees the net twice. */
  let lastRunsLeft = isTrophyWeight(species, weight) ? 2 : 1;
  let turnedThisRun = false;
  let heldThroughLeap = false;
  const leaper = LEAPERS.has(species.id) && !cold;
  const breacher = BREACHERS.has(species.id);
  const tailWalker = TAIL_WALKERS.has(species.id);
  let walked = false;
  const roller = ROLLERS.has(species.id);
  const longRunner = LONG_RUNNERS.has(species.id) || trophy;
  const coverDiver = COVER_DIVERS.has(species.id);
  const darter = DARTERS.has(species.id);
  const headShaker = HEAD_SHAKERS.has(species.id);
  const sticker = STICKERS.has(species.id);
  /** When the calm would have ended had a catfish not stuck to the bottom. */
  let calmEnd = 0;
  let shakeAt = Infinity;
  /** How much of a darter's run is left when it cuts back: half of it, so turning it, which shortens the run, brings the dart sooner. */
  let dartLeft: number | null = null;
  let followedDart = false;
  let heldThroughShake = false;
  const coverHold = coverDiver ? COVER_HOLD : 1;
  const turnable = canTurnRuns(species.challenge);
  const sulker = biteStyle(species.id) === "mouth";
  const broadsider = BROADSIDERS.has(species.id);
  const tireHabit = SCRAPPERS.has(species.id) ? SCRAPPER_TIRE : QUITTERS.has(species.id) ? QUIT_TIRE : 1;
  let sulkUntil = -Infinity;
  let slackSec = 0;
  const softMouth = SOFT_MOUTHS.has(species.id);
  const tearAt = (PAPER_MOUTHS.has(species.id) ? PAPER_TEAR_SEC : TEAR_SEC) * (trebles ? TREBLE_HOLD : 1);
  let tearSec = 0;
  let weedUntil = -Infinity;
  let wrapUntil = -Infinity;
  let rockedThisRun = false;
  let fouled = false;

  const step = (nowMs: number, dtSec: number, reeling: boolean, steer: Steer = 0): FightOutcome => {
    if (nextAt === null) nextAt = nowMs + range(1200, 1800);
    if (lastRunsLeft > 0 && sim.surge === 0 && sim.line > 0 && sim.line < LAST_RUN_LINE && sim.stamina > SPENT_STAMINA) {
      sim.encore = lastRunDone;
      if (lastRunDone) performance.encore = true;
      lastRunDone = true;
      lastRunsLeft -= 1;
      sim.lastRun = true;
      nextAt = nowMs;
    }
    if (nowMs >= nextAt) {
      if (sim.surge === 0) {
        sim.surge = 1;
        // A jumper hooked at the top leaps on its first run and every second one after; otherwise on its second.
        sim.jump = (leaper && completedSurges % 2 === (topwater ? 0 : 1)) || (breacher && completedSurges === 0);
        // A pike that sees the net rolls on the line rather than running.
        sim.roll = roller && sim.lastRun === true && !sim.jump;
        // A carp's or a salmon's first run is the long one.
        sim.firstRun = longRunner && completedSurges === 0 && !sim.jump && !sim.roll;
        sim.tailWalk = tailWalker && sim.jump === true && !walked;
        if (sim.tailWalk) walked = true;
        sim.runSide = (completedSurges % 2 === 0 ? firstSide : -firstSide) as -1 | 1;
        jumpAge = 0;
        heldThroughLeap = false;
        // A leap gets a longer warning: it is the one mistake that ends the fight outright.
        nextAt = nowMs + (sim.jump || sim.roll ? Math.max(pattern.warnMs, 420) : pattern.warnMs);
      } else if (sim.surge === 1) {
        sim.surge = 2;
        nextAt = nowMs + (sim.jump ? JUMP_MS * (sim.tailWalk ? TAIL_WALK : 1) : sim.roll ? ROLL_MS : range(pattern.surgeMin, pattern.surgeMax) * (sim.firstRun ? FIRST_RUN_LONGER : 1));
        // Starter head shakes skip this: their 220 ms warning is about one reaction time.
        if (reeling && species.challenge !== "mash") sim.tension = Math.max(sim.tension, RED_TENSION);
        graceUntil = nowMs + RUN_GRACE_MS;
        dartLeft = darter && !sim.jump && !sim.roll ? (nextAt - nowMs) / 2 : null;
      } else {
        if (sim.jump && !heldThroughLeap) performance.bowedLeaps = (performance.bowedLeaps ?? 0) + 1;
        if (followedDart) performance.followedDarts = (performance.followedDarts ?? 0) + 1;
        followedDart = false;
        // At the reeds a run nobody turned carries the fish into the weeds; a leap goes up, not in.
        if (weedy && turnable && !sim.jump && !sim.roll && !turnedThisRun && sim.line > 0) {
          sim.weeded = true;
          weedUntil = nowMs + WEED_MS * coverHold;
        }
        // At the dock it wraps the line round a piling instead.
        if (water === "pilings" && turnable && !sim.jump && !sim.roll && !turnedThisRun && sim.line > 0) {
          sim.wrapped = true;
          wrapUntil = nowMs + WRAP_MS * coverHold;
        }
        // A clean run at the reeds or the point counts toward the landed card's note; one that went in spoils it.
        if ((weedy || water === "rocks" || water === "pilings") && turnable && !sim.jump && !sim.roll) {
          if (sim.weeded || sim.wrapped || rockedThisRun) fouled = true;
          performance.clearOf = fouled ? undefined : weedy ? "weeds" : water === "pilings" ? "pilings" : "rocks";
        }
        // At the inlet only a run downstream counts: turned upstream it keeps the note, left to run with the current it spoils it.
        if (water === "current" && turnable && !sim.jump && !sim.roll && sim.runSide === DOWNSTREAM_SIDE) {
          if (!turnedThisRun) fouled = true;
          performance.clearOf = fouled ? undefined : "current";
        }
        rockedThisRun = false;
        sim.surge = 0;
        sim.jump = false;
        sim.roll = false;
        sim.firstRun = false;
        sim.tailWalk = false;
        sim.darted = false;
        dartLeft = null;
        sim.lastRun = false;
        sim.encore = false;
        completedSurges += 1;
        if (turnedThisRun) performance.turnedRuns = (performance.turnedRuns ?? 0) + 1;
        turnedThisRun = false;
        // A bottom feeder with fight left digs in after every second run.
        if (sulker && completedSurges % 2 === 0 && sim.stamina > SPENT_STAMINA && !lastRunDone) {
          sim.sulk = true;
          sulkUntil = nowMs + SULK_MS;
          slackSec = 0;
        }
        const double = species.challenge === "sequence" && completedSurges % 2 === 1;
        nextAt = nowMs + (double ? range(160, 280) : range(pattern.calmMin, pattern.calmMax) * (1 + worn() * (SPENT_CALM - 1)));
        // A walleye with fight left shakes its head partway through the calm.
        shakeAt = headShaker && !double && !sim.sulk && sim.stamina > SPENT_STAMINA ? nowMs + (nextAt - nowMs) * 0.4 : Infinity;
        // A bass buried in cover doesn't run again till it comes out.
        if (coverDiver && sim.weeded) nextAt = Math.max(nextAt, weedUntil);
        if (coverDiver && sim.wrapped) nextAt = Math.max(nextAt, wrapUntil);
        // A catfish stuck on the bottom doesn't run again till it is lifted or comes up on its own.
        calmEnd = nextAt;
        if (sticker && sim.sulk) nextAt = Math.max(nextAt, sulkUntil);
      }
    }

    if (sim.weeded && (sim.surge !== 0 || nowMs >= weedUntil)) sim.weeded = false;
    if (sim.wrapped && (sim.surge !== 0 || nowMs >= wrapUntil)) sim.wrapped = false;
    if (sim.sulk) {
      if (sim.surge !== 0 || nowMs >= sulkUntil) sim.sulk = false;
      else if (!reeling) slackSec += dtSec;
      else if (slackSec >= SULK_PUMP_SEC) {
        // A catfish only starts to lift on the first pump; the next one brings it up.
        if (sticker && !sim.lifting) {
          sim.lifting = true;
          slackSec = 0;
        } else {
          sim.sulk = false;
          if (sticker && nextAt !== null) nextAt = Math.min(nextAt, Math.max(calmEnd, nowMs));
        }
      }
    }
    if (!sim.sulk) sim.lifting = false;

    const wasShaking = sim.shake === true;
    sim.shake = sim.surge === 0 && nowMs >= shakeAt && nowMs < shakeAt + SHAKE_MS;
    if (wasShaking && !sim.shake) {
      if (!heldThroughShake) performance.easedShakes = (performance.easedShakes ?? 0) + 1;
      heldThroughShake = false;
    }
    // A brook trout cuts back the other way halfway through its run.
    if (dartLeft !== null && sim.surge === 2 && nextAt !== null && nextAt - nowMs <= dartLeft) {
      dartLeft = null;
      sim.darted = true;
      sim.runSide = -sim.runSide as -1 | 1;
    }
    // A leap goes up, not sideways, so only a run can be turned.
    sim.turning = turnable && sim.surge === 2 && !sim.jump && !sim.roll && steer === -sim.runSide;
    if (sim.turning && nextAt !== null) nextAt -= TURN_CUT * dtSec * 1000;
    if (sim.turning) turnedThisRun = true;
    if (sim.turning && sim.darted) followedDart = true;
    const escalation = species.challenge === "surge" ? Math.min(0.25, completedSurges * 0.05) : 0;
    const eff = (pattern.strength * surgeScale + escalation) * SURGE_PULL * (1 - worn() * (1 - SPENT_PULL)) * (water === "deep" ? DEEP_PULL : 1);
    const rocky = water === "rocks" && turnable && !sim.turning && !sim.roll;
    sim.rocky = rocky && sim.surge === 2 && !sim.jump;
    sim.diving = water === "deep" && sim.surge === 2 && !sim.jump && !sim.roll;
    sim.downstream = water === "current" && turnable && sim.surge === 2 && !sim.jump && !sim.roll && !sim.turning && sim.runSide === DOWNSTREAM_SIDE;
    sim.carried = water === "current" && sim.surge === 0 && !reeling && !sim.sulk && !sim.weeded;
    if (sim.rocky && reeling) rockedThisRun = true;
    if (reeling) {
      sim.tension += (tensionUpCalm + (sim.surge === 2 ? eff * (rocky ? ROCK_PULL : 1) : 0) + (sim.wrapped ? WRAP_PULL : 0)) * dtSec;
      // Line under real pressure comes in faster, for an angler brave enough to reel in the amber.
      const pressure = sim.tension >= TIGHT_TENSION && sim.tension < RED_TENSION ? PRESSURE_REEL : 1;
      sim.line -= reelRate * pressure * (1 + worn() * (SPENT_REEL - 1)) * (sim.surge === 2 ? pattern.reelSurge : 1) * (sim.sulk ? SULK_REEL : 1) * (sim.weeded ? WEED_REEL : 1) * (sim.wrapped ? 0 : 1) * (broadsider && sim.stamina >= TIRING_STAMINA ? BROADSIDE_REEL : 1) * dtSec;
    } else {
      sim.tension = Math.max(0, sim.tension - tensionDecay * dtSec);
      // A sulking fish sits where it is: no line goes out.
      if (!sim.sulk && !sim.weeded && !sim.wrapped) sim.line += (sim.surge === 2 ? driftSurge * (sim.downstream ? DOWNSTREAM_RUN : 1) : driftCalm) * dtSec;
    }
    // Like a leap, a shake reeled through costs the clean bonus, never the fish.
    if (reeling && sim.shake && nowMs >= shakeAt + SHAKE_GRACE_SEC * 1000) {
      sim.tension = Math.max(sim.tension, RED_TENSION);
      heldThroughShake = true;
    }
    // A line held tight through a leap or a roll loads the rod into the red: the clean bonus goes, but never the fish.
    if ((sim.jump || sim.roll) && sim.surge === 2) {
      jumpAge += dtSec;
      if (reeling && jumpAge > JUMP_GRACE_SEC) {
        sim.tension = Math.max(sim.tension, RED_TENSION);
        if (sim.jump) heldThroughLeap = true;
      }
    }
    if (nowMs < graceUntil) sim.tension = Math.min(sim.tension, GRACE_TENSION);
    // Bigger fish have more fight in them.
    const tire = sim.weeded ? -REST : sim.surge === 2 ? TIRE_RUN * (water === "deep" ? DEEP_TIRE : 1) + (sim.turning ? TIRE_TURN : 0) : reeling ? TIRE_REEL : -REST;
    sim.stamina = Math.min(1, Math.max(0, sim.stamina - (tire > 0 ? tire * tireMul * tireHabit : tire) * dtSec));
    sim.line = Math.min(1.3, Math.max(0, sim.line));
    performance.peakTension = Math.max(performance.peakTension, sim.tension);
    performance.maxLine = Math.max(performance.maxLine, sim.line);
    performance.fightSec = (performance.fightSec ?? 0) + dtSec;

    // Reeling a soft mouth, or a fish hooked light, in the red tears the hook hole wider until it pulls free.
    if ((softMouth || sim.lightHook) && reeling && sim.tension >= RED_TENSION) tearSec += dtSec;
    else tearSec = 0;
    sim.tearing = tearSec > 0;

    if (sim.line <= 0) return "landed";
    if (sim.tension >= 1) return "snapped";
    if (tearSec >= tearAt) {
      sim.tornOut = true;
      return "escaped";
    }
    if (sim.line >= ESCAPE_LINE) return "escaped";
    return "fighting";
  };

  return { sim, performance, step };
}
