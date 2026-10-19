// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Logbook } from "@stillwater/shared";
import { YEAR_GOAL_KEY, YearGoal } from "./YearGoal";
import { movedOnSince, noteChangedOn } from "./leaveDeleted";

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

describe("round 84: the goal's button is described by the count", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
  });

  it("points Change goal at the count line", () => {
    localStorage.setItem(YEAR_GOAL_KEY, JSON.stringify({ "2026": 12 }));
    const html = renderToStaticMarkup(<YearGoal book={{ spots: [], trips: [], catches: [] } as unknown as Logbook} now={new Date(2026, 9, 18, 12)} />);
    const described = /aria-describedby="([^"]+)"[^>]*>Change goal/.exec(html)?.[1];
    expect(described).toBeTruthy();
    expect(html).toContain(`<span id="${described}">0 of 12 fish in 2026</span>`);
  });
});

describe("round 84: an Undo of a change made in place, pressed on another page, comes forward", () => {
  it("knows the angler moved on from the page the change was made on", () => {
    noteChangedOn("/");
    expect(movedOnSince("/", "/spots")).toBe(true);
    expect(movedOnSince("/", "/")).toBe(false);
  });
});
