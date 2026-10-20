import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { enableModelCache } from "./bitmapCache";

describe("enableModelCache", () => {
  afterEach(() => {
    THREE.Cache.clear();
    THREE.Cache.enabled = false;
    vi.unstubAllGlobals();
  });

  it("gives every model loading the same colour map at once the finished bitmap", async () => {
    const bitmap = { width: 512, close() {} };
    vi.stubGlobal("fetch", vi.fn(async () => ({ blob: async () => new Blob() })));
    vi.stubGlobal("createImageBitmap", vi.fn(async () => bitmap));
    enableModelCache();
    const load = () => new Promise((resolve) => new THREE.ImageBitmapLoader().load("/models/Textures/colormap.png", resolve));
    const got = await Promise.all([load(), load(), load()]);
    expect(got).toEqual([bitmap, bitmap, bitmap]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
