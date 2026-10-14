import { useEffect, useSyncExternalStore } from "react";
import { FLOAT_COLOURS, type FloatColour } from "./scene/floatColour";

/**
 * Player settings, remembered in this browser. Frame loops read the live
 * `settings` object; React reads it through `useSettings()`.
 */

export type ShakeLevel = "off" | "soft" | "full";

export type TextSize = "normal" | "large" | "larger";

export type Settings = {
  /** 0..1, on top of Mute. */
  volume: number;
  /** 0..1 for the lake's own sounds (water, wildlife, rain, wind), under the main volume. */
  natureVolume: number;
  muted: boolean;
  shake: ShakeLevel;
  /** Lite draws half the rain, fireflies and mist, and no sun halo. */
  particles: "full" | "lite";
  /** Effects may step down to Lite on their own when frames sag; off once the player picks effects themselves. */
  autoEffects: boolean;
  shadows: boolean;
  /** Sharp renders up to 1.75 device pixels per CSS pixel; fast renders one. */
  sharpness: "sharp" | "fast";
  /** Hold to reel, or tap once to start reeling and again to stop. */
  reelMode: "hold" | "toggle";
  /** On top of the system setting: no shake, flashes or card animations. */
  reduceMotion: boolean;
  /** Words, panels and buttons drawn at 1x, 1.15x or 1.3x; the lake itself keeps its size. */
  textSize: TextSize;
  /** Puts the thumb strike button and the cast meter on the left of a touch screen. */
  leftHanded: boolean;
  /** Solid panels, brighter borders and full-strength text over the lake. */
  highContrast: boolean;
  /** The float's body colour; the white cap and night tip stay as they are. */
  floatColour: FloatColour;
  /** The lure tied on last, if it is still packed next visit. */
  lastLure: string | null;
};

export const SETTINGS_KEY = "stillwater.settings.v1";

export const DEFAULT_SETTINGS: Settings = {
  volume: 0.8,
  natureVolume: 1,
  muted: false,
  shake: "full",
  particles: "full",
  autoEffects: true,
  shadows: true,
  sharpness: "sharp",
  reelMode: "hold",
  reduceMotion: false,
  textSize: "normal",
  leftHanded: false,
  highContrast: false,
  floatColour: "blue",
  lastLure: null,
};

export const SHAKE_SCALE: Record<ShakeLevel, number> = { off: 0, soft: 0.45, full: 1 };

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Whatever was stored, as valid settings. Unknown or broken fields fall back to the defaults. */
export function parseSettings(raw: string | null): Settings {
  let data: Record<string, unknown> = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) data = parsed as Record<string, unknown>;
  } catch {
    data = {};
  }
  const d = DEFAULT_SETTINGS;
  const volume = typeof data.volume === "number" && Number.isFinite(data.volume) ? Math.min(1, Math.max(0, data.volume)) : d.volume;
  const natureVolume =
    typeof data.natureVolume === "number" && Number.isFinite(data.natureVolume) ? Math.min(1, Math.max(0, data.natureVolume)) : d.natureVolume;
  return {
    volume,
    natureVolume,
    muted: typeof data.muted === "boolean" ? data.muted : d.muted,
    shake: pick(data.shake, ["off", "soft", "full"], d.shake),
    particles: pick(data.particles, ["full", "lite"], d.particles),
    autoEffects: typeof data.autoEffects === "boolean" ? data.autoEffects : d.autoEffects,
    shadows: typeof data.shadows === "boolean" ? data.shadows : d.shadows,
    sharpness: pick(data.sharpness, ["sharp", "fast"], d.sharpness),
    reelMode: pick(data.reelMode, ["hold", "toggle"], d.reelMode),
    reduceMotion: typeof data.reduceMotion === "boolean" ? data.reduceMotion : d.reduceMotion,
    textSize: pick(data.textSize, ["normal", "large", "larger"], d.textSize),
    leftHanded: typeof data.leftHanded === "boolean" ? data.leftHanded : d.leftHanded,
    highContrast: typeof data.highContrast === "boolean" ? data.highContrast : d.highContrast,
    floatColour: pick(data.floatColour, FLOAT_COLOURS, d.floatColour),
    lastLure: typeof data.lastLure === "string" && data.lastLure ? data.lastLure : null,
  };
}

function load() {
  try {
    return parseSettings(localStorage.getItem(SETTINGS_KEY));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** The live settings. Replaced, never mutated, so React sees each change. */
export let settings: Settings = load();
const listeners = new Set<() => void>();

export function updateSettings(change: Partial<Settings>) {
  settings = { ...settings, ...change };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Private mode: the change holds for this visit.
  }
  listeners.forEach((listener) => listener());
}

/** Reload from storage; for tests and a storage event from another tab. */
export function reloadSettings() {
  settings = load();
  listeners.forEach((listener) => listener());
}

export function subscribeSettings(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Mirrors the text size, handedness and contrast onto <html>, where the stylesheet scales the panels, moves the thumb controls and firms up the panels. */
export function useRootSettings() {
  const { textSize, leftHanded, highContrast } = useSettings();
  useEffect(() => {
    const root = document.documentElement;
    if (textSize === "normal") delete root.dataset.textSize;
    else root.dataset.textSize = textSize;
  }, [textSize]);
  useEffect(() => {
    const root = document.documentElement;
    if (leftHanded) root.dataset.hand = "left";
    else delete root.dataset.hand;
  }, [leftHanded]);
  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) root.dataset.contrast = "high";
    else delete root.dataset.contrast;
  }, [highContrast]);
}

export function useSettings() {
  return useSyncExternalStore(subscribeSettings, () => settings, () => settings);
}
