import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync(`${import.meta.dirname}/../index.html`, "utf8");

describe("the web fonts", () => {
  it("never hold up the first paint: the stylesheet loads as print and switches on when it arrives", () => {
    const sheets = html.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/g) ?? [];
    // One switched on by onload, one inside <noscript> for browsers without scripts.
    expect(sheets).toHaveLength(2);
    expect(sheets[0]).toContain(`media="print" onload="this.media='all'"`);
    expect(html).toMatch(/<noscript><link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*><\/noscript>/);
  });
});
