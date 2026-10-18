import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(`${import.meta.dirname}/index.css`, "utf8");
const sideways = css.slice(css.indexOf("@media (pointer: coarse) and (max-height: 500px) {"));

describe("the catch card on a phone held sideways", () => {
  it("stops under the header and scrolls, so the fish's name never runs off the top", () => {
    const block = /\n  \.landed-card \{([^}]*)\}/.exec(sideways)?.[1];
    expect(block).toContain("max-height: calc(100% - var(--hud-bottom, 52px) - 14px);");
    expect(block).toContain("overflow-y: auto;");
  });

  it("keeps Release and Keep fishing pinned at its foot while the rest scrolls", () => {
    const block = /\n  \.landed-card \.catch-actions \{([^}]*)\}/.exec(sideways)?.[1];
    expect(block).toContain("position: sticky;");
  });
});
