// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fx } from "./fx";
import { mergeLevelUp } from "./levelUp";
import { LEVEL_TOAST_MS, useLevelToast } from "./useLevelToast";

vi.mock("./fx", () => ({ fx: { land: vi.fn() } }));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function Harness({ level, clear }: { level: number; clear: boolean }) {
  const toast = useLevelToast(level, clear);
  return <p>{toast ? `${toast.level}|${toast.opened ?? ""}` : ""}</p>;
}

function show(level: number, clear: boolean) {
  act(() => root!.render(<Harness level={level} clear={clear} />));
  return container!.textContent;
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.mocked(fx.land).mockClear();
});

describe("useLevelToast", () => {
  it("gives a newer level-up its own four seconds", () => {
    show(2, true);
    expect(show(3, true)).toMatch(/^3\|/);
    act(() => vi.advanceTimersByTime(2500));
    expect(show(4, true)).toMatch(/^4\|/);
    act(() => vi.advanceTimersByTime(LEVEL_TOAST_MS - 100));
    expect(container!.textContent).toMatch(/^4\|/);
    act(() => vi.advanceTimersByTime(200));
    expect(container!.textContent).toBe("");
    expect(fx.land).toHaveBeenCalledTimes(2);
  });

  it("keeps the drop-off news when a second level-up arrives while the bank is busy", () => {
    show(2, false);
    show(3, false);
    show(4, false);
    expect(show(4, true)).toBe("4|The drop-off is open — walk east along the shore.");
    expect(fx.land).toHaveBeenCalledTimes(1);
  });

  it("merges a rise into a pending toast without losing its unlock", () => {
    expect(mergeLevelUp({ level: 3, opened: "open" }, { level: 4, opened: null })).toEqual({ level: 4, opened: "open" });
    expect(mergeLevelUp(null, { level: 3, opened: "x" })).toEqual({ level: 3, opened: "x" });
  });
});
