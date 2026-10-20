import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bagKey, DAILY_HANDFULS, LEGACY_BAG_KEY, LEGACY_SHINER_KEY, loadBag, loadShiner, saveBag, saveShiner, shinerKey } from "./groundbaitBag";

const dom = new JSDOM("", { url: "http://localhost/" });

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", { value: dom.window.localStorage, configurable: true });
});
afterEach(() => dom.window.localStorage.clear());

describe("the groundbait bag", () => {
  const day = (date: number) => new Date(2026, 9, date, 12);

  it("finds the free handful once a day, keeps what it holds through a day's reloads, within what it carries, for each angler", () => {
    expect(loadBag("ash", day(20))).toBe(DAILY_HANDFULS);
    saveBag("ash", 0, day(20));
    // Spent today, a reload doesn't bring it back.
    expect(loadBag("ash", day(20))).toBe(0);
    // A new day brings the free handful again.
    expect(loadBag("ash", day(21))).toBe(DAILY_HANDFULS);
    saveBag("ash", 3, day(21));
    expect(loadBag("ash", day(22))).toBe(3);
    expect(loadBag("mara", day(20))).toBe(DAILY_HANDFULS);
    dom.window.localStorage.setItem(bagKey("ash"), JSON.stringify({ handfuls: 9, day: "2026-10-22" }));
    expect(loadBag("ash", day(22))).toBe(3);
  });

  it("reads a bag kept before the free handful came once a day, and one from before anglers had their own", () => {
    dom.window.localStorage.setItem("stillwater.groundbait.ash.v1", "2");
    expect(loadBag("ash", day(20))).toBe(2);
    expect(dom.window.localStorage.getItem("stillwater.groundbait.ash.v1")).toBeNull();
    dom.window.localStorage.setItem(LEGACY_BAG_KEY, "3");
    expect(loadBag("kit", day(20))).toBe(3);
    expect(dom.window.localStorage.getItem(LEGACY_BAG_KEY)).toBeNull();
  });
});

describe("the shiner on the hook", () => {
  it("stays on across a reload until it goes out on a cast, for each angler", () => {
    expect(loadShiner("ash")).toBeNull();
    saveShiner("ash", "live");
    expect(loadShiner("ash")).toBe("live");
    expect(loadShiner("mara")).toBeNull();
    saveShiner("ash", "lively");
    expect(loadShiner("ash")).toBe("lively");
    saveShiner("ash", null);
    expect(loadShiner("ash")).toBeNull();
    dom.window.localStorage.setItem(shinerKey("ash"), "junk");
    expect(loadShiner("ash")).toBeNull();
  });

  it("hands a shiner kept before anglers had their own to the first angler who loads", () => {
    dom.window.localStorage.setItem(LEGACY_SHINER_KEY, "lively");
    expect(loadShiner("ash")).toBe("lively");
    expect(loadShiner("mara")).toBeNull();
  });
});
