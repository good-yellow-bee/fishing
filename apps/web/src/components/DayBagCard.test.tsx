// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getDayBag, type DayBagBoard } from "../api";
import { DayBagCard } from "./DayBagCard";

vi.mock("../api", async (importOriginal) => ({ ...(await importOriginal<typeof import("../api")>()), getDayBag: vi.fn() }));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  vi.unstubAllGlobals();
});

async function show(board: DayBagBoard) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.mocked(getDayBag).mockResolvedValue(board);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root!.render(<DayBagCard />));
  return container;
}

describe("DayBagCard", () => {
  it("ranks today's bags and says where the angler stands below the top ten", async () => {
    const page = await show({ day: "2026-10-20T00:00:00.000Z", entries: [{ rank: 1, userId: "a", displayName: "Ash", total: 7.5, count: 5 }], you: { rank: 12, total: 2, count: 3 } });
    expect(page.querySelector("#bag-title")?.textContent).toBe("Day's bag: your 5 heaviest fish today");
    expect([...page.querySelectorAll(".derby-entries li")].map((li) => li.textContent)).toEqual(["1. Ash · 7.5 lb in 5 fish"]);
    expect(page.textContent).toContain("You: #12, 2 lb");
  });

  it("says when no one has landed a fish yet", async () => {
    const page = await show({ day: "2026-10-20T00:00:00.000Z", entries: [], you: null });
    expect(page.textContent).toContain("No one has landed a fish yet today.");
  });
});
