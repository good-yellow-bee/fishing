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
});
