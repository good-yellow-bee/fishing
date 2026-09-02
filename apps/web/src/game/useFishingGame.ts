import { useCallback, useEffect, useRef, useState } from "react";
import {
  anglerLevel,
  canLand,
  canUseSpot,
  lakeHour,
  type FishSpecies,
  type LakeHour,
  type Profile,
  type SpotId,
} from "@stillwater/shared";
import { makeFight, FIGHT_LINES, type FightRuntime, type FightSim, type SurgeState } from "./fight";
import { fx } from "./fx";
import { hookWindowMs, makeCatch, pickBite, sweetBand, waitMs } from "./logic";
import type { ScenePhase } from "./scene/types";

export type AimHint = SpotId | "shore";

function hintFromDataset(raw: string | undefined): AimHint | null {
  if (raw === "dock" || raw === "reeds" || raw === "dropoff" || raw === "shore") return raw;
  return null;
}

export type Fight = {
  species: FishSpecies;
  weight: number;
  underpowered: boolean;
};

export type Outcome =
  | { kind: "landed"; species: FishSpecies; weight: number; spot: SpotId }
  | { kind: "broke"; message: string }
  | { kind: "miss"; message: string };

type Timers = {
  wait?: number;
  hook?: number;
  snap?: number;
  nibble?: number;
  nibbleOff?: number;
};

export function useFishingGame(profile: Profile | null, hour: LakeHour = lakeHour()) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<ScenePhase>("idle");
  const powerRef = useRef(0);
  const holdingRef = useRef(false);
  const holdStartRef = useRef(0);
  const castPointerRef = useRef<number | null>(null);
  const fightRef = useRef<Fight | null>(null);
  const runtimeRef = useRef<FightRuntime | null>(null);
  const simRef = useRef<FightSim | null>(null);
  const reelKeyRef = useRef(false);
  const reelPointerRef = useRef<number | null>(null);
  const spotRef = useRef<SpotId>("dock");
  const aimHintRef = useRef<AimHint>("dock");
  const timers = useRef<Timers>({});
  const [phase, setPhase] = useState<ScenePhase>("idle");
  const [power, setPower] = useState(0);
  const [spot, setSpot] = useState<SpotId>("dock");
  const [aimHint, setAimHint] = useState<AimHint>("dock");
  const [fight, setFight] = useState<Fight | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [nibble, setNibble] = useState(false);
  const [hint, setHint] = useState("Click the water to aim. Hold to charge, release in the pale band.");

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
    reelKeyRef.current = false;
    reelPointerRef.current = null;
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

  const resetToIdle = useCallback((message: string) => {
    clearTimers();
    holdingRef.current = false;
    castPointerRef.current = null;
    powerRef.current = 0;
    clearFight();
    setPower(0);
    setPhaseBoth("idle");
    setHint(message);
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
        resetToIdle("Line parted. Spend points on Strength.");
      }, 1400);
    } else {
      const runtime = makeFight(species, weight, current.strength);
      runtimeRef.current = runtime;
      simRef.current = runtime.sim;
      setHint(`${FIGHT_LINES[species.challenge][0]}. Ease off when it runs.`);
    }
  }, [resetToIdle]);

  const setTheHook = useCallback(() => {
    if (phaseRef.current !== "hookset" || !profile) return;
    window.clearTimeout(timers.current.hook);
    fx.splash();
    const short = powerRef.current < sweetBand(profile.accuracy).min;
    const species = pickBite(spotRef.current, profile, short, Math.random, hour);
    const { weight } = makeCatch(species, profile.patience);
    beginFight(species, weight, profile);
  }, [beginFight, hour, profile]);

  const startWait = useCallback((current: Profile) => {
    setPhaseBoth("waiting");
    setNibble(false);
    setHint("Watch the bobber. A nibble first — strike on the real dip.");
    const wait = waitMs(current.patience, hour);
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
        setOutcome({ kind: "miss", message: "The fish dropped the bait." });
        resetToIdle("Missed the strike. Cast again.");
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
    const aimed = hintFromDataset(surfaceRef.current?.dataset.spot);
    const level = anglerLevel(profile.lifetimePoints);
    if (!aimed || aimed === "shore") {
      setOutcome({ kind: "miss", message: "Missed the lake." });
      resetToIdle("Bait landed on shore. Aim at the water.");
      return;
    }
    if (!canUseSpot(aimed, level)) {
      setOutcome({ kind: "miss", message: "Drop-off is too deep until level 3." });
      resetToIdle("Drop-off unlocks at level 3. Cast closer in, or toward the reeds.");
      return;
    }
    spotRef.current = aimed;
    setSpot(aimed);
    setAimHint(aimed);
    aimHintRef.current = aimed;
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
    startWait(profile);
  }, [profile, resetToIdle, startWait]);

  const startCast = useCallback(() => {
    if (!profile || phaseRef.current !== "idle") return;
    setOutcome(null);
    holdingRef.current = true;
    holdStartRef.current = performance.now();
    powerRef.current = 0;
    setPower(0);
    setPhaseBoth("casting");
    setHint("Keep the ring on the water. Release in the moss band.");
  }, [profile]);

  const strikeOrCast = useCallback(() => {
    switch (phaseRef.current) {
      case "idle":
        startCast();
        break;
      case "hookset":
        setTheHook();
        break;
    }
  }, [setTheHook, startCast]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("button, a, input, textarea, select, [contenteditable]")) return;
      if (event.code !== "Space" || event.repeat) return;
      event.preventDefault();
      if (phaseRef.current !== "fight") strikeOrCast();
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
        return;
      }
      if (!event.isPrimary || event.button !== 0) return;
      if ((event.target as HTMLElement).closest("button, a, input, [data-camera-control]")) return;
      if (phaseRef.current !== "fight") {
        castPointerRef.current = event.pointerId;
        strikeOrCast();
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
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      if (holdingRef.current && phaseRef.current === "casting") {
        powerRef.current = Math.min(1, (now - holdStartRef.current) / 900);
        setPower(powerRef.current);
      }
      const surface = surfaceRef.current;
      if (surface && (phaseRef.current === "idle" || phaseRef.current === "casting")) {
        const nextHint = hintFromDataset(surface.dataset.spot);
        if (nextHint && nextHint !== aimHintRef.current) {
          aimHintRef.current = nextHint;
          setAimHint(nextHint);
        }
        if (nextHint && nextHint !== "shore" && nextHint !== spotRef.current) {
          spotRef.current = nextHint;
          setSpot(nextHint);
        }
      }
      const runtime = runtimeRef.current;
      const current = fightRef.current;
      if (phaseRef.current === "fight" && runtime && current && !current.underpowered) {
        const reeling = reelKeyRef.current || reelPointerRef.current !== null;
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
          setOutcome({ kind: "landed", species: current.species, weight: current.weight, spot: spotRef.current });
          clearFight();
          setPhaseBoth("result");
          setHint("Landed. Cast again when ready.");
        } else if (result === "snapped") {
          fx.snap();
          setOutcome({ kind: "broke", message: `${current.species.name} snapped the line — too much tension.` });
          resetToIdle("Broke off. Try again.");
        } else if (result === "escaped") {
          fx.snap();
          setOutcome({ kind: "broke", message: `${current.species.name} took all the line and threw the hook.` });
          resetToIdle("Broke off. Try again.");
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [resetToIdle]);

  useEffect(() => clearTimers, []);

  const dismissResult = () => {
    setOutcome(null);
    resetToIdle("Click the water to aim, then hold to cast.");
  };

  return {
    surfaceRef,
    phase,
    power,
    spot,
    aimHint,
    fight,
    outcome,
    hint,
    nibble,
    sim: simRef,
    dismissResult,
  };
}
