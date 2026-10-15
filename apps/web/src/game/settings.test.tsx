// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, parseSettings, reloadSettings, settings, SETTINGS_KEY, updateSettings, useRootSettings } from "./settings";

// Newer Node ships its own empty `localStorage` global, so borrow a real one.
const browser = new JSDOM("", { url: "http://localhost" });
afterAll(() => browser.window.close());

beforeEach(() => {
  vi.stubGlobal("localStorage", browser.window.localStorage);
});

afterEach(() => {
  localStorage.clear();
  reloadSettings();
  vi.unstubAllGlobals();
});

describe("settings", () => {
  it("falls back to the defaults for nothing stored, broken JSON, or the wrong shape", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("{not json")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("[1,2]")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('"loud"')).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps good fields and replaces bad ones one by one", () => {
    const parsed = parseSettings(
      JSON.stringify({ volume: 4, muted: "yes", shake: "soft", particles: "none", shadows: false, reelMode: "toggle", textSize: "huge", lastLure: "" }),
    );
    expect(parsed).toEqual({ ...DEFAULT_SETTINGS, volume: 1, shake: "soft", shadows: false, reelMode: "toggle" });
  });

  it("keeps the nature volume inside 0..1", () => {
    expect(parseSettings(JSON.stringify({ natureVolume: 0.3 })).natureVolume).toBe(0.3);
    expect(parseSettings(JSON.stringify({ natureVolume: 7 })).natureVolume).toBe(1);
    expect(parseSettings(JSON.stringify({ natureVolume: "loud" })).natureVolume).toBe(DEFAULT_SETTINGS.natureVolume);
  });

  it("keeps a known float colour and drops an unknown one", () => {
    expect(parseSettings(JSON.stringify({ floatColour: "yellow" })).floatColour).toBe("yellow");
    expect(parseSettings(JSON.stringify({ floatColour: "plaid" })).floatColour).toBe(DEFAULT_SETTINGS.floatColour);
  });

  it("keeps vibration on unless it was switched off", () => {
    expect(parseSettings(null).vibration).toBe(true);
    expect(parseSettings(JSON.stringify({ vibration: false })).vibration).toBe(false);
    expect(parseSettings(JSON.stringify({ vibration: "no" })).vibration).toBe(true);
  });

  it("remembers a change for the next visit", () => {
    updateSettings({ reelMode: "toggle", lastLure: "Mepps spinner" });
    expect(settings.reelMode).toBe("toggle");
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!)).toMatchObject({ reelMode: "toggle", lastLure: "Mepps spinner" });
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, shake: "off" }));
    reloadSettings();
    expect(settings).toMatchObject({ reelMode: "toggle", shake: "off", lastLure: "Mepps spinner" });
  });

  it("keeps a larger text size and the left hand, and marks the page with them", () => {
    expect(parseSettings(JSON.stringify({ textSize: "larger" })).textSize).toBe("larger");
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    function Page() {
      useRootSettings();
      return null;
    }
    const root = createRoot(document.createElement("div"));
    act(() => root.render(<Page />));
    expect(document.documentElement.dataset.textSize).toBeUndefined();
    act(() => updateSettings({ textSize: "large" }));
    expect(document.documentElement.dataset.textSize).toBe("large");
    act(() => updateSettings({ textSize: "normal" }));
    expect(document.documentElement.dataset.textSize).toBeUndefined();
    act(() => updateSettings({ leftHanded: true }));
    expect(document.documentElement.dataset.hand).toBe("left");
    act(() => updateSettings({ leftHanded: false }));
    expect(document.documentElement.dataset.hand).toBeUndefined();
    act(() => updateSettings({ highContrast: true }));
    expect(document.documentElement.dataset.contrast).toBe("high");
    act(() => updateSettings({ highContrast: false }));
    expect(document.documentElement.dataset.contrast).toBeUndefined();
    act(() => root.unmount());
  });
});
