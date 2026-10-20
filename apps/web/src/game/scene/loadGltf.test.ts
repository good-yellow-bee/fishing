import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dir = `${import.meta.dirname}/../../../public/models`;

/** The glTF JSON chunk of a .glb: its extensions say what the loader must decode. */
function gltfJson(file: string) {
  const buf = readFileSync(`${dir}/${file}`);
  const length = buf.readUInt32LE(12);
  return JSON.parse(buf.subarray(20, 20 + length).toString("utf8")) as { extensionsUsed?: string[] };
}

describe("the lake's models", () => {
  it("need no Draco or meshopt decoder, which the lake's glTF loader does not carry", () => {
    const files = readdirSync(dir).filter((file) => file.endsWith(".glb"));
    expect(files.length).toBeGreaterThan(10);
    for (const file of files) {
      const used = gltfJson(file).extensionsUsed ?? [];
      expect(used.filter((name) => /draco|meshopt/i.test(name)), file).toEqual([]);
    }
  });
});
