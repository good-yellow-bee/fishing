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
    expect(block).toContain("max-height: calc((100dvh - var(--hud-bottom, 52px)) / var(--text-zoom, 1) - 64px);");
  });

  it("stops the signs' columns short of the lure panel and scrolls them sideways", () => {
    const sideways = css.slice(css.indexOf(SIDEWAYS));
    const block = /\n  \.walk-signs \{([^}]*)\}/.exec(sideways)?.[1];
    expect(block).toContain("max-width: calc(100vw / var(--text-zoom, 1) - 16px - min(220px, calc(30vw / var(--text-zoom, 1))));");
    expect(block).toContain("overflow-x: auto;");
    expect(block).toContain("scroll-padding: 4px;");
    expect(/\n  \.walk-signs \.panel-btn \{([^}]*)\}/.exec(sideways)?.[1]).toContain("white-space: nowrap;");
  });

  it("moves the lure up beside the bank chip with larger text, clear of the walk stick", () => {
    const sideways = css.slice(css.indexOf(SIDEWAYS));
    expect(/html\[data-text-size\] \.lure-choice \{([^}]*)\}/.exec(sideways)?.[1]).toContain("top: calc(var(--hud-bottom, 52px) + 6px);");
    expect(/html\[data-text-size\] \.lure-choice > span \{([^}]*)\}/.exec(sideways)?.[1]).toContain("clip: rect(0 0 0 0);");
    expect(/html\[data-text-size\] \.stance-chip \{([^}]*)\}/.exec(sideways)?.[1]).toContain("left: calc(16px + min(220px, calc(30vw / var(--text-zoom, 1))));");
    expect(/html\[data-text-size\] \.scene-wrap\[data-walkthrough="1"\] \.stance-chip \{([^}]*)\}/.exec(sideways)?.[1]).toContain("display: none;");
  });

  it("hides a bank chip the signs leave no room for from sight, not from a screen reader", () => {
    const sideways = css.slice(css.indexOf(SIDEWAYS));
    const cramped = /\.scene-wrap\[data-chip-cramped\] > \.stance-chip \{([^}]*)\}/.exec(sideways)?.[1];
    expect(cramped).toContain("clip: rect(0 0 0 0);");
    expect(cramped).not.toContain("display: none");
    const dock = readFileSync(`${import.meta.dirname}/pages/Dock.tsx`, "utf8");
    expect(dock).toContain('wrap.toggleAttribute("data-chip-cramped"');
    // The coach hides the chip, which reads 0 px from the left: it measures again once the coach goes.
    expect(dock).toContain("if (chip) observer.observe(chip);");
  });

  it("keeps the coach and the news card off the signs, which take a second column with larger text", () => {
    const sideways = css.slice(css.indexOf(SIDEWAYS));
    const coach = [...sideways.matchAll(/\n  \.walkthrough \{([^}]*)\}/g)].map((m) => m[1]).find((b) => b.includes("--signs-room"));
    expect(coach).toContain("--coach-left: calc(16px + min(220px, calc(30vw / var(--text-zoom, 1))));");
    expect(coach).toContain("right: max(8px, min(calc(var(--signs-room, 0px) / var(--text-zoom, 1) + 8px), calc(100vw / var(--text-zoom, 1) - var(--coach-left) - 240px)));");
    expect(coach).toContain("max-width: 400px;");
    const news = [...sideways.matchAll(/\n  \.whats-new \{([^}]*)\}/g)].map((m) => m[1]).find((b) => b.includes("--signs-room"));
    expect(news).toContain("right: max(8px, min(calc(var(--signs-room, 0px) / var(--text-zoom, 1) + 8px), calc(100vw / var(--text-zoom, 1) - 248px)));");
    expect(news).toContain("max-width: 440px;");
    expect(news).toContain("transform: none;");
    const dock = readFileSync(`${import.meta.dirname}/pages/Dock.tsx`, "utf8");
    expect(dock).toContain('wrap.style.setProperty("--signs-room"');
    // The lake mounts after the profile loads: an effect that ran only on the loading view left the signs' reach unset.
    expect(dock).toContain("}, [game.surfaceRef, scenePhase, shopOpen, photo, lakeShown]);");
  });

  it("hangs the hint below a bank chip that wraps taller than the lure panel, under the cast meter", () => {
    const upright = css.slice(css.indexOf("@media (max-width: 800px) and (min-height: 501px) {"));
    expect(/\n  \.hint \{([^}]*)\}/.exec(upright)?.[1]).toContain("top: calc(var(--hud-bottom, 140px) + max(90px, calc(var(--stance-h, 0px) + 16px)));");
    expect(/\n  \.power-meter \{([^}]*)\}/.exec(upright)?.[1]).toContain("z-index: 3;");
    const dock = readFileSync(`${import.meta.dirname}/pages/Dock.tsx`, "utf8");
    expect(dock).toContain('wrap.style.setProperty("--stance-h"');
  });

  it("fits a narrow phone's header links into two rows with larger text, each link keeping its 32 px", () => {
    const narrow = css.slice(css.indexOf("@media (max-width: 359px) and (min-height: 501px) {"));
    expect(/html\[data-text-size\] \.hud-stats \{([^}]*)\}/.exec(narrow)?.[1]).toContain("row-gap: 0;");
    expect(/html\[data-text-size\] \.hud \.hud-link \{([^}]*)\}/.exec(narrow)?.[1]).toContain("letter-spacing: 0;");
    expect(/\n  \.hud \.hud-link,\n[^{]*\{([^}]*)\}/.exec(css)?.[1]).toContain("min-height: 32px;");
  });

  it("lets a phone's bottom row of shore signs scroll sideways when the last banks would run past the edge", () => {
    const narrow = css.slice(css.indexOf("/* One thumb row along the bottom"));
    const block = /\.walk-signs \{([^}]*)\}/.exec(narrow)?.[1];
    expect(block).toContain("overflow-x: auto;");
    expect(block).toContain("scroll-padding: 3px;");
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

describe("the fight card on a phone held upright", () => {
  const phone = "@media (pointer: coarse) and (max-width: 520px) and (min-height: 501px) {";
  const upright = css.slice(css.indexOf(phone));
  const touch = css.slice(css.indexOf(phone + "\n  .fight-bar :is("));

  it("takes the top of the screen, above the fight, with the header and the bank chip stepping aside", () => {
    const card = /\n  \.fight-bar,\n  html\[data-text-size\] \.fight-bar \{([^}]*)\}/.exec(upright)?.[1];
    expect(card).toContain("top: calc(8px + env(safe-area-inset-top));");
    expect(card).toContain("bottom: auto;");
    expect(card).toContain("right: 8px;");
    expect(upright).toMatch(/\.hud:has\(\+ \.scene-wrap\[data-phase="fight"\]\) \{\n    visibility: hidden;/);
    expect(upright).toMatch(/\.scene-wrap\[data-phase="fight"\] \.stance-chip,\n  html\[data-text-size\] \.scene-wrap\[data-phase="fight"\] \.walkthrough \{\n    display: none;/);
  });

  it("keeps to what a fight is read from on a touch screen, by height and text size", () => {
    expect(touch).toContain(".fight-bar :is(.fight-controls, .fight-clean),");
    expect(touch).toContain(".scene-wrap:has(.steer-buttons) .fight-bar .fight-habit,");
    expect(touch).toContain('.scene-wrap:has(.steer-buttons):not([data-walkthrough="1"]) .fight-bar .fight-steer[data-call="calm"],');
    expect(css).toMatch(/\(pointer: coarse\) and \(max-height: 500px\) \{\n  \.fight-bar \.fight-note \{\n    position: absolute;/);
    expect(css).toMatch(/and \(max-height: 700px\) \{\n  \.fight-bar \.fight-habit \{\n    display: none;/);
  });

  it("trades the steering buttons' corner with the Reel button for a left hand", () => {
    expect(css).toMatch(/html\[data-hand="left"\] \.steer-buttons \{\n    right: 16px;\n    left: auto;/);
  });

  it("shivers on its own translate, so a layout without a centring transform stays put", () => {
    const shiver = css.slice(css.indexOf("@keyframes fight-shiver"));
    expect(shiver.slice(0, 200)).toContain("translate: -2px 0;");
    expect(shiver.slice(0, 200)).not.toContain("translateX(-50%)");
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
    expect(block).toContain('html[data-text-size] .hud:has(+ .scene-wrap[data-phase="fight"]) :is(.hour-chip, .sky-chip, .level-chip, .points-chip),');
  });

  it("puts the card on the side away from the Reel button, clear of the fight in the middle", () => {
    expect(block).toMatch(/\n  \.fight-bar \{\n    bottom: calc\(96px \+ env\(safe-area-inset-bottom\)\);\n    left: 8px;\n    width: min\(320px, calc\(32vw \/ var\(--text-zoom, 1\)\)\);/);
    expect(block).toMatch(/\.hud:has\(\+ \.scene-wrap\[data-phase="fight"\]\) \{\n    visibility: hidden;/);
    expect(block).toMatch(/html\[data-hand="left"\] \.fight-bar \{\n    right: 8px;\n    left: auto;/);
    expect(block).toContain(".fight-bar :is(.fight-controls, .fight-clean, .fight-habit),");
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

describe("the hint on a touch tablet", () => {
  it("stands beside the walking stick, over the cast meter and short of the strike button, either hand", () => {
    const from = css.indexOf("@media (pointer: coarse) and (min-width: 801px) and (min-height: 501px) {\n  .hint {");
    expect(from).toBeGreaterThan(-1);
    const block = css.slice(from, css.indexOf("\n}\n", from));
    const hint = /\n  \.hint \{([^}]*)\}/.exec(block)?.[1];
    expect(hint).toContain("left: calc(136px / var(--text-zoom, 1));");
    expect(hint).toContain("bottom: 72px;");
    expect(hint).toContain("max-width: min(46ch, calc((100vw - 136px) / var(--text-zoom, 1) - 116px));");
    expect(/html\[data-hand="left"\] \.hint \{([^}]*)\}/.exec(block)?.[1]).toContain("right: calc(136px / var(--text-zoom, 1));");
    expect(/\.lodge-tracks \{([^}]*)\}/.exec(block)?.[1]).toContain("bottom: calc(80px + var(--hint-h, 54px));");
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

describe("the lodge board's fish of the week on a narrow phone", () => {
  it("puts the fish's mark above its name and bonus when they would get under 8em beside it", () => {
    expect(/\n\.weekly-fish \{([^}]*)\}/.exec(css)?.[1]).toContain("flex-wrap: wrap;");
    expect(/\n\.weekly-fish span \{([^}]*)\}/.exec(css)?.[1]).toContain("flex: 1 1 8em;");
  });
});

describe("the lodge's catch log at any width", () => {
  it("scrolls the catch table on its own rather than pushing the page sideways", () => {
    const block = /\n\.log-page table \{\n  display: block;\n  overflow-x: auto;\n\}/.exec(css);
    expect(block).not.toBeNull();
    expect(css).not.toContain("@media (max-width: 640px) {\n  .log-page table {");
  });
});

describe("high contrast", () => {
  it("keeps a switched-on sign such as the Headlamp amber, as the shop and retie signs are", () => {
    const keep = /html\[data-contrast="high"\] :is\(([^)]*\)[^)]*)\) \{\s*border-color: #ffc95c;/.exec(css)?.[1];
    expect(keep).toContain('.walk-signs .panel-btn[aria-pressed="true"]');
    expect(keep).toContain(".walk-signs .walk-retie");
  });
});

describe("the fight card's drag line", () => {
  it("is for a screen reader only on a touch screen with larger text, and on any phone", () => {
    expect(css).toMatch(/html\[data-text-size\] \.fight-bar \.fight-drag-line \{\s*position: absolute;/);
    const short = css.slice(css.indexOf("@media (pointer: coarse) and (max-height: 500px), (pointer: coarse) and (max-width: 520px) {"));
    expect(/\.fight-bar \.fight-drag-line \{([^}]*)\}/.exec(short)?.[1]).toContain("clip: rect(0 0 0 0);");
    const bar = readFileSync(`${import.meta.dirname}/components/FightBar.tsx`, "utf8");
    expect(bar).toContain('<span className="fight-drag-line">{t(DRAG_LINE[drag])}</span>');
  });
});

describe("a sideways phone in a fight", () => {
  it("steps the bank chip aside at any text size", () => {
    const sideways = css.slice(css.lastIndexOf("@media (pointer: coarse) and (max-height: 500px) {"));
    expect(/\n  \.scene-wrap\[data-phase="fight"\] \.stance-chip \{([^}]*)\}/.exec(sideways)?.[1]).toContain("display: none;");
  });
});

describe("the cast meter on a short upright phone", () => {
  it("sits beside the walk stick at any text size, clear of a hint under a tall bank chip", () => {
    const short = css.slice(css.indexOf("@media (max-width: 800px) and (min-height: 501px) and (max-height: 640px) {"));
    expect(/\n  \.scene-wrap \.power-meter \{([^}]*)\}/.exec(short)?.[1]).toContain("bottom: calc(104px / var(--text-zoom, 1));");
  });
});

describe("the bank chip on a small upright phone with larger text", () => {
  it("stops at three rows up to 375 px wide, so the hint under it stays clear of the walk stick", () => {
    const media = "@media (pointer: coarse) and (max-width: 375px) and (min-height: 501px) and (max-height: 667px) {";
    expect(css).toContain(media);
    const block = css.slice(css.indexOf(media), css.indexOf("\n}\n", css.indexOf(media)));
    expect(/\n  html\[data-text-size\] \.stance-chip \{([^}]*)\}/.exec(block)?.[1]).toContain("-webkit-line-clamp: 3;");
  });

  it("lifts the hint clear of the walk stick on a touch phone, but never over the chip or the lure panel", () => {
    const media = "@media (pointer: coarse) and (max-width: 800px) and (min-height: 501px) {";
    const block = css.slice(css.indexOf(media), css.indexOf("\n}\n", css.indexOf(media)));
    const top = /\.scene-wrap:not\(\[data-walkthrough="1"\]\) \.hint \{\s*top: ([^;]*);/.exec(block)?.[1].replace(/\s+/g, " ");
    expect(top).toBe("max( calc(var(--hud-bottom, 140px) + 10px + max(var(--stance-h, 0px), var(--lure-h, 80px))), min( calc(var(--hud-bottom, 140px) + max(90px, calc(var(--stance-h, 0px) + 16px))), calc(100% - 208px / var(--text-zoom, 1) - 2px - var(--hint-h, 0px)) ) )");
    const dock = readFileSync(`${import.meta.dirname}/pages/Dock.tsx`, "utf8");
    expect(dock).toContain('wrap.style.setProperty("--lure-h"');
    expect(dock).toContain('style.setProperty("--hint-h"');
  });

  it("takes high contrast's thicker borders out of the header, lure panel and hint padding, so they keep their size", () => {
    const media = "@media (pointer: coarse) and (max-width: 800px) and (min-height: 501px) {";
    const block = css.slice(css.indexOf(media), css.indexOf("\n}\n", css.indexOf(media)));
    expect(/html\[data-contrast="high"\] \.hud \{([^}]*)\}/.exec(block)?.[1]).toContain("padding: 9px 11px;");
    expect(/html\[data-contrast="high"\] \.lure-choice \{([^}]*)\}/.exec(block)?.[1]).toContain("padding: 5px 7px 7px;");
    expect(/html\[data-contrast="high"\] \.hint \{([^}]*)\}/.exec(block)?.[1]).toContain("padding: 8px 11px 8px 13px;");
  });
});
