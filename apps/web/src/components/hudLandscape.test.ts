import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(`${import.meta.dirname}/../index.css`, "utf8");

describe("the lake's top bar on a phone held sideways", () => {
  it("drops the wordmark so the chips and links fit one row", () => {
    const block = css.slice(css.indexOf("@media (pointer: coarse) and (max-height: 500px) {"));
    expect(block).toMatch(/^@media \(pointer: coarse\) and \(max-height: 500px\) \{\s+\.hud \{[^}]+\}\s+\/\*[^*]+\*[^/]*\/\s+\.hud-brand \{\s+display: none;\s+\}/);
  });
});

describe("the catch card on a phone held sideways", () => {
  it("scrolls as one with the largest text, so the fish shows before the buttons", () => {
    const block = css.slice(css.indexOf("@media (pointer: coarse) and (max-height: 500px) {"));
    expect(block).toContain('html[data-text-size="larger"] .landed-card .catch-actions {\n    position: static;\n  }');
  });
});
