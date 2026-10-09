import { useCallback, useEffect, useRef, useState } from "react";
import {
  anglerLevel,
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
  type Profile,
  type Sky,
  type SpotId,
  type StanceId,
} from "@stillwater/shared";
import { isCleanFight, makeFight, FIGHT_LINES, type FightPerformance, type FightRuntime, type FightSim, type SurgeState } from "./fight";
import { fightInput } from "./scene/fightMotion";
import { fx } from "./fx";
import { HOTSPOT_PERIOD_MS, hotspotAt, isHotspotCast, type Hotspot } from "./hotspot";
import { hookWindowMs, makeCatch, pickBite, sweetBand, waitMs } from "./logic";
import { localId } from "./localId";
import type { ScenePhase } from "./scene/types";

export type AimHint = SpotId | "shore";

const CAST_FAIL_HINT: Record<CastFail, string> = {
  stance: "Walk to the water to fish.",
  range: "Too far for this bank. Walk closer.",
  basin: "Wrong water from here. Walk to that bank.",
  locked: "Drop-off unlocks at level 3. Cast closer in, or toward the reeds.",
  shore: "Bait landed on shore. Aim at the water.",
};

const CAST_MISS: Record<CastFail, string> = {
  locked: "Drop-off is too deep until level 3.",
  basin: "Wrong water from here.",
  range: "The lure fell short.",
  stance: "Walk to a bank first.",
  shore: "Missed the lake.",
};

function hintFromDataset(raw: string | undefined): AimHint | null {
  if (raw === "dock" || raw === "reeds" || raw === "dropoff" || raw === "point" || raw === "shore") return raw;
  return null;
}

function castFailHint(reason: CastFail): string {
  return CAST_FAIL_HINT[reason] ?? CAST_FAIL_HINT.shore;
}

function idleHint(stance: StanceId | null) {
  if (stance === "shop") return "E: open the tackle shack. Walk down to the water to fish.";
  if (stance && isFishingStance(stance)) return "Click the water to aim. Hold to charge, release in the pale band.";
  return "Walk to the water.";
}

export type Fight = {
  species: FishSpecies;
  weight: number;
  underpowered: boolean;
};

export type Outcome =
  | { kind: "landed"; id: string; species: FishSpecies; weight: number; spot: SpotId; clean: boolean }
  | { kind: "broke"; message: string }
  | { kind: "miss"; message: string }
  | { kind: "error"; message: string };

type Timers = {
  wait?: number;
  hook?: number;
  snap?: number;
  nibble?: number;
  nibbleOff?: number;
};

const WAIT_HINT = "Watch the bobber. A nibble first — strike on the real dip.";
const HOTSPOT_WAIT_HINT = "Your lure is in the bubbles. Watch the bobber — strike on the real dip.";
const SHORT_CAST_HINT = "Short cast — only small fish will look.";

function movedHint(spot: SpotId) {
  return `The bubbles moved to the ${SPOT_LABELS[spot]}.`;
}

export function useFishingGame(
  profile: Profile | null,
  hour: LakeHour = lakeHour(),
  lureRef?: { readonly current: string },
  sky?: Sky,
) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<ScenePhase>("idle");
  const powerRef = useRef(0);
  const holdingRef = useRef(false);
  const holdStartRef = useRef(0);
  const castPointerRef = useRef<number | null>(null);
  const fightRef = useRef<Fight | null>(null);
  const runtimeRef = useRef<FightRuntime | null>(null);
  const simRef = useRef<FightSim | null>(null);
  const performanceRef = useRef<FightPerformance | null>(null);
  const reelKeyRef = useRef(false);
  const reelPointerRef = useRef<number | null>(null);
  const spotRef = useRef<SpotId>("dock");
  const hotspotRef = useRef<Hotspot | null>(null);
  const castHotspotRef = useRef(false);
  const movedUnheardRef = useRef(false);
  const aimHintRef = useRef<AimHint>("dock");
  const stanceRef = useRef<StanceId>("shop");
  const timers = useRef<Timers>({});
  const waitHintRef = useRef(WAIT_HINT);
  const [phase, setPhase] = useState<ScenePhase>("idle");
  const [power, setPower] = useState(0);
  const [spot, setSpot] = useState<SpotId>("dock");
  const [aimHint, setAimHint] = useState<AimHint>("dock");
  const [fight, setFight] = useState<Fight | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [nibble, setNibble] = useState(false);
  const [hint, setHint] = useState("Walk to the water.");
  const [stance, setStance] = useState<StanceId>("shop");
  const [shopTap, setShopTap] = useState(0);
  const [hotspot, setHotspot] = useState<Hotspot | null>(null);
  const level = profile ? anglerLevel(profile.lifetimePoints) : null;

  const setPhaseBoth = (next: ScenePhase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const clearTimers = () => {
    window.clearTimeout(timers.current.wait);
    window.clearTimeout(timers.current.hook);
    window.clearTimeout(timers.current.snap);
    window.clearTimeout(timers.current.nibble);
    window.clearTimeout(timers.current.nibbleOff);
    timers.current = {};
  };

  const clearFight = () => {
    fightRef.current = null;
    runtimeRef.current = null;
    simRef.current = null;
    performanceRef.current = null;
    reelKeyRef.current = false;
    reelPointerRef.current = null;
    fightInput.reeling = false;
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
    powerRef.current = 0;
    clearFight();
    setPower(0);
    setPhaseBoth(phase);
    const moved = phase === "idle" && movedUnheardRef.current ? hotspotRef.current : null;
    if (moved) movedUnheardRef.current = false;
    setHint(moved ? movedHint(moved.spot) : message);
  }, []);

  const beginFight = useCallback((species: FishSpecies, weight: number, current: Profile) => {
    const underpowered = !canLand(current, species);
    const next = { species, weight, underpowered };
    fightRef.current = next;
    setFight(next);
    setPhaseBoth("fight");
    if (underpowered) {
      setHint("This fish is too heavy for your line.");
      timers.current.snap = window.setTimeout(() => {
        fx.snap();
        setOutcome({ kind: "broke", message: `${species.name} snapped the line.` });
        resetToIdle(`Line parted. Spend points on ${current.strength < species.minStrength ? "Strength" : "Accuracy"}.`);
      }, 1400);
    } else {
      const runtime = makeFight(species, weight, current.strength);
      runtimeRef.current = runtime;
      simRef.current = runtime.sim;
      performanceRef.current = runtime.performance;
      setHint(`${FIGHT_LINES[species.challenge][0]}. Ease off when it runs.`);
    }
  }, [resetToIdle]);

  const setTheHook = useCallback(() => {
    if (phaseRef.current !== "hookset" || !profile) return;
    window.clearTimeout(timers.current.hook);
    fx.splash();
    const short = powerRef.current < sweetBand(profile.accuracy).min;
    const species = pickBite(spotRef.current, profile, short, Math.random, hour, lureRef?.current, sky, castHotspotRef.current);
    const { weight } = makeCatch(species, profile.patience);
    beginFight(species, weight, profile);
  }, [beginFight, hour, profile, sky]);

  const startWait = useCallback((current: Profile, short: boolean) => {
    setPhaseBoth("waiting");
    setNibble(false);
    // A short cast only draws commons, even in the bubbles.
    waitHintRef.current = short ? SHORT_CAST_HINT : castHotspotRef.current ? HOTSPOT_WAIT_HINT : WAIT_HINT;
    setHint(waitHintRef.current);
    const wait = waitMs(current.patience, hour, castHotspotRef.current);
    const nibbleAt = Math.min(wait - 500, wait * 0.5);
    if (nibbleAt >= 480) {
      timers.current.nibble = window.setTimeout(() => {
        if (phaseRef.current !== "waiting") return;
        setNibble(true);
        const surface = surfaceRef.current;
        if (surface) surface.dataset.nibble = "1";
        fx.nibble();
        timers.current.nibbleOff = window.setTimeout(() => {
          setNibble(false);
          if (surface) delete surface.dataset.nibble;
        }, 280);
      }, nibbleAt);
    }
    timers.current.wait = window.setTimeout(() => {
      if (phaseRef.current !== "waiting") return;
      setNibble(false);
      fx.bite();
      setPhaseBoth("hookset");
      setHint("NOW — strike!");
      timers.current.hook = window.setTimeout(() => {
        if (phaseRef.current !== "hookset") return;
        setOutcome({ kind: "miss", message: "Too slow. The fish dropped the bait." });
        // Hold result so the miss spring and the turn play out.
        resetToIdle("Strike the moment the bobber goes under.", "result");
      }, hookWindowMs(current.accuracy));
    }, wait);
  }, [hour, resetToIdle]);

  const releaseCast = useCallback(() => {
    if (phaseRef.current !== "casting" || !profile) return;
    holdingRef.current = false;
    const castPower = Math.min(1, (performance.now() - holdStartRef.current) / 900);
    powerRef.current = castPower;
    setPower(castPower);
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
      setOutcome({ kind: "miss", message: CAST_MISS[landing.reason] });
      resetToIdle(castFailHint(landing.reason));
      return;
    }
    spotRef.current = landing.spot;
    setSpot(landing.spot);
    setAimHint(landing.spot);
    aimHintRef.current = landing.spot;
    if (castPower < 0.22) {
      setOutcome({ kind: "miss", message: "The lure slapped the dock." });
      resetToIdle("Too little power. Hold longer.");
      return;
    }
    if (castPower > 0.94) {
      setOutcome({ kind: "miss", message: "Backlash. Recast." });
      resetToIdle("Overpowered. Release in the band.");
      return;
    }
    castHotspotRef.current = aimed !== null && isHotspotCast(hotspotRef.current, aimed.x, aimed.z, landing.spot);
    startWait(profile, castPower < sweetBand(profile.accuracy).min);
  }, [profile, resetToIdle, startWait]);

  const startCast = useCallback((via: "pointer" | "key") => {
    if (!profile || phaseRef.current !== "idle") return;
    const surface = surfaceRef.current;
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
      setHint(castFailHint(preview.reason));
      return;
    }
    setOutcome(null);
    holdingRef.current = true;
    holdStartRef.current = performance.now();
    powerRef.current = 0;
    setPower(0);
    setPhaseBoth("casting");
    setHint("Keep the ring on the water. Release in the moss band.");
  }, [profile]);

  const strikeOrCast = useCallback((via: "pointer" | "key") => {
    switch (phaseRef.current) {
      case "idle":
        startCast(via);
        break;
      case "hookset":
        setTheHook();
        break;
      case "waiting":
        setHint("Too early. Wait for the bobber to go under, then strike.");
        break;
    }
  }, [setTheHook, startCast]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("button, a, input, textarea, select, [contenteditable]")) return;
      if (event.code !== "Space" || event.repeat) return;
      event.preventDefault();
      if (phaseRef.current !== "fight") strikeOrCast("key");
      // The same press may have just set the hook — count it as reeling.
      if (phaseRef.current === "fight") reelKeyRef.current = true;
    };
    const up = (event: KeyboardEvent) => {
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
      reelPointerRef.current = null;
      if (phaseRef.current === "casting") resetToIdle("Cast cancelled. Click the water or hold Space to try again.");
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
        if (phaseRef.current === "casting") resetToIdle("Camera moved. Hold one finger or Space to cast.");
        // The first finger of a camera pinch was not a strike, so take back its "too early" hint.
        if (phaseRef.current === "waiting") setHint(waitHintRef.current);
        return;
      }
      if (!event.isPrimary || event.button !== 0) return;
      if ((event.target as HTMLElement).closest("button, a, input, select, label, [data-camera-control], [data-lure-choice]")) return;
      if (phaseRef.current !== "fight") {
        castPointerRef.current = event.pointerId;
        strikeOrCast("pointer");
      }
      // The same press may have just set the hook — count it as reeling.
      if (phaseRef.current === "fight") reelPointerRef.current = event.pointerId;
    };
    const up = (event: PointerEvent) => {
      if (event.pointerId === reelPointerRef.current) reelPointerRef.current = null;
      if (phaseRef.current === "fight") return;
      if (event.pointerId !== castPointerRef.current) return;
      castPointerRef.current = null;
      if (phaseRef.current === "casting") releaseCast();
    };
    const cancel = (event: PointerEvent) => {
      if (event.pointerId === reelPointerRef.current) reelPointerRef.current = null;
      if (phaseRef.current === "fight") return;
      if (event.pointerId !== castPointerRef.current) return;
      resetToIdle("Cast cancelled. Click the water or hold Space to try again.");
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
          powerRef.current = Math.min(1, (now - holdStartRef.current) / 900);
          setPower(powerRef.current);
        }
        const surface = surfaceRef.current;
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
        if (phaseRef.current === "fight" && runtime && current && !current.underpowered) {
          const reeling = reelKeyRef.current || reelPointerRef.current !== null;
          fightInput.reeling = reeling;
          const result = runtime.step(now, dt, reeling);
          const sim = runtime.sim;
          if (surface) {
            surface.dataset.tension = sim.tension.toFixed(2);
            surface.dataset.line = sim.line.toFixed(2);
            surface.dataset.surge = String(sim.surge);
          }
          if (sim.surge === 2 && prevSurge !== 2) fx.surge();
          prevSurge = sim.surge;
          if (reeling && now - lastReelFx > 90) {
            fx.reel();
            lastReelFx = now;
          }
          if (result === "landed") {
            fx.land();
            setOutcome({
              kind: "landed",
              id: localId(),
              species: current.species,
              weight: current.weight,
              spot: spotRef.current,
              clean: isCleanFight(runtime.performance),
            });
            clearFight();
            setPhaseBoth("result");
            setHint("Landed. Cast again when ready.");
          } else if (result === "snapped") {
            fx.snap();
            setOutcome({ kind: "broke", message: `${current.species.name} snapped the line — too much tension.` });
            resetToIdle("Too much tension — let go when the bar turns red or the fish is about to run.");
          } else if (result === "escaped") {
            fx.snap();
            setOutcome({ kind: "broke", message: `${current.species.name} took all the line and threw the hook.` });
            resetToIdle("Ran out of line — hold to reel whenever the fish is calm.");
          }
        }
      } catch (error) {
        console.error(error);
        clearTimers();
        holdingRef.current = false;
        castPointerRef.current = null;
        powerRef.current = 0;
        clearFight();
        setPower(0);
        setPhaseBoth("result");
        setOutcome({ kind: "error", message: "The fishing loop hit a problem. You can cast again." });
        setHint(error instanceof Error ? error.message : "The fishing loop hit a problem.");
      }
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
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
    power,
    spot,
    aimHint,
    stance,
    shopTap,
    fight,
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
