import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(`${import.meta.dirname}/index.css`, "utf8");
const SIDEWAYS = "@media (pointer: coarse) and (max-height: 500px) {";

describe("a phone held sideways", () => {
  it("skips the narrow-screen layout, so a 740-800 px wide phone does not get both", () => {
    const narrow = /^@media ([^{]*) \{\n  \.hud \{/m.exec(css)?.[1];
    expect(narrow).toBe("(max-width: 800px) and (min-height: 501px), (max-width: 800px) and (pointer: fine), (max-width: 800px) and (pointer: none)");
  });

  it("stops the shore signs above the power meter and starts a second column when they run long", () => {
    const sideways = css.slice(css.indexOf(SIDEWAYS));
    const block = /\n  \.walk-signs \{([^}]*)\}/.exec(sideways)?.[1];
    expect(block).toContain("grid-auto-flow: column;");
    expect(block).toContain("max-height: calc((100dvh - var(--hud-bottom, 52px)) / var(--text-zoom, 1) - 72px);");
  });

  it("lets a phone's bottom row of shore signs scroll sideways when the last banks would run past the edge", () => {
    const narrow = css.slice(css.indexOf("/* One thumb row along the bottom"));
    const block = /\.walk-signs \{([^}]*)\}/.exec(narrow)?.[1];
    expect(block).toContain("overflow-x: auto;");
  });
});
