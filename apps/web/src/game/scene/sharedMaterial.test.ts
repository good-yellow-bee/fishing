import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Components that draw one material both instanced and as a plain or skinned mesh, which makes three re-pick its shader every frame they take turns. */
function sharing(source: string) {
  const instanced = new Set([...source.matchAll(/<instancedMesh\b[^>]*?args=\{\[[^,]+,\s*([\w.]+)\s*,/g)].map((m) => m[1]!));
  const plain = new Set([...source.matchAll(/\bmaterial=\{([\w.]+)\}/g), ...source.matchAll(/useSkinnedFigure\([^,]+,\s*([\w.]+)\)/g)].map((m) => m[1]!));
  return [...instanced].filter((name) => plain.has(name));
}

/** Where the instanced and plain uses never show together (the bilge fill draws either its leaves or one plain mesh). */
const EITHER_OR = new Set(["BoatFill.tsx"]);

describe("scene materials", () => {
  it("are never drawn both instanced and plain by one component: the instanced side gets its own copy (useInstancedTwin)", () => {
    const shared = readdirSync(__dirname)
      .filter((file) => file.endsWith(".tsx") && !EITHER_OR.has(file))
      .flatMap((file) => sharing(readFileSync(join(__dirname, file), "utf8")).map((name) => `${file}: ${name}`));
    expect(shared).toEqual([]);
  });

  it("catches a shared material", () => {
    expect(sharing(`<mesh material={material} />\n<instancedMesh ref={a} args={[shapes.kits[i]!.arm, material, 2]} />`)).toEqual(["material"]);
    expect(sharing(`useSkinnedFigure(root, material);\n<instancedMesh args={[g, instanced, 2]} />`)).toEqual([]);
  });
});
