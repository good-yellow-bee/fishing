// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reloadSettings, settings } from "../game/settings";
import { SettingsPanel } from "./SettingsPanel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Newer Node ships its own empty `localStorage` global, so borrow a real one.
const browser = new JSDOM("", { url: "http://localhost" });
afterAll(() => browser.window.close());

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  vi.stubGlobal("localStorage", browser.window.localStorage);
  reloadSettings();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<SettingsPanel onClose={() => {}} />));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  localStorage.clear();
  reloadSettings();
  vi.unstubAllGlobals();
});

function pick(text: string) {
  const label = [...host.querySelectorAll("label")].find((l) => l.textContent === text);
  act(() => label!.querySelector("input")!.click());
}

describe("settings panel", () => {
  it.each(["Lite", "Fast", "Shadows"])("picking %s by hand stops the slow-machine step-down", (text) => {
    expect(settings.autoEffects).toBe(true);
    pick(text);
    expect(settings.autoEffects).toBe(false);
  });

  it("offers the first-cast tips again only where the lake can show them", () => {
    expect(host.querySelector("[data-tips-again]")).toBeNull();
    const onTips = vi.fn();
    act(() => root.render(<SettingsPanel onClose={() => {}} onTips={onTips} />));
    const again = host.querySelector<HTMLButtonElement>("[data-tips-again]")!;
    expect(again.textContent).toBe("Show the first-cast tips again");
    act(() => again.click());
    expect(onTips).toHaveBeenCalledTimes(1);
  });

  it("other choices leave the step-down on", () => {
    pick("Soft");
    expect(settings.shake).toBe("soft");
    expect(settings.autoEffects).toBe(true);
  });
});
