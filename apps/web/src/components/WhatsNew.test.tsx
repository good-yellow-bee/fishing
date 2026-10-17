// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NEWS_ID, NEWS_ITEMS, NEWS_KEY, newsDue } from "../game/whatsNew";
import { WhatsNew } from "./WhatsNew";

// Newer Node ships its own empty `localStorage` global, so borrow a real one.
const browser = new JSDOM("", { url: "http://localhost" });
afterAll(() => browser.window.close());
beforeEach(() => {
  vi.stubGlobal("localStorage", browser.window.localStorage);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("WhatsNew", () => {
  it("is due for a returning angler who has not dismissed this batch, never for a new one", () => {
    expect(newsDue(0, null)).toBe(false);
    expect(newsDue(4, null)).toBe(true);
    expect(newsDue(4, "2020-01-01")).toBe(true);
    expect(newsDue(4, NEWS_ID)).toBe(false);
  });

  it("lists the news once, stays out of the way mid-cast, and remembers the dismissal", () => {
    const host = document.createElement("div");
    const root = createRoot(host);
    act(() => root.render(<WhatsNew caughtTotal={3} hidden={false} />));
    expect(host.querySelectorAll("li")).toHaveLength(Math.min(NEWS_ITEMS.length, 4));
    act(() => root.render(<WhatsNew caughtTotal={3} hidden />));
    expect(host.querySelector(".whats-new")).toBeNull();
    act(() => root.render(<WhatsNew caughtTotal={3} hidden={false} />));
    act(() => host.querySelector("button")!.click());
    expect(host.querySelector(".whats-new")).toBeNull();
    expect(localStorage.getItem(NEWS_KEY)).toBe(NEWS_ID);
    act(() => root.unmount());
  });
});
