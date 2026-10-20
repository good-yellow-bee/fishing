import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Each material's options: from a `side: THREE.DoubleSide` (or JSX `side={THREE.DoubleSide}`) out to its enclosing braces or tag. */
function doubleSidedBlocks(source: string) {
  const blocks: string[] = [];
  for (const match of source.matchAll(/side: THREE\.DoubleSide/g)) {
    let start = match.index;
    for (let depth = 0; start > 0; start -= 1) {
      if (source[start] === "}") depth += 1;
      else if (source[start] === "{" && depth-- === 0) break;
    }
    let end = match.index;
    for (let depth = 0; end < source.length; end += 1) {
      if (source[end] === "{") depth += 1;
      else if (source[end] === "}" && depth-- === 0) break;
    }
    blocks.push(source.slice(start, end));
  }
  for (const match of source.matchAll(/<mesh\w*Material\b[^>]*?side=\{THREE\.DoubleSide\}[^>]*?\/>/gs)) blocks.push(match[0]);
  return blocks;
}

describe("see-through double-sided materials", () => {
  it("draw in one pass, not three's two (back faces, then front), which costs a second draw and a shader check each frame", () => {
    const dir = __dirname;
    const twoPass = readdirSync(dir)
      .filter((file) => /\.tsx?$/.test(file) && !file.includes(".test."))
      .flatMap((file) =>
        doubleSidedBlocks(readFileSync(join(dir, file), "utf8"))
          .filter((block) => /\btransparent\b/.test(block) && !/forceSinglePass/.test(block))
          .map((block) => `${file}: ${block.slice(0, 80)}`),
      );
    expect(twoPass).toEqual([]);
  });
});
