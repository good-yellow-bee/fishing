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

  it("makes each of Home's stacked count and outing links a 32 px band", () => {
    const block = /\.stat-row small a \{\n    display: inline-block;([^}]*)\}/.exec(css)?.[1];
    expect(block).toContain("min-height: 32px;");
    expect(block).toContain("padding-block: 8px;");
  });

  it("makes Add the one you fished 32 px tall", () => {
    expect(/\n  \.own-water a \{([^}]*)\}/.exec(css)?.[1]).toContain("padding-block: 8px;");
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

  it("makes a missing page's lone way back 32 px tall", () => {
    expect(/\n  \.sheet > \.lede \+ a \{([^}]*)\}/.exec(css)?.[1]).toContain("padding-block: 6px;");
  });

  it("makes the species and lure chips 32 px tall", () => {
    expect(/\n  p\.species-chips a \{([^}]*)\}/.exec(css)?.[1]).toContain("padding-block: 5px;");
  });

  it("reaches past the Map's Plan one and coordinate links into their row", () => {
    const block = /\.map-index a\.map-plan::after,\n  \.map-index a\.map-coord-link::after \{([^}]*)\}/.exec(mapCss)?.[1];
    expect(block).toContain("inset: -8px -4px;");
  });

  it("reaches past each water's name in the Map's list", () => {
    const block = /\.map-index a:not\(\.map-plan, \.map-coord-link, \.map-next\)::after \{([^}]*)\}/.exec(mapCss)?.[1];
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

  it("keeps each tab 32 px wide on screen under larger text, where a tab is as wide as its word", () => {
    const narrow = css.slice(css.indexOf("@media (max-width: 420px) {"));
    expect(/\n  \.field-tab a \{([^}]*)\}/.exec(narrow)?.[1]).toContain("min-width: calc(32px / var(--text-zoom, 1));");
  });
});

describe("the field log's forms by keyboard", () => {
  it("scrolls a field tabbed to clear of the sticky save buttons (WCAG 2.4.11)", () => {
    expect(/\nhtml:has\(\.form-save\) \{([^}]*)\}/.exec(css)?.[1]).toContain("scroll-padding-bottom: 88px;");
    const phone = css.slice(css.indexOf("@media (max-width: 860px) {"));
    expect(/\n  html:has\(\.form-save\) \{([^}]*)\}/.exec(phone)?.[1]).toContain("scroll-padding-bottom: calc(48px + 88px + env(safe-area-inset-bottom));");
  });
});

describe("a fish's page on a touch screen", () => {
  it("parts stacked count links far enough that each keeps its reach", () => {
    expect(/\n  p\.meta:has\(> a\) \+ p\.meta:has\(> a\) \{([^}]*)\}/.exec(css)?.[1]).toContain("margin-top: 12px;");
  });

  it("parts the head's wrapped links and Copy a summary from the outing link below", () => {
    expect(/\n  p\.meta\.stand \{([^}]*)\}/.exec(css)?.[1]).toContain("line-height: 2.2;");
    expect(/\n  \.trip-again \+ \.trip-link \{([^}]*)\}/.exec(css)?.[1]).toContain("margin-top: 18px;");
  });
});

describe("a list's Show all on a touch screen", () => {
  it("stands far enough below the last row that its reach leaves that row's link alone", () => {
    const touch = css.slice(css.indexOf("@media (pointer: coarse) {"));
    expect(/\n  p\.tally-more \{([^}]*)\}/.exec(touch)?.[1]).toContain("margin-top: 12px;");
  });
});

describe("a page's eyebrow links on a touch screen", () => {
  it("wraps each link as a piece of its own, the lines far enough apart for their reaches", () => {
    const touch = css.slice(css.indexOf("@media (pointer: coarse) {"));
    const block = /\n  \.sheet p\.eyebrow:has\(a\) \{([^}]*)\}/.exec(touch)?.[1];
    expect(block).toContain("flex-wrap: wrap;");
    expect(block).toContain("gap: 24px 0.3em;");
  });

  it("reaches 11 px past an eyebrow link's solid line, to 33 px", () => {
    const touch = css.slice(css.indexOf("@media (pointer: coarse) {"));
    expect(/\n  \.sheet \.eyebrow a::after \{([^}]*)\}/.exec(touch)?.[1]).toContain("inset: -11px -4px;");
  });
});

describe("Bests' days calendar on a touch screen", () => {
  it("draws each day as a square up to 32 px", () => {
    const touch = css.slice(css.indexOf("@media (pointer: coarse) {"));
    expect(/\n  \.day-calendar \.day-grid \{([^}]*)\}/.exec(touch)?.[1]).toContain("grid-template-columns: repeat(7, minmax(0, 32px));");
    expect(/\n  \.day-calendar \.day-grid li \{([^}]*)\}/.exec(touch)?.[1]).toContain("aspect-ratio: 1;");
  });
});

describe("Bests' season box on a touch screen", () => {
  it("gives each stacked count link a 32 px band of its own, and leaves desktop's plain inline links alone", () => {
    const touch = css.slice(css.indexOf("@media (pointer: coarse) {"));
    const block = /\n  \.season-recap p a \{([^}]*)\}/.exec(touch)?.[1];
    expect(block).toContain("display: inline-block;");
    expect(block).toContain("min-height: 32px;");
    expect(block).toContain("box-sizing: border-box;");
    // Off a touch screen they stay inline links, which keep axe's inline-text exception (see Home's count links).
    expect(css.slice(0, css.indexOf("@media (pointer: coarse) {"))).not.toMatch(/\n\.season-recap p a \{/);
  });
});

describe("a water's tips box on a touch screen", () => {
  it("makes each linked word a 32 px band, at least 32 px wide, and leaves desktop's inline links alone", () => {
    const touch = css.slice(css.indexOf("@media (pointer: coarse) {"));
    const block = /\n  \.water-tips p a \{([^}]*)\}/.exec(touch)?.[1];
    expect(block).toContain("display: inline-block;");
    expect(block).toContain("min-width: 32px;");
    expect(block).toContain("min-height: 32px;");
    expect(block).toContain("box-sizing: border-box;");
    expect(css.slice(0, css.indexOf("@media (pointer: coarse) {"))).not.toMatch(/\n\.water-tips p a \{/);
  });
});

describe("a catch's conditions box on a touch screen", () => {
  it("makes the sky, wind, temperature and moon links 32 px bands, and leaves desktop's inline links alone", () => {
    const touch = css.slice(css.indexOf("@media (pointer: coarse) {"));
    const block = /\n  \.catch-conditions > p:not\(\.meta\) a \{([^}]*)\}/.exec(touch)?.[1];
    expect(block).toContain("display: inline-block;");
    expect(block).toContain("min-height: 32px;");
    expect(block).toContain("box-sizing: border-box;");
    expect(css.slice(0, css.indexOf("@media (pointer: coarse) {"))).not.toContain(".catch-conditions");
    expect(readFileSync(`${import.meta.dirname}/CatchPages.tsx`, "utf8")).toContain('<aside className="conditions catch-conditions"');
  });
});

describe("an empty list's link on a touch screen", () => {
  it("makes the link that fills it a 32 px band, and leaves desktop's inline link alone", () => {
    const touch = css.slice(css.indexOf("@media (pointer: coarse) {"));
    const block = /\n  \.empty a \{([^}]*)\}/.exec(touch)?.[1];
    expect(block).toContain("display: inline-block;");
    expect(block).toContain("min-height: 32px;");
    expect(block).toContain("box-sizing: border-box;");
    expect(css.slice(0, css.indexOf("@media (pointer: coarse) {"))).not.toMatch(/\n\.empty a \{/);
  });
});

describe("a page's one-link lines on a touch screen", () => {
  it("makes Add a photo, Write up the day, Go again and a missing page's way back 32 px bands, and leaves desktop's inline links alone", () => {
    const touch = css.slice(css.indexOf("@media (pointer: coarse) {"));
    const block = /\n  :is\(\.add-photo, \.trip-write-up, \.trip-again, \.lone-link\) > a \{([^}]*)\}/.exec(touch)?.[1];
    expect(block).toContain("display: inline-block;");
    expect(block).toContain("min-height: 32px;");
    expect(block).toContain("box-sizing: border-box;");
    expect(css.slice(0, css.indexOf("@media (pointer: coarse) {"))).not.toContain(".lone-link");
    expect(readFileSync(`${import.meta.dirname}/NotFoundPage.tsx`, "utf8")).toContain('<p className="lone-link">');
  });
});

describe("Bests' month-by-year table on a touch screen", () => {
  it("reaches each 24 px count 4 px out to its cell's edges, a 32 px band meeting the next row's", () => {
    const touch = css.slice(css.indexOf("@media (pointer: coarse) {"));
    expect(/\n  \.month-year td a \{([^}]*)\}/.exec(touch)?.[1]).toContain("position: relative;");
    expect(/\n  \.month-year td a::after \{([^}]*)\}/.exec(touch)?.[1]).toContain("inset: -4px;");
    // The reach adds to the 24 px link and its 4 px cell padding above and below.
    expect(/\n\.month-year td a \{([^}]*)\}/.exec(css)?.[1]).toContain("min-height: 24px;");
    expect(/\n\.month-year td \{([^}]*)\}/.exec(css.replace(".month-year th,\n.month-year td {", ".month-year td {"))?.[1]).toContain("padding: 4px 12px 4px 0;");
  });
});

describe("keyboard focus on the log's paper", () => {
  it("draws the focus ring in the log's rust, not the lake's amber (WCAG 1.4.11)", () => {
    expect(/\n\.field-main :is\(a, button, summary\):focus-visible \{([^}]*)\}/.exec(css)?.[1]).toContain("outline-color: var(--field-rust);");
  });
});

describe("Home's count cards on a tablet with larger text", () => {
  it("go two and one when a card would be under 150 px, and let a long count wrap as an inline link", () => {
    expect(/\n\.stat-row \{([^}]*)\}/.exec(css)?.[1]).toContain("grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr));");
    // Plain inline links on a desktop: an inline block loses the inline-link spacing exception (WCAG 2.5.8).
    expect(css).not.toMatch(/\n\.stat-row small a \{/);
    expect(css).not.toMatch(/\.stat-row small a \{\n  white-space: nowrap;/);
  });
});

describe("Home's columns and the card grids on a tablet-width window with larger text", () => {
  it("stack Home's two columns when they no longer fit side by side at 1.15 to 0.85", () => {
    expect(/\n\.home-grid \{([^}]*)\}/.exec(css)?.[1]).toContain("flex-wrap: wrap;");
    expect(/\n\.home-grid > \* \{([^}]*)\}/.exec(css)?.[1]).toContain("flex: 1.15 1 345px;");
    expect(/\n\.home-grid > :last-child \{([^}]*)\}/.exec(css)?.[1]).toContain("flex: 0.85 1 255px;");
  });

  it("keep Spots and Bests cards two across at most, one when a card would be under 220 px", () => {
    expect(/\n\.card-grid \{\n  grid-template-columns: ([^;]*);/.exec(css)?.[1]).toBe("repeat(auto-fit, minmax(min(100%, max(220px, calc(50% - 5px))), 1fr))");
    expect(css).not.toContain('\n.stat-row[data-cols="4"] {');
  });
});

describe("the field log with larger text", () => {
  it("divides every height or width taken from the window by the text zoom it is drawn at", () => {
    const uses = css.match(/100d?v[hw][^;]*;/g) ?? [];
    expect(uses.length).toBeGreaterThanOrEqual(10);
    for (const use of uses) expect(use).toMatch(/^100d?v[hw] \/ var\(--text-zoom, 1\)/);
    expect(/\n\.field-rail \{([^}]*)\}/.exec(css)?.[1]).toContain("height: calc(100dvh / var(--text-zoom, 1));");
  });
});
