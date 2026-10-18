import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(`${import.meta.dirname}/${path}`, "utf8");

describe("touch targets", () => {
  it("stands the header's links, the coach's Skip and the board's tabs at least 32 px on touch screens", () => {
    const block = /@media \(pointer: coarse\) \{\n  \.hud \.hud-link,\n  \.walkthrough-skip,\n  \.board-tabs button \{([^}]*)\}/.exec(read("index.css"))?.[1];
    expect(block).toContain("min-height: 32px;");
    expect(block).toContain("min-width: 32px;");
  });
});

describe("tables that scroll sideways on a phone", () => {
  it.each([
    ["pages/Log.tsx", "log-title"],
    ["pages/Board.tsx", "board-title"],
  ])("%s takes keyboard focus and is named by its title", (path, id) => {
    const source = read(path);
    expect(source).toContain(`<h1 id="${id}">`);
    expect(source).toContain(`<table tabIndex={0} aria-labelledby="${id}">`);
  });
});
