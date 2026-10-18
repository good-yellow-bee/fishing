// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LureConditions } from "../game/lureChoice";
import { LureChoice } from "./LureChoice";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.unstubAllGlobals();
});

function mount(value: string, onChange: (value: string) => void, spot: "dock" | "reeds" = "dock", now?: LureConditions) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root!.render(<LureChoice choices={["Spinnerbait", "Popper", "#5 Mepps"]} value={value} spot={spot} now={now} locked={false} onChange={onChange} />));
  return container.querySelector("select")!;
}

describe("LureChoice", () => {
  it("lists small lures first and says what the tied lure draws", () => {
    const select = mount("Spinnerbait", () => undefined);
    expect([...select.options].map((option) => option.value)).toEqual(["Popper", "Spinnerbait", "#5 Mepps"]);
    expect(container!.querySelector("small")?.textContent).toBe("Big lure — heavier fish (Strength 3+ to land most)");
  });

  it("marks the lures this bank suits, and says so under a tied one", () => {
    const select = mount("#5 Mepps", () => undefined, "reeds");
    expect([...select.options].map((option) => option.textContent)).toEqual(["Popper", "Spinnerbait · good here", "#5 Mepps · good here"]);
    expect(container!.querySelector(".lure-here")?.textContent).toBe("This bank suits it: the bites come sooner.");
  });

  it("marks the lures the lake favors right now, and says so under a tied one", () => {
    const night: LureConditions = { sky: "partly-cloudy", hour: "night", season: "spring", wind: "light-north", moon: 0.5, rising: false };
    const select = mount("Popper", () => undefined, "reeds", night);
    expect([...select.options].map((option) => option.textContent)).toEqual(["Popper · good now", "Spinnerbait · good here", "#5 Mepps · good here"]);
    expect([...container!.querySelectorAll(".lure-here")].map((note) => note.textContent)).toEqual(["The season, hour and weather suit it: the bites come sooner."]);
    act(() => root!.render(<LureChoice choices={["#5 Mepps"]} value="#5 Mepps" spot="reeds" now={{ ...night, hour: "day", sky: "clear" }} locked={false} onChange={() => undefined} />));
    expect(container!.querySelector("option")?.textContent).toBe("#5 Mepps · good here and now");
    expect(container!.querySelectorAll(".lure-here")).toHaveLength(2);
  });

  it("marks nothing where no packed lure gets a bank bonus", () => {
    const select = mount("Popper", () => undefined);
    expect([...select.options].map((option) => option.textContent)).toEqual(["Popper", "Spinnerbait", "#5 Mepps"]);
    expect(container!.querySelector(".lure-here")).toBeNull();
  });

  it("lets go of focus after a pointer pick so Space casts instead of reopening the list", () => {
    const onChange = vi.fn();
    const select = mount("Spinnerbait", onChange);
    select.focus();
    expect(document.activeElement).toBe(select);
    act(() => select.dispatchEvent(new Event("pointerdown", { bubbles: true })));
    select.value = "Popper";
    act(() => select.dispatchEvent(new Event("change", { bubbles: true })));
    expect(onChange).toHaveBeenCalledWith("Popper");
    expect(document.activeElement).not.toBe(select);
  });

  it("keeps focus while the keyboard steps through lures", () => {
    const onChange = vi.fn();
    const select = mount("Spinnerbait", onChange);
    // A click earlier, then arrow keys: the keys win.
    act(() => select.dispatchEvent(new Event("pointerdown", { bubbles: true })));
    select.focus();
    act(() => select.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })));
    select.value = "#5 Mepps";
    act(() => select.dispatchEvent(new Event("change", { bubbles: true })));
    expect(onChange).toHaveBeenCalledWith("#5 Mepps");
    expect(document.activeElement).toBe(select);
  });
});
