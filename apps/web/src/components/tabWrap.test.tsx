// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { act, useRef } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { useTabWrap } from "./tabWrap";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;

beforeAll(() => {
  // jsdom lays nothing out: count every element as shown.
  HTMLElement.prototype.getClientRects = () => [{}] as unknown as DOMRectList;
});

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  host = null;
});

let root: ReturnType<typeof createRoot> | null = null;

function Panel() {
  const panel = useRef<HTMLElement>(null);
  useTabWrap(panel);
  return (
    <section ref={panel} role="dialog" aria-modal="true">
      <button type="button">First</button>
      <label>
        <input type="radio" name="size" /> Small
      </label>
      <label>
        <input type="radio" name="size" defaultChecked /> Large
      </label>
      <button type="button">Last</button>
    </section>
  );
}

function render() {
  host = document.createElement("div");
  document.body.append(host);
  const outside = document.createElement("button");
  outside.textContent = "Behind";
  document.body.prepend(outside);
  root = createRoot(host);
  act(() => root!.render(<Panel />));
  return { outside, button: (name: string) => [...host!.querySelectorAll("button")].find((b) => b.textContent === name)! };
}

function tab(shift = false) {
  const event = new KeyboardEvent("keydown", { key: "Tab", shiftKey: shift, bubbles: true, cancelable: true });
  (document.activeElement ?? document.body).dispatchEvent(event);
  return event.defaultPrevented;
}

describe("useTabWrap", () => {
  it("wraps Tab from the last control to the first and Shift+Tab back", () => {
    const { button } = render();
    button("Last").focus();
    expect(tab()).toBe(true);
    expect(document.activeElement).toBe(button("First"));
    expect(tab(true)).toBe(true);
    expect(document.activeElement).toBe(button("Last"));
  });

  it("lets Tab move on normally inside the panel", () => {
    const { button } = render();
    button("First").focus();
    expect(tab()).toBe(false);
  });

  it("brings focus that slipped outside back in", () => {
    const { outside, button } = render();
    outside.focus();
    expect(tab()).toBe(true);
    expect(document.activeElement).toBe(button("First"));
    outside.remove();
  });

  it("stops once on a radio group, at its checked radio", () => {
    const { button } = render();
    const checked = host!.querySelectorAll("input")[1];
    checked.focus();
    expect(tab(true)).toBe(false);
    button("First").focus();
    expect(tab(true)).toBe(true);
    expect(document.activeElement).toBe(button("Last"));
  });
});

describe("the lake's panels with a pinned foot", () => {
  const css = readFileSync(`${import.meta.dirname}/../index.css`, "utf8");
  it.each(["settings-panel", "shop-overlay"])("scroll a control tabbed to clear of the foot in .%s (WCAG 2.4.11)", (name) => {
    expect(new RegExp(`\\n\\.${name} \\{([^}]*)\\}`).exec(css)?.[1]).toContain("scroll-padding-bottom: 76px;");
  });

  it.each(["components/SettingsPanel.tsx", "components/KeysCard.tsx", "components/TripRecap.tsx", "pages/Dock.tsx"])("%s keeps Tab inside its panel", (path) => {
    expect(readFileSync(`${import.meta.dirname}/../${path}`, "utf8")).toMatch(/useTabWrap\((panel|shopPanel)\);/);
  });
});
