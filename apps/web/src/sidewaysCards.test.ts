import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(`${import.meta.dirname}/index.css`, "utf8");
const sideways = css.slice(css.indexOf("@media (max-height: 500px) {"));

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

describe("the first-cast coach on a phone held sideways", () => {
  it("keeps the stance chip on one line short of the coach, and drops the step chips with larger text", () => {
    expect(sideways).toMatch(/\.scene-wrap\[data-walkthrough="1"\] \.stance-chip \{[^}]*max-width: calc\(\(33vw - 16px\) \/ var\(--text-zoom, 1\)\);[^}]*text-overflow: ellipsis;/);
    expect(sideways).toMatch(/html\[data-text-size\] \.walkthrough ol \{\n    display: none;/);
  });
});

describe("the walking stick on a phone held sideways", () => {
  it("keeps its size with larger text, and the hint starts beside it at any text size", () => {
    expect(sideways).toMatch(/html\[data-text-size\] \.scene-wrap > \.walk-stick \{\n    zoom: 1;/);
    expect(sideways).toMatch(/\n  \.hint \{[^}]*left: calc\(114px \/ var\(--text-zoom, 1\)\);/);
    expect(sideways).toMatch(/html\[data-hand="left"\] \.hint \{\n    right: calc\(114px \/ var\(--text-zoom, 1\)\);/);
  });
});

describe("the catch card's pinned buttons", () => {
  it("sit on solid paper upright and sideways, so the scrolled-under text never shows through", () => {
    const upright = css.slice(css.indexOf("@media (max-width: 520px)"));
    for (const block of [upright, sideways]) {
      expect(/\n  \.landed-card \.catch-actions \{([^}]*position: sticky;[^}]*)\}/.exec(block)?.[1]).toContain("background: rgb(239, 224, 194);");
    }
  });
});
