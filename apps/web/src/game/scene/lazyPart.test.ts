import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = __dirname;
const sources = readdirSync(dir)
  .filter((file) => /\.tsx?$/.test(file) && !file.includes(".test."))
  .map((file) => ({ file, text: readFileSync(join(dir, file), "utf8") }));

/** The modules each part chunk (parts/*.ts) re-exports, by file name. */
const parted = readdirSync(join(dir, "parts")).flatMap((file) =>
  [...readFileSync(join(dir, "parts", file), "utf8").matchAll(/from "\.\.\/(\w+)"/g)].map((match) => ({ chunk: file, module: match[1]! })),
);

describe("scene part chunks", () => {
  it("keep their modules out of the lake's own chunk: nothing else imports one directly", () => {
    const leaks = parted.flatMap(({ chunk, module }) =>
      sources.filter(({ text }) => text.includes(`from "./${module}"`)).map(({ file }) => `${file} imports ${module} (${chunk})`),
    );
    expect(leaks).toEqual([]);
  });

  it("are loaded only through lazyPart, by the names they export", () => {
    const lazy = sources.flatMap(({ text }) => [...text.matchAll(/lazyPart<.*?>\("(\w+)", "(\w+)"\)/g)].map((m) => ({ group: m[1]!, name: m[2]! })));
    expect(lazy.length).toBeGreaterThan(50);
    for (const { group, name } of lazy) expect(readFileSync(join(dir, "parts", `${group}.ts`), "utf8")).toMatch(new RegExp(`export \\{[^}]*\\b${name}\\b`));
  });
});
