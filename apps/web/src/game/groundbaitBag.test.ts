import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bagKey, LEGACY_BAG_KEY, LEGACY_SHINER_KEY, loadBag, loadShiner, saveBag, saveShiner, shinerKey } from "./groundbaitBag";

const dom = new JSDOM("", { url: "http://localhost/" });

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", { value: dom.window.localStorage, configurable: true });
});
afterEach(() => dom.window.localStorage.clear());

describe("the groundbait bag", () => {
  it("keeps what it holds across a reload, within what it carries, for each angler", () => {
    expect(loadBag("ash")).toBe(0);
    saveBag("ash", 2);
    expect(loadBag("ash")).toBe(2);
    expect(loadBag("mara")).toBe(0);
    dom.window.localStorage.setItem(bagKey("ash"), "9");
    expect(loadBag("ash")).toBe(3);
    dom.window.localStorage.setItem(bagKey("ash"), "junk");
    expect(loadBag("ash")).toBe(0);
  });

  it("hands a bag kept before anglers had their own to the first angler who loads", () => {
    dom.window.localStorage.setItem(LEGACY_BAG_KEY, "2");
    expect(loadBag("ash")).toBe(2);
    expect(dom.window.localStorage.getItem(LEGACY_BAG_KEY)).toBeNull();
    expect(loadBag("mara")).toBe(0);
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
