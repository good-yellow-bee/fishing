import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(`${import.meta.dirname}/field.css`, "utf8");
const mapCss = readFileSync(`${import.meta.dirname}/map/spot-map.css`, "utf8");
const gearCss = readFileSync(`${import.meta.dirname}/gear/gear.css`, "utf8");

describe("the field log on a touch screen", () => {
  it("reaches 8 px past each underlined text button and link without moving anything", () => {
    const block = /\.text-button::after \{([^}]*)\}/.exec(css)?.[1];
    expect(block).toContain('content: "";');
    expect(block).toContain("position: absolute;");
    expect(block).toContain("inset: -8px -4px;");
  });

  it("gives Home's stacked count links room of their own", () => {
    const block = /\.stat-row small a \{\n    display: inline-block;([^}]*)\}/.exec(css)?.[1];
    expect(block).toContain("padding-block: 4px;");
    expect(block).toContain("margin-block: 4px;");
  });

  it("keeps a one-digit count link on Bests at least 32 px wide", () => {
    const block = /\.stat-row strong a \{([^}]*)\}/.exec(css)?.[1];
    expect(block).toContain("min-width: 32px;");
  });

  it("reaches past the links on every card and the page head's Cancel", () => {
    const block = /\.sheet-head a:not\(\.field-primary\)::after \{([^}]*)\}/.exec(css)?.[1];
    expect(block).toContain("inset: -6px -3px;");
    const list = css.slice(0, css.indexOf(".sheet-head a:not(.field-primary)::after {"));
    expect(list).toContain(":is(.catch-card, .trip-card, .spot-card) :is(h2, h3, h4) a::after,\n  .trip-link a::after,");
    expect(/\.meta a::after \{([^}]*)\}/.exec(css)?.[1]).toContain("inset: -4px -3px -6px;");
  });

  it("parts a card's wrapped lines so neighbouring links don't take each other's taps", () => {
    expect(/\n  p\.meta \{([^}]*)\}/.exec(css)?.[1]).toContain("row-gap: 12px;");
    expect(/\(\.meta, \.trip-link\) \{([^}]*)\}/.exec(css)?.[1]).toContain("margin-top: 10px;");
    expect(/\n  div\.book-file,\n  p\.search-order \{([^}]*)\}/.exec(css)?.[1]).toContain("row-gap: 16px;");
    expect(/\n  p\.fish-csv \{([^}]*)\}/.exec(css)?.[1]).toContain("margin: 16px 0;");
  });

  it("makes the Released it row and Rename or merge at least 32 px tall", () => {
    expect(/\n  \.form-grid \.check-field \{([^}]*)\}/.exec(css)?.[1]).toContain("min-height: 32px;");
    expect(/\n  \.rename-kind summary \{([^}]*)\}/.exec(css)?.[1]).toContain("padding-block: 6px;");
  });

  it("parts an outing's two wrapped calendar and print buttons, and Pack for from the Largest link above it", () => {
    expect(/\n  p\.trip-calendar \{([^}]*)\}/.exec(css)?.[1]).toContain("gap: 16px 0.3em;");
    const coarse = gearCss.slice(gearCss.indexOf("@media (pointer: coarse) {"));
    expect(/\.lure-record \.lure-last:has\(> \.text-button\) \{([^}]*)\}/.exec(coarse)?.[1]).toContain("margin-top: 8px;");
  });

  it("makes the species and lure chips 32 px tall", () => {
    expect(/\n  p\.species-chips a \{([^}]*)\}/.exec(css)?.[1]).toContain("padding-block: 5px;");
  });

  it("reaches past the Map's Plan one and coordinate links into their row", () => {
    const block = /\.map-index a\.map-plan::after,\n  \.map-index a\.map-coord-link::after \{([^}]*)\}/.exec(mapCss)?.[1];
    expect(block).toContain("inset: -8px -4px;");
  });

  it("reaches past each water's name in the Map's list", () => {
    const block = /\.map-index a:not\(\.map-plan, \.map-coord-link\)::after \{([^}]*)\}/.exec(mapCss)?.[1];
    expect(block).toContain("inset: -6px -3px;");
  });
});

describe("the field log's tab bar on a 320 px phone", () => {
  it("widens a tab and scrolls rather than clip a word spaced wider (WCAG 1.4.12)", () => {
    const narrow = css.slice(css.indexOf("@media (max-width: 420px) {"));
    const block = /\n  \.field-tab \{([^}]*)\}/.exec(narrow)?.[1];
    expect(block).toContain("grid-template-columns: repeat(7, minmax(max-content, 1fr));");
    expect(block).toContain("overflow-x: auto;");
  });
});

describe("the field log's forms by keyboard", () => {
  it("scrolls a field tabbed to clear of the sticky save buttons (WCAG 2.4.11)", () => {
    expect(/\nhtml:has\(\.form-save\) \{([^}]*)\}/.exec(css)?.[1]).toContain("scroll-padding-bottom: 88px;");
    const phone = css.slice(css.indexOf("@media (max-width: 860px) {"));
    expect(/\n  html:has\(\.form-save\) \{([^}]*)\}/.exec(phone)?.[1]).toContain("scroll-padding-bottom: calc(48px + 88px + env(safe-area-inset-bottom));");
  });
});
