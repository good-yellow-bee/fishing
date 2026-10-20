// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getDerby, type DerbyBoard } from "../api";
import { DerbyCard } from "./DerbyCard";

vi.mock("../api", async (importOriginal) => ({ ...(await importOriginal<typeof import("../api")>()), getDerby: vi.fn() }));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  vi.unstubAllGlobals();
});

async function show(board: DerbyBoard) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.mocked(getDerby).mockResolvedValue(board);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root!.render(<DerbyCard />));
  return container;
}

describe("DerbyCard", () => {
  it("shows the running derby's fish, its heaviest and last weekend's champion", async () => {
    const page = await show({
      derby: { from: "2026-10-24T00:00:00.000Z", to: "2026-10-26T00:00:00.000Z", fishId: "pike" },
      running: true,
      entries: [{ rank: 1, userId: "a", displayName: "Ash", weight: 9.5 }],
      you: { rank: 12, weight: 3 },
      lastChampion: { fishId: "perch", displayName: "Mara", weight: 1.1 },
    });
    expect(page.querySelector("#derby-title")?.textContent).toBe("Weekend derby: the heaviest northern pike");
    expect([...page.querySelectorAll(".derby-entries li")].map((li) => li.textContent)).toEqual(["1. Ash · 9.5 lb"]);
    expect(page.textContent).toContain("You: #12, 3 lb");
    expect(page.querySelector(".derby-champion")?.textContent).toBe("Last weekend's champion: Mara, with a 1.1 lb yellow perch");
  });

  it("names the next derby on a weekday", async () => {
    const page = await show({ derby: { from: "2026-10-31T00:00:00.000Z", to: "2026-11-02T00:00:00.000Z", fishId: "walleye" }, running: false, entries: [], you: null, lastChampion: null });
    expect(page.querySelector("#derby-title")?.textContent).toBe("Next weekend derby: the heaviest walleye");
    expect(page.querySelector(".derby-entries")).toBeNull();
  });
});
