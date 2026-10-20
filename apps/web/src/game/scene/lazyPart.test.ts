import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = __dirname;
/** Every source file under src, by path from the scene folder's view. */
function walk(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? walk(join(root, entry.name)) : /\.tsx?$/.test(entry.name) && !entry.name.includes(".test.") ? [join(root, entry.name)] : []));
}
const sources = walk(join(dir, "../..")).map((file) => ({ file, text: readFileSync(file, "utf8") }));

/** The modules each part chunk (parts/*.ts) re-exports, by file name. */
const parted = readdirSync(join(dir, "parts")).flatMap((file) =>
  [...readFileSync(join(dir, "parts", file), "utf8").matchAll(/from "\.\.\/(\w+)"/g)].map((match) => ({ chunk: file, module: match[1]! })),
);

describe("scene part chunks", () => {
  it("keep their modules out of the lake's own chunk: nothing else imports one directly", () => {
    const leaks = parted.flatMap(({ chunk, module }) =>
      sources
        .filter(({ file }) => !file.includes("/parts/"))
        .filter(({ text }) => new RegExp(`(from |import\\()"(\\./|[./]*/scene/)${module}"`).test(text))
        .map(({ file }) => `${file} imports ${module} (${chunk})`),
    );
    expect(leaks).toEqual([]);
  });

  it("are loaded only through lazyPart, by the names they export", () => {
    const lazy = sources.flatMap(({ text }) => [...text.matchAll(/lazyPart\("(\w+)", "(\w+)"\)/g)].map((m) => ({ group: m[1]!, name: m[2]! })));
    expect(lazy.length).toBeGreaterThan(50);
    for (const { group, name } of lazy) expect(readFileSync(join(dir, "parts", `${group}.ts`), "utf8")).toMatch(new RegExp(`export \\{[^}]*\\b${name}\\b`));
  });
});
