// @vitest-environment jsdom
import { JSDOM } from "jsdom";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, parseSettings, reloadSettings, settings, SETTINGS_KEY, updateSettings } from "./settings";

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
      JSON.stringify({ volume: 4, muted: "yes", shake: "soft", particles: "none", shadows: false, reelMode: "toggle", lastLure: "" }),
    );
    expect(parsed).toEqual({ ...DEFAULT_SETTINGS, volume: 1, shake: "soft", shadows: false, reelMode: "toggle" });
  });

  it("remembers a change for the next visit", () => {
    updateSettings({ reelMode: "toggle", lastLure: "Mepps spinner" });
    expect(settings.reelMode).toBe("toggle");
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!)).toMatchObject({ reelMode: "toggle", lastLure: "Mepps spinner" });
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, shake: "off" }));
    reloadSettings();
    expect(settings).toMatchObject({ reelMode: "toggle", shake: "off", lastLure: "Mepps spinner" });
  });
});
