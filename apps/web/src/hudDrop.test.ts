import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
describe("the panels under the header on a wide screen", () => {
  it("drop by however far the header wraps past its one-row foot", () => {
    const css = readFileSync(`${import.meta.dirname}/index.css`, "utf8");
    expect(/\n\.dock-page \{[^}]*--hud-drop: max\(0px, var\(--hud-bottom, 94px\) - 94px\);/.exec(css)).not.toBeNull();
    for (const [selector, top] of [[".stance-chip", 102], [".lure-choice", 154], [".walk-signs", 146], [".walkthrough", 102], [".whats-new", 102], [".camera-help", 102]] as const) {
      const rule = new RegExp(`\\n\\${selector} \\{([^}]*)\\}`).exec(css)?.[1];
      expect(rule, selector).toContain(`top: calc(${top}px + var(--hud-drop, 0px));`);
    }
  });
});
