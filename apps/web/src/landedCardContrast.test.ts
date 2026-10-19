import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(`${import.meta.dirname}/index.css`, "utf8");

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

// The card is rgba(239, 224, 194, 0.95): over a night lake it is about this dark.
const PARCHMENT_AT_NIGHT = "#e3d5b8";

describe("the landed card's small words", () => {
  it("ink each rarity tag and the quiet stamp at 4.5 to 1 or more on the parchment", () => {
    const selectors = [".rarity-common .rarity-tag", ".rarity-uncommon .rarity-tag", ".rarity-rare .rarity-tag", ".rarity-legendary .rarity-tag", " .catch-stamp.quiet"];
    for (const selector of selectors) {
      const escaped = selector.replace(/[.]/g, "\\.");
      const rule = new RegExp(`\\n\\.landed-card${escaped} \\{([^}]*)\\}`).exec(css)?.[1];
      const color = /\n  color: (#[0-9a-f]{6});/.exec(rule ?? "")?.[1];
      expect(color, selector).toBeDefined();
      expect(contrast(color!, PARCHMENT_AT_NIGHT), selector).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("ink the badge toast's Badge line at 4.5 to 1 or more on the same parchment", () => {
    const rule = /\n\.badge-toast \.eyebrow \{([^}]*)\}/.exec(css)?.[1];
    const color = /\n  color: (#[0-9a-f]{6});/.exec(rule ?? "")?.[1];
    expect(color).toBeDefined();
    expect(contrast(color!, PARCHMENT_AT_NIGHT)).toBeGreaterThanOrEqual(4.5);
  });
});
