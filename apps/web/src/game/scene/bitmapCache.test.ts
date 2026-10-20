import * as THREE from "three";
import { afterEach, describe, expect, it } from "vitest";
import { shareLoadingBitmaps } from "./bitmapCache";

describe("shareLoadingBitmaps", () => {
  afterEach(() => THREE.Cache.clear());

  it("hands a request made while the image is still loading the finished bitmap", async () => {
    THREE.Cache.enabled = true;
    shareLoadingBitmaps();
    const bitmap = { width: 512 } as unknown as ImageBitmap;
    let finish = () => {};
    // The first load's promise, in the cache while it runs; like three's, it resolves to nothing.
    const loading = new Promise<void>((resolve) => (finish = resolve));
    THREE.Cache.add("image-bitmap:/models/Textures/colormap.png", loading);
    const got = new Promise((resolve) => new THREE.ImageBitmapLoader().load("/models/Textures/colormap.png", resolve));
    THREE.Cache.add("image-bitmap:/models/Textures/colormap.png", bitmap);
    finish();
    expect(await got).toBe(bitmap);
  });
});
