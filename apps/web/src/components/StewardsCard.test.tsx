// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getStewards, type StewardsBoard } from "../api";
import { StewardsCard } from "./StewardsCard";

vi.mock("../api", async (importOriginal) => ({ ...(await importOriginal<typeof import("../api")>()), getStewards: vi.fn() }));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  vi.unstubAllGlobals();
});

async function show(board: StewardsBoard) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.mocked(getStewards).mockResolvedValue(board);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root!.render(<StewardsCard />));
  return container;
}

describe("StewardsCard", () => {
  it("ranks this week's stewards and says where the angler stands below the top ten", async () => {
    const page = await show({ entries: [{ rank: 1, userId: "a", displayName: "Ash", count: 7 }], you: { rank: 12, count: 1 } });
    expect([...page.querySelectorAll(".derby-entries li")].map((li) => li.textContent)).toEqual(["1. Ash · 7 let go"]);
    expect(page.textContent).toContain("You: #12, 1 let go");
  });

  it("says when no one has let a fish go yet", async () => {
    const page = await show({ entries: [], you: null });
    expect(page.textContent).toContain("No one has let a fish go yet this week.");
  });
});
