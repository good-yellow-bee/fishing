// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getGiants, type GiantStatus } from "../api";
import { GiantsCard } from "./GiantsCard";

vi.mock("../api", async (importOriginal) => ({ ...(await importOriginal<typeof import("../api")>()), getGiants: vi.fn() }));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  vi.unstubAllGlobals();
});

describe("GiantsCard", () => {
  it("names each bank's giant and who landed it, or that it is still out there", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const giants: GiantStatus[] = [
      { spot: "dock", name: "Old Moss", speciesId: "carp", weight: 17.5, landedBy: null, landedAt: null },
      { spot: "reeds", name: "Iron Jaw", speciesId: "pike", weight: 19, landedBy: "Mara", landedAt: "2026-10-20T10:00:00Z" },
    ];
    vi.mocked(getGiants).mockResolvedValue(giants);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root!.render(<GiantsCard />));
    expect([...container.querySelectorAll("li")].map((li) => li.textContent)).toEqual([
      "Dock: Old Moss, a 17.5 lb common carp · still out there",
      "Reeds: Iron Jaw, a 19 lb northern pike · landed by Mara",
    ]);
  });
});
