// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getLodgeLost } from "../api";
import { LostCard } from "./LostCard";

vi.mock("../api", async (importOriginal) => ({ ...(await importOriginal<typeof import("../api")>()), getLodgeLost: vi.fn() }));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  vi.unstubAllGlobals();
});

async function open() {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root!.render(<LostCard />));
  return container;
}

describe("LostCard", () => {
  it("lists other anglers' lost trophies by bank, with who lost each", async () => {
    vi.mocked(getLodgeLost).mockResolvedValue({ lost: [{ id: "l1", speciesId: "pike", weight: 14.5, spot: "reeds", at: "2026-10-19T10:00:00.000Z", by: "Mara" }], mineFound: [] });
    const card = await open();
    expect([...card.querySelectorAll("li")].map((li) => li.textContent)).toEqual(["Reeds: a 14.5 lb northern pike, lost by Mara"]);
  });

  it("says so when none are about", async () => {
    vi.mocked(getLodgeLost).mockResolvedValue({ lost: [], mineFound: [] });
    const card = await open();
    expect(card.textContent).toContain("None about just now.");
  });
});
