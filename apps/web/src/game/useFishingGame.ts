import { useCallback, useEffect, useRef, useState } from "react";
import { canLand, type FishSpecies, type Profile, type SpotId } from "@stillwater/shared";
import { fx } from "./fx";
import { hookWindowMs, makeCatch, pickBite, sweetBand, waitMs } from "./logic";
import type { ScenePhase } from "./scene/types";

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
};

export function useFishingGame(profile: Profile | null, spot: SpotId) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<ScenePhase>("idle");
  const powerRef = useRef(0);
  const holdingRef = useRef(false);
  const holdStartRef = useRef(0);
  const castPointerRef = useRef<number | null>(null);
  const fightRef = useRef<Fight | null>(null);
  const timers = useRef<Timers>({});
  const [phase, setPhase] = useState<ScenePhase>("idle");
  const [power, setPower] = useState(0);
  const [fight, setFight] = useState<Fight | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [hint, setHint] = useState("Hold Space or mouse to charge a cast. Release in the pale band.");

  const setPhaseBoth = (next: ScenePhase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const clearTimers = () => {
    window.clearTimeout(timers.current.wait);
    window.clearTimeout(timers.current.hook);
    window.clearTimeout(timers.current.snap);
    timers.current = {};
  };

  const resetToIdle = useCallback((message: string) => {
    clearTimers();
    holdingRef.current = false;
    castPointerRef.current = null;
    powerRef.current = 0;
    fightRef.current = null;
    setFight(null);
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
      setHint(`Keep the ${species.name} on. ${species.challenge} fight.`);
    }
  }, [resetToIdle]);

  const setTheHook = useCallback(() => {
    if (phaseRef.current !== "hookset" || !profile) return;
    window.clearTimeout(timers.current.hook);
    fx.splash();
    const short = powerRef.current < sweetBand(profile.accuracy).min;
    const species = pickBite(spot, profile, short);
    const { weight } = makeCatch(species, profile.patience);
    beginFight(species, weight, profile);
  }, [beginFight, profile, spot]);

  const startWait = useCallback((current: Profile) => {
    setPhaseBoth("waiting");
    setHint("Watch the bobber. Strike on the dip — Space or click.");
    timers.current.wait = window.setTimeout(() => {
      if (phaseRef.current !== "waiting") return;
      fx.bite();
      setPhaseBoth("hookset");
      setHint("NOW — strike!");
      timers.current.hook = window.setTimeout(() => {
        if (phaseRef.current !== "hookset") return;
        setOutcome({ kind: "miss", message: "The fish dropped the bait." });
        resetToIdle("Missed the strike. Cast again.");
      }, hookWindowMs(current.accuracy));
    }, waitMs(current.patience));
  }, [resetToIdle]);

  const releaseCast = useCallback(() => {
    if (phaseRef.current !== "casting" || !profile) return;
    holdingRef.current = false;
    const castPower = Math.min(1, (performance.now() - holdStartRef.current) / 900);
    powerRef.current = castPower;
    setPower(castPower);
    fx.cast();
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
    setHint("Release in the moss band.");
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
      if (phaseRef.current === "fight") return;
      event.preventDefault();
      strikeOrCast();
    };
    const up = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("button, a, input, textarea, select, [contenteditable]")) return;
      if (event.code !== "Space") return;
      if (phaseRef.current === "casting") {
        event.preventDefault();
        releaseCast();
      }
    };
    const cancelCast = () => {
      if (phaseRef.current === "casting") resetToIdle("Cast cancelled. Hold Space or mouse to try again.");
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", cancelCast);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", cancelCast);
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
      if (phaseRef.current === "fight") return;
      if ((event.target as HTMLElement).closest("button, a, input, [data-camera-control]")) return;
      castPointerRef.current = event.pointerId;
      strikeOrCast();
    };
    const up = (event: PointerEvent) => {
      if (event.pointerId !== castPointerRef.current) return;
      castPointerRef.current = null;
      if (phaseRef.current === "casting") releaseCast();
    };
    const cancel = (event: PointerEvent) => {
      if (event.pointerId !== castPointerRef.current) return;
      resetToIdle("Cast cancelled. Hold Space or mouse to try again.");
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
    const loop = (now: number) => {
      if (holdingRef.current && phaseRef.current === "casting") {
        powerRef.current = Math.min(1, (now - holdStartRef.current) / 900);
        setPower(powerRef.current);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => clearTimers, []);

  const onFightSuccess = () => {
    const current = fightRef.current;
    if (!current || current.underpowered) return;
    fx.land();
    setOutcome({ kind: "landed", species: current.species, weight: current.weight, spot });
    setFight(null);
    fightRef.current = null;
    setPhaseBoth("result");
    setHint("Landed. Cast again when ready.");
  };

  const onFightFail = (reason: string) => {
    const current = fightRef.current;
    fx.snap();
    setOutcome({ kind: "broke", message: reason || `${current?.species.name ?? "Fish"} threw the hook.` });
    resetToIdle("Broke off. Try again.");
  };

  const dismissResult = () => {
    setOutcome(null);
    resetToIdle("Hold Space or mouse to cast.");
  };

  return {
    surfaceRef,
    phase,
    power,
    fight,
    outcome,
    hint,
    onFightSuccess,
    onFightFail,
    dismissResult,
  };
}
