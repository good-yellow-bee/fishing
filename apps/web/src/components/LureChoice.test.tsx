// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
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

function mount(value: string, onChange: (value: string) => void, spot: "dock" | "reeds" = "dock") {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root!.render(<LureChoice choices={["Spinnerbait", "Popper", "#5 Mepps"]} value={value} spot={spot} locked={false} onChange={onChange} />));
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
