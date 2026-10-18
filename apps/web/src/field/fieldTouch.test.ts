import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(`${import.meta.dirname}/field.css`, "utf8");

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
  });
});
