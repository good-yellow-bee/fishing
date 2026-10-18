import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dock = readFileSync(`${import.meta.dirname}/Dock.tsx`, "utf8");
const css = readFileSync(`${import.meta.dirname}/../index.css`, "utf8");

describe("a cast's result for a screen reader", () => {
  it("moves focus to the landed fish's name unless the player put it somewhere", () => {
    expect(dock).toContain("<h2 ref={landedHeading} tabIndex={-1}>");
    expect(dock).toMatch(/if \(active && active !== document\.body && active\.isConnected\) return;\s+landedHeading\.current\?\.focus\(\{ preventScroll: true \}\);/);
    expect(css).toContain('.landed-card h2[tabindex="-1"]:focus,\n.landed-card .released[tabindex="-1"]:focus,\n.daily-request-claimed[tabindex="-1"]:focus {\n  outline: none;\n}');
  });

  it("says a miss or a snapped line in a status kept mounted", () => {
    expect(dock).toContain('<p className="sr-only" role="status">\n          {game.outcome && game.outcome.kind !== "landed" ? game.outcome.message : ""}\n        </p>');
  });

  it("keeps focus on the card after Release: the released note takes it, and the button never goes disabled", () => {
    expect(dock).toContain('<p className="catch-stamp released" ref={releasedNote} tabIndex={-1}>');
    expect(dock).toMatch(/if \(!landedReleased\) return;\s+const active = document\.activeElement;\s+if \(active && active !== document\.body && active\.isConnected\) return;\s+releasedNote\.current\?\.focus/);
    expect(dock).toContain("onClick={() => void releaseFish()} aria-disabled={releasing || undefined}>");
  });
});
