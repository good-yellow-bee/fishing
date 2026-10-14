import { describe, expect, it } from "vitest";
import { addCaption, CAPTION_MAX, CAPTION_MS, captionSound, onSoundCaption, pruneCaptions } from "./soundCaptions";

describe("sound captions", () => {
  it("tells listeners each sound until they unsubscribe", () => {
    const heard: string[] = [];
    const off = onSoundCaption((kind) => heard.push(kind));
    captionSound("loon");
    off();
    captionSound("owl");
    expect(heard).toEqual(["loon"]);
  });

  it("refreshes a repeat instead of stacking it", () => {
    let shown = addCaption([], "loon", 0, 1);
    shown = addCaption(shown, "owl", 500, 2);
    shown = addCaption(shown, "loon", 1000, 3);
    expect(shown.map((c) => c.kind)).toEqual(["owl", "loon"]);
    expect(shown[1]!.at).toBe(1000);
  });

  it("keeps only the newest few and drops stale ones", () => {
    let shown = addCaption([], "loon", 0, 1);
    shown = addCaption(shown, "owl", 10, 2);
    shown = addCaption(shown, "geese", 20, 3);
    shown = addCaption(shown, "tailSlap", 30, 4);
    expect(shown).toHaveLength(CAPTION_MAX);
    expect(shown[0]!.kind).toBe("owl");
    expect(pruneCaptions(shown, 10 + CAPTION_MS)).toHaveLength(2);
    expect(addCaption(shown, "farSplash", 40 + CAPTION_MS, 5).map((c) => c.kind)).toEqual(["farSplash"]);
  });
});
