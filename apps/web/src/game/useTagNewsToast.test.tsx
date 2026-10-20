// @vitest-environment jsdom
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TagReturn } from "@stillwater/shared";
import { TAG_NEWS_KEY, TAG_NEWS_TOAST_MS, useTagNewsToast } from "./useTagNewsToast";

vi.mock("./fx", () => ({ fx: { land: vi.fn() } }));

const browser = new JSDOM("", { url: "http://localhost" });
let root: Root | null = null;
let container: HTMLDivElement | null = null;

const back = (catchId: string): TagReturn => ({ catchId, speciesId: "carp", weight: 6.2, was: 6, by: "Mara", at: "2026-10-19T10:00:00.000Z" });

function Harness({ returns, clear }: { returns: TagReturn[]; clear: boolean }) {
  const toast = useTagNewsToast(returns, clear);
  return <p>{toast?.catchId ?? ""}</p>;
}

function show(returns: TagReturn[], clear: boolean) {
  act(() => root!.render(<Harness returns={returns} clear={clear} />));
  return container!.textContent;
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("localStorage", browser.window.localStorage);
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  localStorage.clear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useTagNewsToast", () => {
  it("waits for a clear bank, shows each return once, one at a time, and remembers it was told", () => {
    const returns = [back("a"), back("b")];
    expect(show(returns, false)).toBe("");
    expect(show(returns, true)).toBe("a");
    act(() => vi.advanceTimersByTime(TAG_NEWS_TOAST_MS));
    expect(show(returns, true)).toBe("b");
    act(() => vi.advanceTimersByTime(TAG_NEWS_TOAST_MS));
    expect(show(returns, true)).toBe("");
    expect(JSON.parse(localStorage.getItem(TAG_NEWS_KEY)!)).toEqual(["b", "a"]);
  });

  it("steps aside while the bank is busy and comes back for its full time", () => {
    const returns = [back("a")];
    expect(show(returns, true)).toBe("a");
    act(() => vi.advanceTimersByTime(TAG_NEWS_TOAST_MS - 100));
    expect(show(returns, false)).toBe("");
    act(() => vi.advanceTimersByTime(TAG_NEWS_TOAST_MS));
    expect(show(returns, true)).toBe("a");
    expect(localStorage.getItem(TAG_NEWS_KEY)).toBeNull();
    act(() => vi.advanceTimersByTime(TAG_NEWS_TOAST_MS));
    expect(show(returns, true)).toBe("");
  });

  it("tells each return once a visit even when the browser can't store it", () => {
    vi.spyOn(browser.window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("full");
    });
    const returns = [back("a"), back("b")];
    expect(show(returns, true)).toBe("a");
    act(() => vi.advanceTimersByTime(TAG_NEWS_TOAST_MS));
    expect(show(returns, true)).toBe("b");
    act(() => vi.advanceTimersByTime(TAG_NEWS_TOAST_MS));
    expect(show(returns, true)).toBe("");
    vi.restoreAllMocks();
  });
});

describe("news of a lost trophy someone landed", () => {
  it("is told once per angler, reading what they were told when they sign in", async () => {
    const { useNewsToast, lostNewsKey, TAG_NEWS_TOAST_MS } = await import("./useTagNewsToast");
    const kept = new Map<string, string>([[lostNewsKey("ash"), JSON.stringify(["l1"])]]);
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.useFakeTimers();
    const items = [{ id: "l1", by: "Mara" }, { id: "l2", by: "Kit" }];
    const seen: { shown: { id: string; by: string } | null } = { shown: null };
    function Probe({ user }: { user: string }) {
      seen.shown = useNewsToast(items, true, (one) => one.id, lostNewsKey(user));
      return null;
    }
    const root = createRoot(document.createElement("div"));
    act(() => root.render(<Probe user="" />));
    act(() => root.render(<Probe user="ash" />));
    expect(seen.shown?.id).toBe("l2");
    act(() => vi.advanceTimersByTime(TAG_NEWS_TOAST_MS));
    expect(JSON.parse(kept.get(lostNewsKey("ash"))!)).toContain("l2");
    act(() => root.unmount());
    vi.useRealTimers();
  });
});
