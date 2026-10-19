// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BoardPeriod } from "@stillwater/shared";
import { getBoard, getSpeciesRecords } from "../api";
import { BoardPage } from "./Board";

vi.mock("../api", () => ({ getBoard: vi.fn(), getSpeciesRecords: vi.fn(), errorText: (message: string) => message }));

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  vi.mocked(getBoard).mockImplementation(async (period: BoardPeriod = "all") => ({ period, entries: [], you: null }));
  vi.mocked(getSpeciesRecords).mockResolvedValue([]);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

const tabs = () => [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')];

async function press(key: string) {
  await act(async () => {
    document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
}

describe("the lodge board's period tabs", () => {
  it("are one Tab stop, and the arrow keys, Home and End move between them and pick", async () => {
    await act(async () => {
      root.render(<MemoryRouter><BoardPage /></MemoryRouter>);
    });
    const [all, week] = tabs();
    expect(all!.tabIndex).toBe(0);
    expect(week!.tabIndex).toBe(-1);
    all!.focus();

    await press("ArrowRight");
    expect(document.activeElement).toBe(tabs()[1]);
    expect(tabs()[1]!.getAttribute("aria-selected")).toBe("true");
    expect(tabs()[1]!.tabIndex).toBe(0);
    expect(tabs()[0]!.tabIndex).toBe(-1);
    expect(getBoard).toHaveBeenLastCalledWith("week");

    await press("ArrowRight");
    expect(document.activeElement).toBe(tabs()[0]);
    expect(getBoard).toHaveBeenLastCalledWith("all");

    await press("End");
    expect(document.activeElement).toBe(tabs()[1]);
    await press("Home");
    expect(document.activeElement).toBe(tabs()[0]);
    await press("ArrowLeft");
    expect(document.activeElement).toBe(tabs()[1]);
  });

  it("name the board as their panel", async () => {
    await act(async () => {
      root.render(<MemoryRouter><BoardPage /></MemoryRouter>);
    });
    const panel = container.querySelector('[role="tabpanel"]')!;
    for (const tab of tabs()) expect(tab.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("aria-labelledby")).toBe(tabs()[0]!.id);
    expect(panel.querySelector("table")).not.toBeNull();
  });
});
