import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MODEL = `${import.meta.dirname}/../../../public/models/character-male-c.glb`;
const angler = readFileSync(`${import.meta.dirname}/Angler.tsx`, "utf8");

/** The glTF JSON chunk of a .glb file. */
function gltfJson(path: string) {
  const data = readFileSync(path);
  const length = data.readUInt32LE(12);
  return JSON.parse(data.subarray(20, 20 + length).toString("utf8")) as { animations?: { name: string }[]; images?: { uri?: string }[] };
}

describe("the angler's model", () => {
  const gltf = gltfJson(MODEL);

  it("carries only the clips the angler plays, so the lake downloads no unused animation", () => {
    // The full set of 32 clips is in git history before PA61; copy a clip back with /mnt/project-files/probes/glbanims.py when Angler.tsx plays it.
    const clips = (gltf.animations ?? []).map((clip) => clip.name).sort();
    expect(clips).toEqual(["holding-right", "idle", "walk"]);
    for (const clip of clips) expect(angler).toContain(`"${clip}"`);
    expect(readFileSync(MODEL).length).toBeLessThan(150_000);
  });

  it("still shares the lake's colormap rather than carrying its own copy", () => {
    expect(gltf.images).toEqual([{ uri: "Textures/colormap.png", name: "colormap" }]);
  });
});
