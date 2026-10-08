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

function mount(value: string, onChange: (value: string) => void) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root!.render(<LureChoice choices={["Spinnerbait", "Popper", "#5 Mepps"]} value={value} locked={false} onChange={onChange} />));
  return container.querySelector("select")!;
}

describe("LureChoice", () => {
  it("lists small lures first and says what the tied lure draws", () => {
    const select = mount("Spinnerbait", () => undefined);
    expect([...select.options].map((option) => option.value)).toEqual(["Popper", "Spinnerbait", "#5 Mepps"]);
    expect(container!.querySelector("small")?.textContent).toBe("Big lure — heavier fish (Strength 3+ to land most)");
  });

  it("lets go of focus after a pick so Space casts instead of reopening the list", () => {
    const onChange = vi.fn();
    const select = mount("Spinnerbait", onChange);
    select.focus();
    expect(document.activeElement).toBe(select);
    select.value = "Popper";
    act(() => select.dispatchEvent(new Event("change", { bubbles: true })));
    expect(onChange).toHaveBeenCalledWith("Popper");
    expect(document.activeElement).not.toBe(select);
  });
});
