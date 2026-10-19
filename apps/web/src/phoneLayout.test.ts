import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(`${import.meta.dirname}/index.css`, "utf8");
const SIDEWAYS = "@media (max-height: 500px) {";

describe("a phone held sideways", () => {
  it("skips the narrow-screen layout, so a 740-800 px wide phone does not get both", () => {
    const narrow = /^@media ([^{]*) \{\n  \.hud \{/m.exec(css)?.[1];
    expect(narrow).toBe("(max-width: 800px) and (min-height: 501px)");
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

describe("a window zoomed in on a laptop", () => {
  it("gets the short-screen layout whatever the pointer, with the hint in the corner a phone's stick would take", () => {
    expect(css).toContain("\n@media (max-height: 500px) {\n");
    const fine = css.slice(css.indexOf("@media (max-height: 500px) and (pointer: fine), (max-height: 500px) and (pointer: none) {"));
    expect(/\n  \.hint \{([^}]*)\}/.exec(fine)?.[1]).toContain("left: 10px;");
    expect(fine).toMatch(/html\[data-hand="left"\] \.hint \{\n    right: 10px;/);
  });
});

describe("larger text on a phone held upright", () => {
  const from = css.indexOf("@media (max-width: 800px) and (min-height: 501px)");
  const upright = css.slice(from, css.indexOf("@media (max-width: 520px)", from));

  it("brings the cast meter down beside it, clear of the hint and the coach", () => {
    expect(upright).toMatch(/html\[data-text-size\] \.power-meter \{\n    bottom: calc\(104px \/ var\(--text-zoom, 1\)\);\n    width: min\(160px, calc\(\(100vw - 152px\) \/ var\(--text-zoom, 1\)\)\);/);
    expect(upright).toMatch(/html\[data-text-size\] \.scene-wrap\[data-walkthrough="1"\] \.walkthrough ol \{\n    display: none;/);
  });
});

describe("a fight on a phone held upright with larger text", () => {
  const from = css.indexOf("@media (max-width: 800px) and (min-height: 501px)");
  const upright = css.slice(from, css.indexOf("@media (max-width: 520px)", from));

  it("clears the header's status chips, the coach and the bank chip so the card ends above the thumb button", () => {
    expect(upright).toContain('html[data-text-size] .hud:has(+ .scene-wrap[data-phase="fight"]) :is(.hour-chip, .sky-chip, .level-chip, .points-chip),');
    expect(upright).toMatch(/html\[data-text-size\] \.scene-wrap\[data-phase="fight"\] :is\(\.walkthrough, \.stance-chip\) \{\n    display: none;/);
    expect(upright).toMatch(/@media \(pointer: coarse\) and \(max-width: 800px\) and \(min-height: 501px\) \{\n  html\[data-text-size\] \.fight-bar \.fight-controls \{\n    display: none;/);
  });
});

describe("the effects notice", () => {
  it("takes its own width up to its cap instead of wrapping to half the screen", () => {
    expect(/\n\.effects-toast \{([^}]*)\}/.exec(css)?.[1]).toContain("width: max-content;");
  });
});

describe("the settings panel on a phone", () => {
  it("is solid and keeps Back to the lake pinned at its foot while the long list scrolls", () => {
    expect(/\n\.settings-panel \{([^}]*)\}/.exec(css)?.[1]).toContain("background: rgb(24, 29, 25);");
    const foot = /\n\.settings-foot \{([^}]*)\}/.exec(css)?.[1];
    expect(foot).toContain("position: sticky;");
    expect(foot).toContain("background: inherit;");
  });
});

describe("the keys card on a phone", () => {
  const from = css.indexOf("/* On a phone the three columns only fit");
  const phone = css.slice(from, css.indexOf("\n.settings-overlay {", from));

  it("lets long keys wrap, and with larger text puts what each key does on a line of its own", () => {
    expect(phone).toMatch(/@media \(max-width: 520px\) \{\n  \.keys-card kbd \{\n    white-space: normal;/);
    expect(phone).toMatch(/html\[data-text-size\] \.keys-card tr \{\n    display: grid;\n    grid-template-columns: 1fr 1fr;/);
    expect(phone).toMatch(/html\[data-text-size\] \.keys-card td:nth-child\(3\) \{\n    grid-column: 1 \/ -1;/);
  });
});

describe("a fight on a phone held sideways with larger text", () => {
  const from = css.indexOf("@media (pointer: coarse) and (max-height: 500px) {");
  const block = css.slice(from, css.indexOf("\n}\n", from));

  it("drops the card's hold-and-release line and the bar's status chips, so the card stays under the bar", () => {
    expect(from).toBeGreaterThan(-1);
    expect(block).toContain("html[data-text-size] .fight-bar .fight-controls,");
    expect(block).toContain('html[data-text-size] .hud:has(+ .scene-wrap[data-phase="fight"]) :is(.hour-chip, .sky-chip, .level-chip, .points-chip),');
  });

  it("centres the card in the room beside the Reel button, on either hand", () => {
    expect(block).toMatch(/\n  \.fight-bar \{\n    left: calc\(50% - 56px\);/);
    expect(block).toMatch(/html\[data-hand="left"\] \.fight-bar \{\n    left: calc\(50% \+ 56px\);/);
  });
});

describe("Settings, the keys card and the trip recap on a short screen", () => {
  it("sit 8 px from the edges and pin a tighter foot, so the list scrolls in a taller window", () => {
    const short = css.slice(css.indexOf(SIDEWAYS));
    expect(/\n  \.settings-overlay \{([^}]*)\}/.exec(short)?.[1]).toContain("padding: 8px;");
    expect(/\n  \.settings-panel \{([^}]*)\}/.exec(short)?.[1]).toContain("max-height: calc(100dvh / var(--text-zoom, 1) - 16px);");
    expect(/\n  \.settings-foot \{([^}]*)\}/.exec(short)?.[1]).toContain("padding: 6px 18px 8px;");
  });
});

describe("the shop on a phone", () => {
  it("is solid, keeps Back to the path pinned at its foot, and sits centred", () => {
    expect(/\n\.shop-overlay \{([^}]*)\}/.exec(css)?.[1]).toContain("background: rgb(24, 29, 25);");
    const foot = /\n\.shop-foot \{([^}]*)\}/.exec(css)?.[1];
    expect(foot).toContain("position: sticky;");
    expect(foot).toContain("background: inherit;");
    expect(css).toMatch(/@media \(max-width: 520px\) \{\n  \/\*[^*]*\*\/\n  \.shop-overlay \{\n    right: calc\(4vw \/ var\(--text-zoom, 1\)\);/);
  });

  it("drops the gap over its pinned button with a rule that outranks the shop's own button margin", () => {
    const pinned = css.indexOf("\n.shop-overlay .shop-foot .panel-btn {\n  margin-top: 0;");
    expect(pinned).toBeGreaterThan(-1);
    expect(css.indexOf("\n.shop-overlay .panel-btn {\n  margin-top: 12px;")).toBeGreaterThan(-1);
  });

  it("tightens its margins and foot on a short screen", () => {
    const short = css.slice(css.indexOf(SIDEWAYS));
    const panel = /\n  \.shop-overlay \{([^}]*)\}/.exec(short)?.[1];
    expect(panel).toContain("bottom: 8px;");
    expect(panel).toContain("max-height: calc(100dvh / var(--text-zoom, 1) - 16px);");
    expect(/\n  \.shop-foot \{([^}]*)\}/.exec(short)?.[1]).toContain("padding: 6px 16px 8px;");
  });
});

describe("the trip recap on a phone", () => {
  const from = css.indexOf('/* "Najcięższa" in its spaced capitals');
  const phone = css.slice(from, css.indexOf("/* High contrast from Settings", from));

  it("tightens the stat labels, and stacks the stats as rows with larger text or on the narrowest phones", () => {
    expect(phone).toMatch(/@media \(max-width: 520px\) \{\n  \.trip-recap-stats dt \{\n    letter-spacing: 0\.04em;/);
    expect(phone).toMatch(/html\[data-text-size\] \.trip-recap-stats \{\n    grid-template-columns: 1fr;/);
    expect(phone).toMatch(/@media \(max-width: 360px\) \{\n  \.trip-recap-stats \{\n    grid-template-columns: 1fr;/);
  });
});

describe("the news card on a phone", () => {
  it("is solid, pins Got it at its foot, sits under the header and ends above the banks' row at any text size", () => {
    const card = /\n\.whats-new \{([^}]*)\}/.exec(css)?.[1];
    expect(card).toContain("max-height: calc((100dvh - 38px) / var(--text-zoom, 1) - 102px - var(--hud-drop, 0px));");
    expect(card).toContain("background: rgb(20, 28, 25);");
    const foot = /\n\.whats-new-foot \{([^}]*)\}/.exec(css)?.[1];
    expect(foot).toContain("position: sticky;");
    expect(foot).toContain("background: inherit;");
    const from = css.indexOf("@media (max-width: 800px) and (min-height: 501px)");
    const upright = css.slice(from, css.indexOf("@media (max-width: 520px)", from));
    expect(upright).toMatch(/\.whats-new \{\n    top: calc\(var\(--hud-bottom, 140px\) \+ 8px\);\n    max-height: calc\(100dvh \/ var\(--text-zoom, 1\) - var\(--hud-bottom, 140px\) - 68px\);/);
  });
});

describe("photo mode on a phone", () => {
  it("opens the hint at the top, clear of the shutter, and gives the saved note its own width", () => {
    expect(css).toMatch(/@media \(pointer: coarse\) \{\n  \.photo-exit \{\n    align-items: flex-start;/);
    const note = /\n\.photo-note \{([^}]*)\}/.exec(css)?.[1];
    expect(note).toContain("width: max-content;");
    expect(css).toMatch(/\.photo-exit:has\(~ \.photo-note\) span \{\n  visibility: hidden;/);
  });
});

describe("the lake header on a phone with larger text", () => {
  it("drops the wordmark's row on a phone, where the angler's name is already hidden, so it takes three rows instead of four", () => {
    const from = css.indexOf("@media (max-width: 520px) {\n  .hud-user,");
    const phone = css.slice(from, css.indexOf("\n}\n", from));
    expect(phone).toMatch(/html\[data-text-size\] \.hud-brand \{\n    display: none;/);
  });
});

describe("the lake's news on a touch tablet", () => {
  it("moves right of the walking stick instead of sitting under it, unless the stick is on the other side", () => {
    const from = css.indexOf("@media (pointer: coarse) and (min-width: 521px) {");
    expect(from).toBeGreaterThan(-1);
    const block = css.slice(from, css.indexOf("\n}\n", from));
    expect(block).toMatch(/html:not\(\[data-hand="left"\]\) \.lodge-tracks \{\n    left: calc\(136px \/ var\(--text-zoom, 1\)\);/);
    expect(block).toContain("max-width: min(42ch, calc(100vw / var(--text-zoom, 1) - 156px));");
  });
});

describe("the walking stick with larger text", () => {
  it("keeps its size on any touch screen, phone or tablet, with a rule that outranks the text-size zoom", () => {
    const from = css.indexOf("/* The walking stick: only on touch screens");
    const start = css.indexOf("@media (pointer: coarse) {", from);
    const touch = css.slice(start, css.indexOf("\n}\n", start));
    expect(touch).toMatch(/html\[data-text-size\] \.scene-wrap > div\.walk-stick \{\n    zoom: 1;/);
    expect(css.match(/\.walk-stick \{\n    zoom: 1;/g)).toHaveLength(1);
  });
});

describe("the bank chip while the first-cast coach shows", () => {
  it("stops short of the coach's left edge on one line on a laptop or tablet, at any text size", () => {
    const from = css.indexOf('@media (min-width: 801px) {\n  .scene-wrap[data-walkthrough="1"] .stance-chip {');
    expect(from).toBeGreaterThan(-1);
    const block = css.slice(from, css.indexOf("\n}\n", from));
    expect(block).toContain("max-width: calc(50vw / var(--text-zoom, 1) - min(210px, 30vw / var(--text-zoom, 1)) - 32px);");
    expect(block).toContain("text-overflow: ellipsis;");
    expect(/\n\.walkthrough \{([^}]*)\}/.exec(css)?.[1]).toContain("width: min(420px, calc(60vw / var(--text-zoom, 1)));");
  });
});

describe("the lure panel on a touch tablet", () => {
  it("ends above the walking stick and scrolls, so its longest notes never run over the stick", () => {
    const from = css.indexOf("@media (pointer: coarse) and (min-width: 801px) and (min-height: 501px) {\n  html:not([data-hand=\"left\"]) .lure-choice {");
    expect(from).toBeGreaterThan(-1);
    const block = css.slice(from, css.indexOf("\n}\n", from));
    expect(block).toContain("max-height: calc((100dvh - 216px) / var(--text-zoom, 1) - 154px - var(--hud-drop, 0px));");
    expect(block).toContain("overflow-y: auto;");
    expect(/\n\.lure-choice \{([^}]*)\}/.exec(css)?.[1]).toContain("top: calc(154px + var(--hud-drop, 0px));");
    expect(/@media \(pointer: coarse\) \{\n  \.walk-stick \{([^}]*)\}/.exec(css)?.[1]).toMatch(/bottom: 104px;[\s\S]*height: 104px;/);
  });
});

describe("the sign-in page and the catch log with larger text", () => {
  it("take the window's height divided by the zoom they are drawn at", () => {
    expect(/\n\.auth-shell \{([^}]*)\}/.exec(css)?.[1]).toContain("min-height: calc(100vh / var(--text-zoom, 1));");
    expect(/\n\.log-page \{([^}]*)\}/.exec(css)?.[1]).toContain("min-height: calc(100vh / var(--text-zoom, 1));");
  });
});

describe("the shack's three-day board", () => {
  const rule = /\n\.forecast-board ul \{([^}]*)\}/.exec(css)?.[1] ?? "";
  // auto-fit's count for a given list width, from the rule's own minimum: max((W - 17px) / 3, min(W, (364px - W) * 999)).
  const columns = (width: number) => {
    const least = Math.max((width - 17) / 3, Math.min(width, (364 - width) * 999));
    return Math.max(1, Math.floor((width + 8) / (least + 8)));
  };

  it("keeps the three days side by side in the 420 px panel, at any text size", () => {
    expect(rule).toContain("grid-template-columns: repeat(auto-fit, minmax(max(calc((100% - 17px) / 3), min(100%, calc((364px - 100%) * 999))), 1fr));");
    expect(rule).toContain("gap: 8px;");
    expect(columns(388)).toBe(3);
    expect(columns(364)).toBe(3);
  });

  it("puts one day a row on a phone instead of tips a word a line, never two and one", () => {
    // A 360 px phone's panel list at normal, larger and largest text.
    for (const width of [299, 256, 223]) expect(columns(width)).toBe(1);
    for (let width = 200; width <= 400; width++) expect([1, 3]).toContain(columns(width));
  });
});
