import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BAG_KEY, loadBag, saveBag } from "./groundbaitBag";

const dom = new JSDOM("", { url: "http://localhost/" });

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", { value: dom.window.localStorage, configurable: true });
});
afterEach(() => dom.window.localStorage.clear());

describe("the groundbait bag", () => {
  it("keeps what it holds across a reload, within what it carries", () => {
    expect(loadBag()).toBe(0);
    saveBag(2);
    expect(loadBag()).toBe(2);
    dom.window.localStorage.setItem(BAG_KEY, "9");
    expect(loadBag()).toBe(3);
    dom.window.localStorage.setItem(BAG_KEY, "junk");
    expect(loadBag()).toBe(0);
  });
});
